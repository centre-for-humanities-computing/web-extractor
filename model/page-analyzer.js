const error = require('./error');
const _ = require('lodash');
const path = require('path');
const puppeteer = require('puppeteer');
const config = require('../config');
const ruleUtil = require('../util/rule-util');

const PROTOCOL_REGEX = /^https?:\/\//;
const CHROME_ARGS = ['--ignore-certificate-errors']; // still doesn't seem to work in headless mode and neither does ignoreHTTPSErrors below

const requestStrategies = [
    { // default request
        fetch: async function(page, url) {
            return await page.goto(getUrl(url, 'http'), {waitUntil: ['load'], ignoreHTTPSErrors: true, args: CHROME_ARGS});
        },
        canSolveError: function(error, url) {
            return false;
        }
    },
    /* //TODO, test if this makes a difference when we already have ignoreHTTPSErrors: true
    { // sometimes response is null when redirected to https, try again with https if no user specified protocol
        fetch: async function(page, url) {
            return await page.goto(getUrl(url,'https'), {waitUntil: ['load'], ignoreHTTPSErrors: true, args: CHROME_ARGS});
        },
        canSolveError: function (error, url) {
            return (error instanceof error.NullError) && !urlHasProtocol(url);
        }
    }*/

];


class PageAnalyzer {

    constructor(url, cmpRules, pageTimeout) {
        this._url = url;
        this._cmpRules = cmpRules;
        this._pageTimeout = pageTimeout;
        this._screenshotCounter = 1;
    }

    /**
     * Parse the page according to cmpRules passed to the constructor. If more than one rule is present
     * the first matching rule will be used for the result.
     *
     * @param {string} browser the browser instance
     * @param {object} screenshot and object with {dirPath, imageName} or undefined (default) if no screenshot is required
     *
     * @returns {Promise<object>}
     */
    async extractCmpData(browser, screenshotOptions = undefined) {
        this._resetActionTimerAndThrowIfErrorCaught();
        let result = {
            cmpName: undefined,
            data: undefined
        };

        let page;
        this._errorCaught = false;

        try {
            this._browserContext = await browser.createIncognitoBrowserContext();
            page = await this._browserContext.newPage();
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

            for (let rule of this._cmpRules) {
                let dataTemplate = (rule.dataTemplate ? rule.dataTemplate() : null);
                if (dataTemplate) {
                    dataTemplate = _.cloneDeep(dataTemplate); //user can make changes to template, so make sure to make a new copy for every run
                }

                // rule-utils makes sure this is an array
                let extractors = rule.extractor;

                let cmpData = null;
                let firstExtractCall = true;

                for (let i = 0; i < extractors.length;) {
                    let extractor = extractors[i];
                    if (extractor.waitFor) {
                        try {
                            let waitForResponse = await extractor.waitFor(page);
                            if (typeof waitForResponse !== 'object') {
                                waitForResponse = {};
                            }
                            this._resetActionTimerAndThrowIfErrorCaught();

                            if (screenshotOptions && waitForResponse.screenshot) {
                                await page.screenshot({path: this._getScreenshotPath(screenshotOptions.dirPath, screenshotOptions.imageName)});
                                this._resetActionTimerAndThrowIfErrorCaught();
                            }

                            if (_.isInteger(waitForResponse.nextExtractorIndex)) {
                                i = waitForResponse.nextExtractorIndex;
                                if (config.debug) {
                                    console.log(`Jumping to extractor at index: ${i}`);
                                }
                                continue;
                            }
                        } catch (e) {
                            if (e instanceof puppeteer.errors.TimeoutError) {
                                if (config.debug) {
                                    console.error(`Timeout Error for rule in: ${rule.cmpName}, for url: ${this._url}`);
                                }
                                break; // go to the next rule, in outer loop
                            } else {
                                throw e;
                            }
                        }
                    }

                    if (extractor.extract || extractor.extractPuppeteer) {
                        let dataCollector = null;
                        if (firstExtractCall) {
                            dataCollector = dataTemplate;
                            firstExtractCall = false;
                        } else {
                            dataCollector = cmpData;
                        }

                        if (extractor.extractPuppeteer) {
                            let extractPromise = extractor.extractPuppeteer(page, dataCollector);
                            if (!(extractPromise instanceof Promise)) {
                                throw new Error(`extractor.extractPuppeteer must be async or return a Promise`);
                            }
                            cmpData = await extractPromise;
                            this._resetActionTimerAndThrowIfErrorCaught();
                        }

                        if (extractor.extract) {
                            cmpData = await page.evaluate(extractor.extract, dataCollector);
                            this._resetActionTimerAndThrowIfErrorCaught();
                        }

                        if (!PageAnalyzer.isRuleMatch(cmpData)) { // break the extractor chain if returned data doesn't match, and go to next rule
                            break;
                        }
                    }
                    i++;
                }

                if (PageAnalyzer.isRuleMatch(cmpData)) {
                    result.cmpName = rule.cmpName;
                    result.data = cmpData;
                    break;
                }
            }

        } finally {
            try {
                if (page) {
                    await page.close();
                }
            } catch (e) {/* no-op */}

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
            throw new Error("PageAnalyzer.timeElapsedSinceLastActivityNs() should only be called after a call to extractCmpData()");
        }
        return process.hrtime.bigint() - this._lastActivity;
    }

    _resetActionTimerAndThrowIfErrorCaught() {
        this._lastActivity = process.hrtime.bigint();
        this._throwIfErrorCaught();
    }

    _getScreenshotPath(dirPath, imageName) {
        let imageFullName = `${imageName}_${this._screenshotCounter}.png`;
        this._screenshotCounter++;
        return path.join(dirPath, imageFullName);
    }

    _throwIfErrorCaught() {
        if (this._errorCaught) {
            throw this._errorCaught;
        }
    }

    async close() {
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