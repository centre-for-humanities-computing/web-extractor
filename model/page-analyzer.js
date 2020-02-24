const error = require('./error');
const _ = require('lodash');
const path = require('path');
const puppeteer = require('puppeteer');
const config = require('../config');
const ruleUtil = require('../util/rule-util');

class PageAnalyzer {

    constructor(url, cmpRules, pageTimeout) {
       if (!url.match(/^https?:\/\//)) {
            url = 'http://' + url;
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
        this._resetActionTimer();
        let result = {
            cmpName: undefined,
            data: undefined
        };

        let page;
        let errorCaught = false;

        try {
            this._browserContext = await browser.createIncognitoBrowserContext();
            page = await this._browserContext.newPage();
            this._resetActionTimer();

            /*
            * We need to handle requestfailed otherwise page.screenshot() will hang if the request failed,
            * no errors are thrown it just hangs.
            * */
            page.on('requestfailed', (e) => { // see the error on the response object below
                if (errorCaught instanceof Error) {
                    errorCaught = e;
                } else {
                    errorCaught = true; // e is the request or response, probably related to a redirect
                }
            });
            page.on('error', (e) => { // on page crash
                errorCaught = e;
            });
            await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:72.0) Gecko/20100101 Firefox/72.0');

            await page.setDefaultNavigationTimeout(this._pageTimeout);
            await page.setDefaultTimeout(Math.max(this._pageTimeout, 10000)); // wait a little longer for page load etc.

            let response = await page.goto(this._url, {waitUntil: ['load', 'networkidle2']});
            this._resetActionTimer();

            if (response === null) {
                throw new Error('Response was null');
            }
            let statusCode = response._status;

            if (statusCode < 200 ||statusCode > 226) {
                throw new error.HttpError(statusCode);
            } else if (errorCaught) {
                if (errorCaught instanceof Error) {
                    throw errorCaught;
                } else {
                    if (response._request && response._request._failureText) {
                        let errorText = response._request._failureText;
                        throw new Error(errorText);
                    }

                    // console.error("Unhandled error", this._url, errorCaught);
                    // console.error("unhandled error response", this._url, response);
                    // we could still have other errors here but these doesn't seem to
                    //be a problem. The page is still loaded, sometimes this can be related to a page redirecting
                    // and the error is then related to the previous page
                }
            }

            if (screenshot) {
                await page.screenshot({path: this._getScreenshotPath(screenshot.dirPath, screenshot.imageName)});
                this._resetActionTimer();
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
                            this._resetActionTimer();
                            if (_.isInteger(nextExtractorIndex)) {
                                i = nextExtractorIndex;
                                if (config.debug) {
                                    console.log(`Jumping to extractor at index: ${nextExtractorIndex}`);
                                }
                                continue;
                            }
                            if (screenshot && rule.screenshotAfterWaitFor) {
                                await page.screenshot({path: this._getScreenshotPath(screenshot.dirPath, screenshot.imageName)});
                                this._resetActionTimer();
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

                    if (extractor.extract) {
                        let  dataCollect = null;
                        if (firstExtractCall) {
                            dataCollect = dataTemplate;
                            firstExtractCall = false;
                        } else {
                            dataCollect = cmpData;
                        }
                        if (extractor.mode === ruleUtil.extractorMode.DOCUMENT) {
                            cmpData = await page.evaluate(extractor.extract, dataCollect);
                        } else {
                            cmpData = await extractor.extract(page, dataCollect);
                        }
                        this._resetActionTimer();
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

    _resetActionTimer() {
        this._lastActivity = process.hrtime.bigint();
    }

    _getScreenshotPath(dirPath, imageName) {
        let imageFullName = `${imageName}_${this._screenshotCounter}.png`;
        this._screenshotCounter++;
        return path.join(dirPath, imageFullName);
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