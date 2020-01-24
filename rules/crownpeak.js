module.exports = {

    cmpName: 'Crownpeak',

    extractor: function() {
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

    waitFor: undefined

};