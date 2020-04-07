//null means that our algorithm did not register the presence of something, which generally means it does not exist (but could mean that it does exist, but our algorithm is not built to detect it)
//false means we are sure it does not exist
//if purposeConsent or vendorConsent are empty, it means there are is no purpose or vendor level consent information/options
module.exports = Object.freeze({
    notificationStyle: null, //possible values: banner, barrier, cornerBox, custom  //Should never be null
    consent: {
        type: null, //implied, explict, custom
        impliedConsentAction: {
            visitPage: null,
            scrollPage: null,
            navigatePage: null,
            closePopup: null,
            refreshPage: null,
            clickPage: null
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
                        // the first object in the array is (almost) always the 'necessary' purpose category, i.e., consentOptionDisabled === true
    vendorConsent: [], // {name:string, description:string, (provider, expiryDate, type,)>cookiebot clicksRequiredToAccess:integer, hasConsentOption:boolean, consentOptionDisabled:boolean, consentOptionDefaultStatus:boolean, purposeCategory:[]}
                        //it's called vendor consent, but some CMPs conceptualise it as cookies consent, with vendor info, and others as vendor consent, with cookie info
                        // name: name of cookie -- String -- default Null
                        // vendor: the vendor/provider of the cookie -- String -- default Null
                        // description: text on what the cookie does/is for -- String -- default Null
                        // purposeCategory: the purpose category this cookie/vendor is classified as belonging to. -- String || Array -- default Null
                        // expiryDate: date of when consent for cookie expires in DDMMYYYY -- String -- default Null
                        // type: (cookiebot only) -- default Null
                        // clicksRequiredToAccess -- default Null //should never be null for OT
                        // hasConsentOption -- default Null
                        // consentOptionDisabled -- default Null
                        // consentOptionDefaultStatus -- default Null
                        //TODO make sure this is standardised across CMP rules

    html: null
});