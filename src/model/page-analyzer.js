import * as error from './error.js';
import _ from 'lodash';
import path from 'path';
import puppeteer from 'puppeteer';
import config from '../config.js';
import * as urlUtil from '../util/url-util.js';
import { HttpError } from "./error.js";

const PROTOCOL_REGEX = /^https?:\/\//;

function createRequestStrategies(waitUntil) {
    return [
        { // default request
            name: 'primary', //if no protocol use http, wait for document load event
            fetch: async function (page, url) {
                return await page.goto(getUrl(url, 'http'), { waitUntil });
            },
            canSolveError: function (error, url) {
                return false;
            }
        },
        { // default request
            name: 'www-alias',
            fetch: async function (page, url) {
                return await page.goto(getUrl('www.' + url, 'http'), { waitUntil });
            },
            canSolveError: function (error, url) {
                if (!urlHasProtocol(url) && !urlStartsWithWww(url)) {
                    if (error instanceof HttpError && error.statusCode === 504) {
                        return true;
                    } else if (errorMessageIncludes(error, ['ERR_CONNECTION_RESET', 'ERR_NAME_NOT_RESOLVED', 'ERR_CONNECTION_TIMED_OUT'])) {
                        return true;
                    }
                }

                return false;
            }
        },

        // if the problem arises where http does not work but https does, the rule should be
        // if !urlHasProtocol and error === x,y,z then we try adding https, it should be after the current rules
        // if that doesn't work, we can add yet another rule that tries to add www. alias with https:// as a 4th rule

        /* //TODO, test if this makes a difference when we already have ignoreHTTPSErrors: true in web-extractor launch args
        { // sometimes response is null when redirected to https, try again with https if no user specified protocol
            name: 'protocolHttps',
            fetch: async function(page, url) {
                return await page.goto(getUrl(url,'https'), {waitUntil: ['load'] });
            },
            canSolveError: function (error, url) {
                return (error instanceof error.NullError) && !urlHasProtocol(url);
            }
        }*/
        /*
        { // sometimes load is never reached because of some js popup etc. try to fallback to domcontentloaded
            name: 'domContentLoaded',
            fetch: async function(page, url) {
                return await page.goto(getUrl(url,'http'), {waitUntil: ['domcontentloaded'] });
            },
            canSolveError: function(error, url) {
                return error instanceof puppeteer.errors.TimeoutError;
            }
        }*/

    ];
}


class PageAnalyzer {

    constructor(userUrl, rules, pageTimeout, userAgent, waitUntil = 'load') {
        this._url = urlUtil.unwrapUrl(userUrl);
        this._userUrl = userUrl;
        this._rules = rules;
        this._pageTimeout = pageTimeout;
        this._userAgent = userAgent;
        this._waitUntil = waitUntil;
        this._screenshotCounter = 1;
        this._errorCaught = false;
        this._extractPromiseReject = null;
        this._requestStrategies = createRequestStrategies(this._waitUntil);
    }

    /**
     * Parse the page according to rules passed to the constructor. If more than one rule is present
     * the first matching rule will be used for the result.
     *
     * @param {string} browser the browser instance
     * @param {object} screenshotOptions and object with {dirPath, imageName} or undefined (default) if no screenshot is required
     *
     * @returns {Promise<object>}
     */
    async extractData(browser, screenshotOptions = undefined) {
        return new Promise(async (resolve, reject) => { // we use an explicit promise so we can force reject if it hangs
            let result = {
                name: undefined,
                data: undefined,
                requestStrategy: undefined,
                afterExtractAbortSave: false
            };

            let page;
            this._errorCaught = false;
            this._extractPromiseReject = reject;

            if (screenshotOptions && screenshotOptions.resetCounter) {
                this._screenshotCounter = 1;
            }

            try {
                this._resetActionTimerAndThrowIfErrorCaught();
                this._browserContext = await browser.createIncognitoBrowserContext();
                page = await this._browserContext.newPage();
                this._page = page;
                this._resetActionTimerAndThrowIfErrorCaught();

                page.on('error', (e) => { // on page crash
                    this._errorCaught = e;
                });

                await page.setUserAgent(this._userAgent);

                await page.setDefaultNavigationTimeout(this._pageTimeout);
                await page.setDefaultTimeout(this._pageTimeout);

                let response = null;

                for (let i = 0; i < this._requestStrategies.length;) {
                    let strategy = this._requestStrategies[i];
                    try {
                        response = await strategy.fetch(page, this._url);
                        if (response === null) {
                            throw new error.NullError("Response was null");
                        }

                        let statusCode = response.status();

                        if (statusCode < 200 || statusCode > 226) {
                            throw new error.HttpError(statusCode);
                        }

                        result.requestStrategy = strategy.name;
                        break;
                    } catch (e) {
                        let nextIndex = this._nextRequestStrategyIndexForError(i, e, this._url);
                        if (nextIndex < 0) {
                            throw e;
                        } else {
                            i = nextIndex;
                        }
                    } finally {
                        this._resetActionTimerAndThrowIfErrorCaught();
                    }

                }

                if (screenshotOptions) {
                    await page.screenshot({ path: this._getScreenshotPath(screenshotOptions.dirPath, screenshotOptions.imageName) });
                    this._resetActionTimerAndThrowIfErrorCaught();
                }

                for (let rule of this._rules) {
                    let dataTemplate = (rule.dataTemplate ? rule.dataTemplate() : undefined);
                    if (dataTemplate) {
                        dataTemplate = _.cloneDeep(dataTemplate); //user can make changes to template, so make sure to make a new copy for every run
                    }

                    let extractors = rule.extractor;
                    if (!Array.isArray(extractors)) {
                        extractors = [extractors];
                    }

                    let data = null;
                    let firstExtractCall = true;

                    for (let i = 0; i < extractors.length;) {
                        let extractor = extractors[i];
                        if (extractor.beforeExtract) {
                            try {
                                let beforeExtractResponse = await extractor.beforeExtract(page, this._userUrl, rule.extractorOptions?.());
                                if (typeof beforeExtractResponse !== 'object') {
                                    beforeExtractResponse = {};
                                }
                                this._resetActionTimerAndThrowIfErrorCaught();

                                if (screenshotOptions && beforeExtractResponse.screenshot) {
                                    await page.screenshot({ path: this._getScreenshotPath(screenshotOptions.dirPath, screenshotOptions.imageName) });
                                    this._resetActionTimerAndThrowIfErrorCaught();
                                }

                                if (_.isInteger(beforeExtractResponse.nextExtractorIndex)) {
                                    i = beforeExtractResponse.nextExtractorIndex;
                                    if (config.debug) {
                                        console.log(`Jumping to extractor at index: ${i}`);
                                    }
                                    continue;
                                }
                            } catch (e) {
                                if (e instanceof puppeteer.errors.TimeoutError) {
                                    if (config.debug) {
                                        console.error(`Timeout Error for rule in: ${rule.name}, for url: ${this._url}`);
                                    }
                                    break; // go to the next rule, in outer loop
                                } else {
                                    throw e;
                                }
                            }
                        }

                        if (extractor.extract || extractor.extractPuppeteer) {
                            let dataArg = null;
                            if (firstExtractCall) {
                                dataArg = dataTemplate;
                                firstExtractCall = false;
                            } else {
                                dataArg = data;
                            }

                            if (extractor.extractPuppeteer) {
                                let extractPromise = extractor.extractPuppeteer(page, dataArg, this._userUrl, rule.extractorOptions?.());
                                if (!(extractPromise instanceof Promise)) {
                                    throw new Error(`extractor.extractPuppeteer must be async or return a Promise`);
                                }
                                data = await extractPromise;
                                this._resetActionTimerAndThrowIfErrorCaught();
                            }

                            if (extractor.extract) {
                                data = await page.evaluate(extractor.extract, dataArg, this._userUrl, rule.extractorOptions?.());
                                this._resetActionTimerAndThrowIfErrorCaught();
                            }

                            if (!PageAnalyzer.isRuleMatch(data)) { // break the extractor chain if returned data doesn't match, and go to next rule
                                break;
                            }

                            // only if valid (see above)
                            if (extractor.afterExtract) {
                                data = await extractor.afterExtract(data, this._userUrl, rule.extractorOptions?.());
                                if (data === undefined) {
                                    result.afterExtractAbortSave = true;
                                    break;
                                }
                            }
                        }
                        i++;
                    }

                    if (result.afterExtractAbortSave) {
                        break;
                    }

                    if (PageAnalyzer.isRuleMatch(data)) {
                        result.name = rule.name;
                        result.data = data;
                        break;
                    }
                }
                resolve(result);
            } catch (e) {
                reject(e);
            } finally {
                try {
                    await this.close();
                } catch (e) {/* no-op */
                }
            }
        });
    }

    _nextRequestStrategyIndexForError(currentIndex, error, url) {
        for (let i = currentIndex + 1; i < this._requestStrategies.length; i++) {
            let strategy = this._requestStrategies[i];
            if (strategy.canSolveError(error, url)) {
                return i;
            }
        }
        return -1;
    }

    /**
     * Time elapsed since last activity in nanoseconds
     * @returns {bigint}
     */
    timeElapsedSinceLastActivityNs() {
        if (this._lastActivity === undefined) {
            throw new Error("PageAnalyzer.timeElapsedSinceLastActivityNs() should only be called after a call to extractData()");
        }
        return process.hrtime.bigint() - this._lastActivity;
    }

    _resetActionTimer() {
        this._lastActivity = process.hrtime.bigint();
    }

    _throwIfErrorCaught() {
        if (this._errorCaught) {
            throw this._errorCaught;
        }
    }

    _resetActionTimerAndThrowIfErrorCaught() {
        this._resetActionTimer();
        this._throwIfErrorCaught();
    }

    _getScreenshotPath(dirPath, imageName) {
        let imageFullName = `${imageName}_${this._screenshotCounter}.png`;
        this._screenshotCounter++;
        return path.join(dirPath, imageFullName);
    }

    async close() {
        let error;
        if (this._page && !this._page.isClosed()) {
            let page = this._page;
            this._page = null;
            try {
                await page.close();
            } catch (e) {
                error = e;
                if (config.debug) {
                    console.error(`Could not close page for ${this._url}`, e);
                }
            }
        }

        if (this._browserContext) {
            let context = this._browserContext;
            this._browserContext = null;
            await context.close();
        }
    }

    async forceClose() {
        this._forceClosed = true;
        await this.close();
    }

    get forceClosed() {
        return this._forceClosed;
    }

    /**
     * Will reject the active promise for #extractData if present
     */
    abandon() {
        this._abandoned = true;
        if (this._extractPromiseReject) {
            this._extractPromiseReject(new error.AbandonedError("The analyzer was abandoned, probably due to inactivity"));
        }
    }

    get abandoned() {
        return this._abandoned;
    }

    /**
     * Test if the value lives up to the requirements for being a match
     * @param value
     * @returns {boolean} false if value is one of <code>null, undefined, [], {}</code> true otherwise
     */
    static isRuleMatch(value) {
        return !_.isNil(value) && (!_.isObjectLike(value) || !_.isEmpty(value));
    }

}

function getUrl(url, defaultProtocol) {
    if (!urlHasProtocol(url)) {
        return `${defaultProtocol}://${url}`;
    }
    return url;
}

function urlHasProtocol(url) {
    return url.match(PROTOCOL_REGEX);
}

function urlStartsWithWww(url) {
    return url.toLowerCase().startsWith('www');
}

function errorMessageIncludes(error, messageSnippets) {
    for (let snippet of messageSnippets) {
        if (error.message.includes(snippet)) {
            return true;
        }
    }
    return false;
}

export { PageAnalyzer };