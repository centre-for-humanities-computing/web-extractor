module.exports = {
    cmpName: 'test', //required
    /**
     * Executed in the context of the page.
     * If info for the given CMP was found return an object with all the data which should be saved
     * if the given CMP was not found return and empty object or something which evaluates to false
     *
     * If multiple extractions separated by waitFor is required an aray of objects with and extractor
     * and a waitFor can be returned. Each extractor will get passed the return value from the previous
     * extractor so it is possible keep appending to the same object.
     * *** Example ***
     * [
     *    {
     *        extractor: function() {
     *            // do some extraction
     *            return {count: 1};
     *        },
     *        waitFor: async function(page) {
     *            await page.waitFor(1000);
     *        }
     *    },
     *    {
     *        extractor: function(data) { // data is the return value from the previous extractor
     *            data.count++;
     *            return data;
     *        },
     *        waitFor: async function(page) {
     *            await page.click('#button');
     *            await page.waitFor('.popup');
     *        }
     *    }
     * ]
     *
     *
     * @returns {object}
     */
    extractor: [
        {
           extractor: function() {
               return {data: 1};
           }
        },
        {
            extractor: function(object) {
                object.data++;
                return object;
            },
            waitFor: async function(page) {
                await page.click('#CybotCookiebotDialogBodyButtonAccept');
            }
        }
    ],

    /**
     * Wait for this method to complete before running the extractor()
     * Can be used to wait for a specific event to occur. See the puppeteer documentation, especially
     * https://github.com/puppeteer/puppeteer/blob/v2.0.0/docs/api.md#pagewaitforselectororfunctionortimeout-options-args
     *
     * @param page the puppeteer page
     * @returns {Promise<object>}
     */
    waitFor: async function(page) { // optional
        /* EXAMPLE */
        await page.waitFor('#CybotCookiebotDialogBodyButtonAccept', {
            timeout: 1000 // wait for maximum 1sec
        });
    },
    /**
     * If screenshot is enabled do an additional screenshot after each waitFor has completed
     */
    screenshotAfterWaitFor: true // optional



};