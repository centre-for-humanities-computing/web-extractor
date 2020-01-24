module.exports = {

    cmpName: 'Cookiebot',

    extractor: function() {
        let res = {};

        let element = document.querySelector('#CybotCookiebotDialog');
        if (element) {
            res.html = element.innerHTML;
        }

        return res;
    },

    waitFor: undefined,
    screenshotAfterWaitFor: true

};