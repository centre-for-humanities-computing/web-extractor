module.exports = {

    cmpName: 'OneTrust',

    extractor: function() {
        let res = {};

        let element = document.querySelector('.optanon-alert-box-wrapper');
        if (element) {
            res.html = element.innerHTML;
        }

        return res;
    },

    waitFor: undefined

};