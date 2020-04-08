const error = require('./error');
const _ = require('lodash');
const path = require('path');
const puppeteer = require('puppeteer');
const config = require('../config');
const urlUtil = require('../util/url-util');

const PROTOCOL_REGEX = /^https?:\/\//;
const CHROME_ARGS = ['--ignore-certificate-errors']; // still doesn't seem to work in headless mode and neither does ignoreHTTPSErrors below

const requestStrategies = [
    { // default request
        name: 'primary', //if no protocol use http, wait for document load event
        fetch: async function(page, url) {
            return await page.goto(getUrl(url, 'http'), {waitUntil: ['load'], ignoreHTTPSErrors: true, args: CHROME_ARGS});
        },
        canSolveError: function(error, url) {
            return false;
        }
    },
    /* //TODO, test if this makes a difference when we already have ignoreHTTPSErrors: true
    { // sometimes response is null when redirected to https, try again with https if no user specified protocol
        name: 'protocolHttps',
        fetch: async function(page, url) {
            return await page.goto(getUrl(url,'https'), {waitUntil: ['load'], ignoreHTTPSErrors: true, args: CHROME_ARGS});
        },
        canSolveError: function (error, url) {
            return (error instanceof error.NullError) && !urlHasProtocol(url);
        }
    }*/
    /*
    { // sometimes load is never reached because of some js popup etc. try to fallback to domcontentloaded
        name: 'domContentLoaded',
        fetch: async function(page, url) {
            return await page.goto(getUrl(url,'http'), {waitUntil: ['domcontentloaded'], ignoreHTTPSErrors: true, args: CHROME_ARGS});
        },
        canSolveError: function(error, url) {
            return error instanceof puppeteer.errors.TimeoutError;
        }
    }*/

];


class PageAnalyzer {

    constructor(userUrl, rules, pageTimeout) {
        this._url = urlUtil.unwrapUrl(userUrl);
        this._userUrl = userUrl;
        this._rules = rules;
        this._pageTimeout = pageTimeout;
        this._screenshotCounter = 1;
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
        this._resetActionTimerAndThrowIfErrorCaught();
        let result = {
            name: undefined,
            data: undefined,
            requestStrategy: undefined,
            afterExtractAbortSave: false
        };

        let page;
        this._errorCaught = false;

        try {
            this._browserContext = await browser.createIncognitoBrowserContext();
            page = await this._browserContext.newPage();
            this._page = page;
            this._resetActionTimerAndThrowIfErrorCaught();

            page.on('error', (e) => { // on page crash
                this._errorCaught = e;
            });

            await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:72.0) Gecko/20100101 Firefox/72.0');

            await page.setDefaultNavigationTimeout(this._pageTimeout);
            await page.setDefaultTimeout(this._pageTimeout);

            let response = null;

            for (let i = 0; i < requestStrategies.length; i++) {
                let strategy = requestStrategies[i];
                try {
                    response = await strategy.fetch(page, this._url);
                    if (response === null) {
                        throw new error.NullError("Response was null");
                    }
                    result.requestStrategy = strategy.name;
                } catch (e) {
                    let nextIndex = nextRequestStrategyIndexForError(i, e, this._url);
                    if (nextIndex < 0) {
                        throw e;
                    } else {
                        i = nextIndex;
                    }
                } finally {
                    this._resetActionTimerAndThrowIfErrorCaught();
                }

            }

            let statusCode = response.status();

            if (statusCode < 200 ||statusCode > 226) {
                throw new error.HttpError(statusCode);
            }

            if (screenshotOptions) {
                await page.screenshot({path: this._getScreenshotPath(screenshotOptions.dirPath, screenshotOptions.imageName)});
                this._resetActionTimerAndThrowIfErrorCaught();
            }

            for (let rule of this._rules) {
                let dataTemplate = (rule.dataTemplate ? rule.dataTemplate() : null);
                if (dataTemplate) {
                    dataTemplate = _.cloneDeep(dataTemplate); //user can make changes to template, so make sure to make a new copy for every run
                }

                // rule-utils makes sure this is an array
                let extractors = rule.extractor;

                let data = null;
                let firstExtractCall = true;

                for (let i = 0; i < extractors.length;) {
                    let extractor = extractors[i];
                    if (extractor.beforeExtract) {
                        try {
                            let beforeExtractResponse = await extractor.beforeExtract(page, this._userUrl);
                            if (typeof beforeExtractResponse !== 'object') {
                                beforeExtractResponse = {};
                            }
                            this._resetActionTimerAndThrowIfErrorCaught();

                            if (screenshotOptions && beforeExtractResponse.screenshot) {
                                await page.screenshot({path: this._getScreenshotPath(screenshotOptions.dirPath, screenshotOptions.imageName)});
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
                            let extractPromise = extractor.extractPuppeteer(page, dataArg, this._userUrl);
                            if (!(extractPromise instanceof Promise)) {
                                throw new Error(`extractor.extractPuppeteer must be async or return a Promise`);
                            }
                            data = await extractPromise;
                            this._resetActionTimerAndThrowIfErrorCaught();
                        }

                        if (extractor.extract) {
                            data = await page.evaluate(extractor.extract, dataArg, this._userUrl);
                            this._resetActionTimerAndThrowIfErrorCaught();
                        }

                        if (!PageAnalyzer.isRuleMatch(data)) { // break the extractor chain if returned data doesn't match, and go to next rule
                            break;
                        }

                        // only if valid (see above)
                        if (extractor.afterExtract) {
                            data = await extractor.afterExtract(data, this._userUrl);
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

        } finally {
            try {
                await this.close();
            } catch (e) {/* no-op */}
        }

        return result;
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
        if (this._page) {
            let page = this._page;
            this._page = null;
            await page.close();
        }

        if (this._browserContext) {
            let context = this._browserContext;
            this._browserContext = null;
            await context.close();
        }
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

function nextRequestStrategyIndexForError(currentIndex, error, url) {
    for (let i = currentIndex + 1; i < requestStrategies.length; i++) {
        let strategy = requestStrategies[i];
        if (strategy.canSolveError(error, url)) {
            return i;
        }
    }
    return -1;
}

module.exports = PageAnalyzer;