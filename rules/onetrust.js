const template = require('./__cmp-data-template');

module.exports = {

    cmpName: 'OneTrust',

    dataTemplate: function() {
        return template;
    },

    //TODO Bugs
    // https://drivepedia.com/ wrongfully identified as OneTrust instead of QuantCast? how?
    // forces.net identified as OneTrust but everything else null?
    extractor: [
        {
            extract: function (template) {
                let element = document.querySelector('.optanon-alert-box-wrapper');
                if (element) { //TODO sometimes element === true but the rest hasn't loaded yet (forces.net). Shouldn't it be set up to wait for all JS to finish executing?
                    //all HTML
                    template.html = element.outerHTML;

                    //notification style
                    if (window.getComputedStyle(document.querySelector('.optanon-alert-box-wrapper')).width === document.documentElement.clientWidth + "px") {
                        template.notificationStyle = 'banner';
                    } else if (document.querySelector('.optanon-alert-box-wrapper alert-box-center-tile')) {
                        template.notificationStyle = 'barrier';
                    } else {
                        template.notificationStyle = 'custom';
                    }

                    //consent
                    const onetrustGlobalObject = Optanon.GetDomainData();
                    const consentType = onetrustGlobalObject.ConsentModel.Name.toLowerCase();

                    if (consentType === 'notice only') { //"information only" in the onetrust user manual
                        template.consent.type = 'implied';
                        template.consent.impliedConsentAction.visitPage = true;
                    } else if (consentType === 'opt-out') { //"soft opt-in" in the onetrust user manual
                        template.consent.type = 'implied';
                        template.consent.impliedConsentAction.navigatePage = true;
                        template.consent.impliedConsentAction.refreshPage = true;
                    } else if (consentType === 'implied consent') { //"implied consent" in the onetrust user manual
                        template.consent.type = 'implied';
                        template.consent.impliedConsentAction.visitPage = true;
                    } else if (consentType === 'opt-in') { //"explicit consent" in the onetrust user manual
                        template.consent.type = 'explicit';
                    } else if (consentType === 'owner defined') { //"owner defined" in the onetrust user manual
                        template.consent.type = 'custom'
                    }

                    // //TODO check how accurate these are > I don't think they are
                    // template.consent.impliedConsentAction.closePopup = notUndefined(onetrustGlobalObject.CloseShouldAcceptAllCookies); //incorrect for accesso.com, aao.org, allegisgroup.com, collegeboard.org //correct for 16-25railcard.co.uk,
                    template.consent.impliedConsentAction.clickPage = notUndefined(onetrustGlobalObject.OnClickAcceptAllCookies); // correct on driving.co.uk
                    template.consent.impliedConsentAction.scrollPage = notUndefined(onetrustGlobalObject.ScrollAcceptsAllCookiesAndClosesBanner);

                    function notUndefined(property) {
                        if (property) {
                            template.consent.type = 'implied';
                            return true
                        } else {
                            return null
                        }
                    }

                    //accept
                    // TODO verify that this works
                    const allAcceptButtons = document.querySelectorAll('.optanon-allow-all');
                    for (const acceptButton of allAcceptButtons) {
                        if (acceptButton.style.display !== 'none' && acceptButton.offsetHeight !== 0) {
                            template.acceptAllConsent.present = true;
                            template.acceptAllConsent.clicksRequiredToAccess = 0;
                            template.acceptAllConsent.buttonText = acceptButton.innerText;
                        }
                    }

                    //reject
                    //Onetrust does not have a reject all option, afawk

                    //bulkDescription + bulk description HTML
                    if (document.querySelector("#alert-box-message")) {
                        template.bulkDescription = document.querySelector("#alert-box-message").innerText;
                        template.bulkDescriptionHTML = document.querySelector("#alert-box-message").innerHTML;
                    } else if (document.querySelector(".optanon-alert-box-body")) {
                        template.bulkDescription = document.querySelector(".optanon-alert-box-body").innerText;
                        template.bulkDescriptionHTML = document.querySelector(".optanon-alert-box-body").innerText;
                    }

                    //purposes
                    let moreDetailsPresent = false; //this is a flag necessary to determine whether more vendor/purpose info is present
                    if ((document.querySelector(".optanon-toggle-display")
                            && document.querySelector(".optanon-toggle-display").offsetHeight !== 0)
                        || (document.querySelector('*[onclick="Optanon.TriggerGoogleAnalyticsEvent(\'OneTrust Cookie Consent\', \'Banner Open Preferences\');"]')
                            && document.querySelector('*[onclick="Optanon.TriggerGoogleAnalyticsEvent(\'OneTrust Cookie Consent\', \'Banner Open Preferences\');"]'.offsetHeight !== 0))) {
                        moreDetailsPresent = true;
                        getPurposeDetails()
                    } else if (document.querySelector('.hide-cookie-setting-button')) {
                        template.purposeConsent = false
                    }


                    function getPurposeDetails() {
                        //onetrust has different kinds of labels for their purposes, which are stored in properties of the global object. We have to check these labels so we can compare those and know the purpose default and enabled status
                        const activeText = onetrustGlobalObject.ActiveText;
                        const inactiveText = onetrustGlobalObject.InactiveText;
                        const alwaysActiveText = onetrustGlobalObject.AlwaysActiveText;
                        const inactiveLandingPageText = 'Inactive LandingPage';

                        const allPurposes = onetrustGlobalObject.Groups;
                        for (purpose of allPurposes) {
                            let name = null;
                            let description = null;
                            let clicksRequiredToAccess = 2; //TODO actually check which tab is selected and how many it takes to get to the first purpose consent option
                            let consentOptionDisabled = null;
                            let consentOptionDefaultStatus = null;
                            const hasConsentOption = true; //if this function is called, we know that the consent option is present

                            if (purpose.Parent === null) { //TODO redo this to scrape the actual pop-up rather than get the info from the onetrustGlobalObject, because now it gives me more than is actually visible! See https://20cogs.co.uk/#
                                name = purpose.GroupLanguagePropertiesSets[0].GroupName.Text;
                                description = purpose.GroupLanguagePropertiesSets[0].GroupDescription.Text;

                                let defaultStatusLabel = purpose.GroupLanguagePropertiesSets[0].DefaultStatus.Text;
                                if (defaultStatusLabel == activeText) {
                                    consentOptionDefaultStatus = true;
                                    consentOptionDisabled = false;
                                    template.consent.type = 'implied'; //if any of the
                                } else if (defaultStatusLabel == alwaysActiveText) {
                                    consentOptionDefaultStatus = true;
                                    consentOptionDisabled = true;
                                } else if (defaultStatusLabel == inactiveText) {
                                    consentOptionDefaultStatus = false;
                                    consentOptionDisabled = false;
                                } else if (defaultStatusLabel == inactiveLandingPageText) {
                                    consentOptionDefaultStatus = true;
                                    consentOptionDisabled = false;
                                }

                                template.purposeConsent.push({
                                    'name': name,
                                    'description': description,
                                    'clicksRequiredToAccess': clicksRequiredToAccess,
                                    'hasConsentOption': hasConsentOption,
                                    'consentOptionDisabled': consentOptionDisabled,
                                    'consentOptionDefaultStatus': consentOptionDefaultStatus
                                })

                            }
                        }
                    }


                    if (moreDetailsPresent) {
                        //if the banner has a link directly to vendor info, get all the data first (e.g., https://20cogs.co.uk/)
                        const vendorLinkFirstPage = document.querySelector('#ot-show-vendorlist-link');
                        const vendorLinkSecondPage = document.querySelector(".vendor-consent-link");
                        if (vendorLinkFirstPage || vendorLinkSecondPage) {
                            // document.querySelector(".vendor-consent-link").click();

                            const allVendors = document.querySelectorAll('.vendor-item');

                            for (const vendor of allVendors) {
                                let name = null;
                                let vendorName = vendor.querySelector(".vendor-name").innerText;
                                const description = vendor.querySelector(".vendor-privacy-policy").innerText;
                                const hasConsentOption = true;
                                let clicksRequiredToAccess = null;
                                const consentOptionDisabled = vendor.querySelector("input").disabled;
                                const consentOptionDefaultStatus = vendor.querySelector("input").checked;
                                let purposeCategory = null;  //this list of vendor info does not have purpose category details, nor are they listed in the actual purpose page
                                let expiryDate = null;

                                if (vendorLinkFirstPage && vendorLinkFirstPage.offsetHeight !== 0) {
                                    clicksRequiredToAccess = 1
                                } else if (vendorLinkSecondPage && vendorLinkSecondPage.offsetHeight !== 0) {
                                    clicksRequiredToAccess = 2
                                }

                                template.vendorConsent.push({
                                    'name': name,
                                    'vendor': vendorName,
                                    'description': description,
                                    'clicksRequiredToAccess': clicksRequiredToAccess,
                                    'hasConsentOption': hasConsentOption,
                                    'consentOptionDisabled': consentOptionDisabled,
                                    'consentOptionDefaultStatus': consentOptionDefaultStatus,
                                    'purposeCategory': purposeCategory,
                                    'expiryDate': expiryDate
                                })
                            }
                            //TODO check whether all of these pages have that back button, or whether we have to get vendor info on purpose page by accessing it in a different way (e.g., clicking 'more info' button on banner)

                            //go back to purpose screen
                            document.querySelector('.vendor-consent-back-link').click()
                        }

                        const allCategories = document.querySelector("#optanon-menu").querySelectorAll("li:not(.menu-item-about):not(.menu-item-moreinfo)");

                        for (const category of allCategories) {
                            category.click(); //click on each of the categories in the 'more info' popup
                            if (document.querySelector('.optanon-cookie-list')) { //check if there is a vendor list present
                                getVendorInfo(category)
                            }
                        }

                    }

                    //TODO make this algorithm less of a monster
                    function getVendorInfo(category) {
                        let name = null;
                        let vendor = null;
                        let description = null;
                        let clicksRequiredToAccess = 2;
                        let consentOptionDisabled = null;
                        let hasConsentOption = null;
                        let consentOptionDefaultStatus = null;
                        let purposeCategory = null;
                        let expiryDate = null;

                        const allCookies = document.querySelectorAll(".optanon-group-cookies-list, .optanon-subgroup-cookies-list"); //get the different divs that hold vendor information

                        for (const cookie of allCookies) {
                            if (cookie.className.trim() === 'optanon-group-cookies-list') { //the div that holds a long string with cookie names
                                let splitCookieArray = cookie.innerText.split(','); //separate the long string into individual cookies
                                for (const splitCookie of splitCookieArray) {
                                    name = splitCookie.trim(); //trim the cookies of trailing whitespace

                                    if (cookie.querySelector('input[type="checkbox"]')) { //if that cookie has a toggle, but afaik this does not exist for the list of cookies
                                        hasConsentOption = true;
                                        consentOptionDisabled = false;
                                        if (cookie.querySelector('input[type="checkbox"]').parentNode.classList === 'optanon-status-on') {
                                            consentOptionDefaultStatus = true
                                        } else {
                                            consentOptionDefaultStatus = false
                                        }
                                    } else {
                                        hasConsentOption = false;
                                    }

                                    purposeCategory = category.title;

                                    template.vendorConsent.push({
                                        'name': name,
                                        'vendor': vendor,
                                        'description': description,
                                        'clicksRequiredToAccess': clicksRequiredToAccess,
                                        'hasConsentOption': hasConsentOption,
                                        'consentOptionDisabled': consentOptionDisabled,
                                        'consentOptionDefaultStatus': consentOptionDefaultStatus,
                                        'purposeCategory': purposeCategory,
                                        'expiryDate': expiryDate
                                    });
                                }
                            } else if (cookie.className.trim() === 'optanon-subgroup-cookies-list') { //the divs that hold individual vendor names (urls, really)
                                const vendorCookieList = cookie.querySelector('.optanon-subgroup-cookies').innerText.split(',');
                                for (vendorCookie of vendorCookieList) {
                                    name = vendorCookie.trim();
                                    vendor = cookie.querySelector('.optanon-subgroup-header').innerText.split(':')[0];

                                    if (cookie.querySelector('.optanon-subgroup-description')) {
                                        description = cookie.querySelector('.optanon-subgroup-description').innerText;
                                    }
                                    if (cookie.querySelector('input[type="checkbox"]')) {
                                        hasConsentOption = true;
                                        consentOptionDisabled = false;

                                        if (cookie.querySelector('input[type="checkbox"]').parentNode.classList == 'optanon-status-on') {
                                            consentOptionDefaultStatus = true
                                        } else {
                                            consentOptionDefaultStatus = false
                                        }
                                    } else {
                                        hasConsentOption = false;
                                    }

                                    purposeCategory = category.title;

                                    template.vendorConsent.push({
                                        'name': name,
                                        'vendor': vendor,
                                        'description': description,
                                        'clicksRequiredToAccess': clicksRequiredToAccess,
                                        'hasConsentOption': hasConsentOption,
                                        'consentOptionDisabled': consentOptionDisabled,
                                        'consentOptionDefaultStatus': consentOptionDefaultStatus,
                                        'purposeCategory': purposeCategory,
                                        'expiryDate': expiryDate
                                    });
                                }

                            }
                        }
                    }
                    return template;
                }
            }
        }
    ],

    screenshotAfterWaitFor: true,

};