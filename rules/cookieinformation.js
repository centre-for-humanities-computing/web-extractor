const template = require('./__cmp-data-template');

module.exports = {

    cmpName: 'cookieinformation',

    extractor: function(template) {
        let res = {};

        let selectors = ['#coiConsentBanner', '#coi-cookie', '#coi-banner-wrapper'];
        for (let selector of selectors) {
            let element = document.querySelector(selector);
            if (element) {
                res.html = element.innerHTML;
                break;
            }
        }

        return res;
    },

    waitFor: undefined,

    dataTemplate: function() {
        return template;
    }

};