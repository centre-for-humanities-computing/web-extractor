const template = require('./__cmp-data-template');

module.exports = {

    cmpName: 'Crownpeak',

    extractor: function(template) {
        let res = {};

        let selectors = ['#_evidon_banner', '#_evidon-banner'];
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