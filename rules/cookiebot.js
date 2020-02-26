const template = require('./__cmp-data-template');

module.exports = {

    cmpName: 'Cookiebot',

    extractor: function(template) {
        let res = {};

        let element = document.querySelector('#CybotCookiebotDialog');
        if (element) {
            res.html = element.innerHTML;
        }

        return res;
    },

    waitFor: undefined,

    dataTemplate: function() {
        return template;
    }
}

;