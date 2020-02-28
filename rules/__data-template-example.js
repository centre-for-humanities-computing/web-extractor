module.exports = Object.freeze({
    notificationStyle: null,
    consentAction: {
        visitPage: false,
        scrollPage: false,
        navigatePage: false,
        closePopup: false,
        refreshPage: false,
        clickConsentButton: false
    },
    acceptAll: {
        present: false,
        label: null,
        clicks: null
    },
    rejectAll: {
        present: false,
        label: null,
        clicks: null
    },
    bulkDescription: null,
    purpose: {
        present: false,
        clicks: null,
        labels: [] // {name {string}, description {string}, defaultStatus {boolean}, enabled: {boolean}}
    },
    vendor: {
        present: false,
        clicks: null,
        labels: [] // {name {string}, description {string}, defaultStatus {boolean}, enabled: {boolean}}
    }
});