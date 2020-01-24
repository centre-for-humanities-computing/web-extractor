const error = require('./error');
const _ = require('lodash');
const path = require('path');
const puppeteer = require('puppeteer');
const config = require('../config');

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
        let result = {
            cmpName: undefined,
            data: undefined
        };

        let page;
        let context;
        try {
            context = await browser.createIncognitoBrowserContext();
            page = await context.newPage();

            await page.setDefaultNavigationTimeout(this._pageTimeout);

            let response = await page.goto(this._url);
            let statusCode = response._status;

            if (statusCode < 200 ||statusCode > 226) {
                throw new error.HttpError(statusCode);
            }

            if (screenshot) {
                await page.screenshot({path: this._getScreenshotPath(screenshot.dirPath, screenshot.imageName)});
            }

            for (let rule of this._cmpRules) {
                let extractors = rule.extractor;

                if (!_.isArray(extractors)) {
                    extractors = [
                        {extractor: rule.extractor}
                    ];
                }

                // add the root waitFor to the list of extractors
                if (rule.waitFor) {
                    extractors.unshift({
                        waitFor: rule.waitFor
                    });
                }

                for (let extractor of extractors) {
                    if (extractor.waitFor) {
                        try {
                            await extractor.waitFor(page);
                            if (screenshot && rule.screenshotAfterWaitFor) {
                                await page.screenshot({path: this._getScreenshotPath(screenshot.dirPath, screenshot.imageName)});
                            }
                        } catch (e) {
                            if (e instanceof puppeteer.errors.TimeoutError) {
                                if (config.debug) {
                                    console.error(`Timeout Error for rule in: ${rule.cmpName}, for url: ${this._url}`);
                                }
                                break; // go to the next rule, in outer loop
                            }
                            throw e;
                        }
                    }

                    let cmpData = null;
                    if (extractor.extractor) {
                        cmpData = await page.evaluate(extractor.extractor, result.data);
                    }

                    if (cmpData && !_.isEmpty(cmpData)) {
                        result.data = cmpData;
                    }
                }

                if (result.data) {
                    result.cmpName = rule.cmpName;
                    break;
                }
            }

        } finally {
            try {
                if (page) {
                    await page.close();
                }
            } catch (e) {}

            if (context) {
                await context.close();
            }
        }

        return result;
    }

    _getScreenshotPath(dirParh, imageName) {
        let imageFullName = `${imageName}_${this._screenshotCounter}.png`;
        this._screenshotCounter++;
        return path.join(dirParh, imageFullName);
    }

}

module.exports = PageAnalyzer;