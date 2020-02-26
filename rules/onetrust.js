const template = require('./__cmp-data-template');

module.exports = {

    cmpName: 'OneTrust',

    extractor: function(template) {
        let res = {};

        let element = document.querySelector('.optanon-alert-box-wrapper');
        if (element) {
            res.html = element.innerHTML;
        }

        return res;
    },

    waitFor: undefined,

    dataTemplate: function() {
        return template;
    }

};