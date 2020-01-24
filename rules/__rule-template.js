module.exports = {
    cmpName: 'test', //required


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
        await page.waitFor('p.cmp-name', {
            timeout: 1000 // wait for maximum 1sec
        });
    },
    /**
     * If screenshot is enabled do an additional screenshot after each waitFor has completed
     */
    screenshotAfterWaitFor: false, // optional

    /**
     * Executed in the context of the page.
     * If info for the given CMP was found return an object with all the data which should be saved
     * if the given CMP was not found return and empty object or something which evaluates to false
     *
     * If multiple extractions separated by waitFor is required an aray of objects with and extractor
     * and a waitFor can be returned. Each extractor will get passed the return value from the previous
     * extractor so it is possible keep appending to the same object.
     *
     * If a
     * *** Example ***
     * [
     *    {
     *        waitFor: async function(page) {
     *            await page.waitFor(1000);
     *        },
     *        extractor: function() {
     *            // do some extraction
     *            return {count: 1};
     *        }
     *    },
     *    {
     *        waitFor: async function(page) {
     *            await page.click('#button');
     *            await page.waitFor('.popup');
     *        },
     *        extractor: function(data) { // data is the return value from the previous extractor
     *            data.count++;
     *            return data;
     *        }
     *    }
     * ]
     *
     *
     * @returns {object}
     */
    extractor: function() { // optional
        /* EXAMPLE */
        let cmpDesc = document.querySelector('#cmp-desc').textContent;
        let res = {};
        if (cmpDesc.match(/Cmp TEST/)) {
            res.descriptions = [];
            for (let cookieDesc of document.querySelectorAll('.jppol-cmp-purpose-description')) {
                res.descriptions.push(cookieDesc.textContent);
            }
        }
        return res;
    }



};