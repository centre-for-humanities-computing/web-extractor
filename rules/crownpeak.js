const template = require('./__cmp-data-template');

module.exports = {

    cmpName: 'Crownpeak',

    dataTemplate: function() {
        return template;
    },

    extractor: {
        waitFor: async function (page) {
            await page.waitForFunction(() => {
                    return document.querySelectorAll('#_evidon_banner, #_evidon-banner').length
                }, {timeout:10000}
            );
        },
        extract: function(template) {

            template.notificationStyle = 'test'

            return template;
        }
    },

    screenshotAfterWaitFor: true,

};