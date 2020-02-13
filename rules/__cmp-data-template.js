//null means that our algorithm did not register the presence of something, which generally means it does not exist (but could mean that it does exist, but our algorithm is not built to detect it)
//false means we are sure it does not exist
module.exports = Object.freeze({
    notificationStyle: null, //possible values: banner, barrier, custom
    consent: {
        type: null, //null, implied, explict
        impliedConsentAction: {
            visitPage: null,
            scrollPage: null,
            navigatePage: null,
            closePopup: null,
            refreshPage: null
        }
    },
    acceptAllConsent: {
        present: null,
        label: null,
        clicks: null
    },
    rejectAllConsent: {
        present: null,
        label: null,
        clicks: null
    },
    bulkDescription: null,
    bulkDescriptionHTML: null, //because sometimes innerText does not get all data when it includes span elements
    purposeConsent: [], //{name, description, clicksRequiredToAccess, hasConsentOption, consentOptionDisabled, consentOptionDefaultStatus}
    vendorConsent: [], // {name, description, clicksRequiredToAccess, hasConsentOption, consentOptionDisabled, consentOptionDefaultStatus, purposeCategory}
    html: null
});