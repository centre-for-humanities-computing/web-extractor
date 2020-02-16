//null means that our algorithm did not register the presence of something, which generally means it does not exist (but could mean that it does exist, but our algorithm is not built to detect it)
//false means we are sure it does not exist
//if purposeConsent or vendorConsent are empty, it means there are is no purpose or vendor level consent information/options
module.exports = Object.freeze({
    notificationStyle: null, //possible values: banner, barrier, custom
    consent: {
        type: null, //implied, explict
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
        buttonText: null,
        clicksRequiredToAccess: null
    },
    rejectAllConsent: {
        present: null, //only counts if the reject all button turns off all options that can be turned off manually
        buttonText: null,
        clicksRequiredToAccess: null
    },
    bulkDescription: null,
    bulkDescriptionHTML: null, //because sometimes innerText does not get all data when it includes span elements
    purposeConsent: [], //{name, description, clicksRequiredToAccess, hasConsentOption, consentOptionDisabled, consentOptionDefaultStatus}
    vendorConsent: [], // {name:string, description:string, (provider, expiryDate, type,)>cookiebot clicksRequiredToAccess:integer, hasConsentOption:boolean, consentOptionDisabled:boolean, consentOptionDefaultStatus:boolean, purposeCategory:[]}
    html: null
});