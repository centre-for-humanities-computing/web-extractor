const template = require('./__cmp-data-template');

module.exports = {

    cmpName: 'Trustarc',

    extractor: function(template) {
        let res = {};

        let selectors = ['#truste-consent-track', '.truste_box_overlay', '#teconsent'];
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