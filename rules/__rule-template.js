//let template = require('__data-template-example');

const template = {
    html: null,
    descriptionPresent: false,
    preselectedValues: true
};

module.exports = {
    name: 'test', //required

    /**
     * Called once before any extraction has taken place.
     * Can be used for loading settings for the rule and other initial setup
     * @param initOptions settings passed to the extractor e.g. {destDir}
     * @returns {Promise<void>}
     */
    init: async function(initOptions) { // optional
        // do setup
    },

    /**
     * Return an object which will be passed in to the first extractor function. The template will be cloned
     * for every time it is passed to the first extractor function for each url, to prevent the original template being modified.
     * The returned object must be JSON serializable.
     * @returns {object}
     */
    dataTemplate: function() { // optional
        /* EXAMPLE */
        return template;
    },

    /**
     * Extract data from the given web-page and control when to extract.
     *
     * If multiple extractions separated by beforeExtract is required an array of objects with and extractor
     * and a beforeExtract can be returned. Each extractor will get passed the return value from the previous
     * extractor so it is possible keep appending to the same object. See also {@link #dataTemplate}
     *
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
     * @see #dataTemplate
     * @returns {object}
     */

    extractor: {
        /**
         * Wait for this method to complete before running the extract() method
         * Can be used to wait for a specific event to occur. See the puppeteer documentation, especially
         * https://github.com/puppeteer/puppeteer/blob/v2.0.0/docs/api.md#pagewaitforselectororfunctionortimeout-options-args
         *
         * What should happen after the waitFor succeeds can be be controlled by returning and object in the following format
         * {
         *     screenshot: {boolean} // optional
         *     nextExtractorIndex: {integer} // optional
         * }
         * nextExtractorIndex makes it possible to do selection and iteration by returning the index of the next extractor to execute.
         * So you could e.g. say that if x is present go to extractor ant index 1 otherwise go to extractor at index 2
         *
         * @param page the puppeteer page
         * @returns {Promise<object>}
         */
        beforeExtract: async function(page) { // optional
            /* EXAMPLE */
            await page.waitFor('p.cmp-name', {
                timeout: 1000 // wait for maximum 1sec
            });
        },

        /**
         * Executed in the context of the page.
         * If info for the given CMP was found return an object with all the data which should be saved
         * if the given CMP was not found return an empty object, null, undefined or []
         */
        extract: function() { // optional
            /* EXAMPLE */
            let cmpDesc = document.querySelector('#cmp-desc').textContent;
            let res = {};
            if (cmpDesc.match(/Cmp TEST/)) {
                res = template;
                res.descriptions = [];
                res.html = document.innerHTML;
                res.preselectedValues = false;
                for (let cookieDesc of document.querySelectorAll('.jppol-cmp-purpose-description')) {
                    res.descriptions.push(cookieDesc.textContent);
                }
            }
            return res;
        },

        /**
         * Extract with the puppeteer page object. MUST be async or return a Promise
         * If info for the given CMP was found return an object with all the data which should be saved
         * if the given CMP was not found return an empty object, null, undefined or []
         */
        extractPuppeteer: async function(page) {
            /* EXAMPLE */
            await page.waitFor('p.cmp-name', {
                timeout: 1000 // wait for maximum 1sec
            });
            let results = await page.$$('p', (elements) => elements.map((element) => element.textContent));
            return results;
        }

    }

};