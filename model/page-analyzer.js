const error = require('./error');
const _ = require('lodash');
const path = require('path');
const puppeteer = require('puppeteer');
const config = require('../config');
const ruleUtil = require('../util/rule-util');

const PROTOCOL_REGEX = /^https?:\/\//;

class PageAnalyzer {

    constructor(url, cmpRules, pageTimeout) {
       if (!url.match(PROTOCOL_REGEX)) {
            url = (url.match(/^www\./) ? url : `www.${url}`);
        }
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
    async extractCmpData(browser, screenshot = undefined) {
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

            let response = await page.goto(this._getUrl('http'), {waitUntil: ['load'], ignoreHTTPSErrors: true});
            this._resetActionTimerAndThrowIfErrorCaught();
            if (response === null && !this._errorCaught && this._urlHasProtocol()) { // sometimes response is null when redirected på https, try again with https if no user specified protocol
                response = await page.goto(this._getUrl('https'), {waitUntil: ['load'], ignoreHTTPSErrors: true});
            }
            this._resetActionTimerAndThrowIfErrorCaught();

            if (response === null) {
                throw new Error('Response was null');
            }

            let statusCode = response._status;

            if (statusCode < 200 ||statusCode > 226) {
                throw new error.HttpError(statusCode);
            }

            if (screenshot) {
                await page.screenshot({path: this._getScreenshotPath(screenshot.dirPath, screenshot.imageName)});
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
                            let nextExtractorIndex = await extractor.waitFor(page);
                            this._resetActionTimerAndThrowIfErrorCaught();
                            if (_.isInteger(nextExtractorIndex)) {
                                i = nextExtractorIndex;
                                if (config.debug) {
                                    console.log(`Jumping to extractor at index: ${nextExtractorIndex}`);
                                }
                                continue;
                            }
                            if (screenshot && rule.screenshotAfterWaitFor) {
                                await page.screenshot({path: this._getScreenshotPath(screenshot.dirPath, screenshot.imageName)});
                                this._resetActionTimerAndThrowIfErrorCaught();
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

                        if (!PageAnalyzer.isRuleMatch(cmpData)) {
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

    _getUrl(defaultProtocol) {
        if (!this._urlHasProtocol()) {
            return `${defaultProtocol}://${this._url}`;
        }
        return this._url;
    }

    _urlHasProtocol() {
        return this._url.match(PROTOCOL_REGEX);
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

module.exports = PageAnalyzer;