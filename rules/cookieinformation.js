module.exports = {

    cmpName: 'cookieinformation',

    extractor: function() {
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

    waitFor: undefined

};