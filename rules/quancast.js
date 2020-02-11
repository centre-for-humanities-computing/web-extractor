const template = require('./__cmp-data-template');

module.exports = {

    cmpName: 'Quancast',

    extractor: function(template) {
        let res = {};

        let element = document.querySelector('#qcCmpUi');
        if (element) {
            res.html = element.innerHTML;
        }

        return res;
    },

    waitFor: undefined,
    screenshotAfterWaitFor: true,

    dataTemplate: function() {
        return template;
    }

};