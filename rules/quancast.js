module.exports = {

    cmpName: 'Quancast',

    extractor: function() {
        let res = {};

        let element = document.querySelector('#qcCmpUi');
        if (element) {
            res.html = element.innerHTML;
        }

        return res;
    },

    waitFor: undefined,
    screenshotAfterWaitFor: true

};