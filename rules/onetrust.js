const template = require('./__cmp-data-template');

module.exports = {

    cmpName: 'OneTrust',

    dataTemplate: function() {
        return template;
    },


    extractor: [
        {
            extractor: function (template) {
                let element = document.querySelector('.optanon-alert-box-wrapper');
                if (element) {
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

                    if (consentType === 'notice only' || consentType === 'opt-out') {
                        template.consent.type = 'implied';
                        template.consent.impliedConsentAction.visitPage = true;
                    } else if (consentType === 'implied consent') {
                        template.consent.type = 'implied';
                        template.consent.impliedConsentAction.navigatePage = true;
                        template.consent.impliedConsentAction.refreshPage = true;
                    } else if (consentType === 'opt-in') {
                        template.consent.type = 'explicit';
                    } else if (consentType === 'owner defined') {
                        template.consent.type = 'custom'
                    }
                    //TODO incorporate:
                    // for value in response.data['OneTrust']['categoryDefaultConsentTypes']:
                    // if value == "Active":
                    // consentType = 'implicit'
                    // consentAction.append('visit')
                    // # consentAction.remove('consent')
                    // elif value == 'Always Active':
                    // consentTpe = 'implicit'
                    // consentAction.append('visit')
                    // # consentAction.remove('consent')
                    // elif value == 'Inactive Landing Page':
                    // consentType = 'implicit'
                    // consentAction.append('navigate')
                    // consentAction.append('reload')
                    // # consentAction.remove('consent')
                    //
                    //
                    // //not sure how accurate these are
                    template.consent.impliedConsentAction.closePopup = notUndefined(onetrustGlobalObject.CloseShouldAcceptAllCookies);
                    template.consent.impliedConsentAction.clickPage = notUndefined(onetrustGlobalObject.OnClickAcceptAllCookies);
                    template.consent.impliedConsentAction.scrollPage = notUndefined(onetrustGlobalObject.ScrollAcceptsAllCookiesAndClosesBanner);

                    function notUndefined(property) {
                        if (property) {
                            template.consent.type = 'implied';
                            return true
                        } else {
                            return null
                        }
                    }

                    //accept TODO verify that this works
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
                    template.rejectAllConsent.present = false;

                    //bulkDescription + bulk description HTML
                    if (document.querySelector("#alert-box-message")) {
                        template.bulkDescription = document.querySelector("#alert-box-message").innerText;
                        template.bulkDescriptionHTML = document.querySelector("#alert-box-message").innerHTML;
                    } else if (document.querySelector(".optanon-alert-box-body")) {
                        template.bulkDescription = document.querySelector(".optanon-alert-box-body").innerText;
                        template.bulkDescriptionHTML = document.querySelector(".optanon-alert-box-body").innerText;
                    }

                    //purposes
                    let moreDetailsPresent = true; //need this flag to determine vendor details and calculate clicks later on
                    if (    (document.querySelector(".optanon-toggle-display")
                            && document.querySelector(".optanon-toggle-display").offsetHeight !== 0)
                        || (document.querySelector('*[onclick="Optanon.TriggerGoogleAnalyticsEvent(\'OneTrust Cookie Consent\', \'Banner Open Preferences\');"]')
                            && document.querySelector('*[onclick="Optanon.TriggerGoogleAnalyticsEvent(\'OneTrust Cookie Consent\', \'Banner Open Preferences\');"]'.offsetHeight !== 0))) {
                        moreDetailsPresent = true;
                        getPurposeDetails()
                    } else if (document.querySelector('.hide-cookie-setting-button')) {
                        template.purposeConsent = false
                    }


                    function getPurposeDetails() {
                        //onetrust has different kinds of labels for their purposes, which are stored in properties of the global object. We have to check these labels to know the default and enabled status of purposes
                        const activeText = onetrustGlobalObject.ActiveText;
                        const inactiveText = onetrustGlobalObject.InactiveText;
                        const alwaysActiveText = onetrustGlobalObject.AlwaysActiveText;
                        const inactiveLandingPageText = 'Inactive LandingPage';

                        const allPurposes = onetrustGlobalObject.Groups;
                        for (purpose of allPurposes) {
                            let name = null;
                            let description = null;
                            let clicksRequiredToAccess = 2;
                            let consentOptionDisabled = null;
                            let consentOptionDefaultStatus = null;
                            const hasConsentOption = true; //if this function is called, we know that the consent option is present

                            if (purpose.Parent === null) {
                                name = purpose.GroupLanguagePropertiesSets[0].GroupName.Text;
                                description = purpose.GroupLanguagePropertiesSets[0].GroupDescription.Text;

                                let defaultStatusLabel = purpose.GroupLanguagePropertiesSets[0].DefaultStatus.Text;
                                if (defaultStatusLabel == activeText) {
                                    consentOptionDefaultStatus = true;
                                    consentOptionDisabled = false;
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
                }

                return template;
            }
        }, {
            waitFor: async function (page) {
                //
                // try {
                //     await page.waitFor('.vendor-consent-link');
                //     await page.click('.vendor-consent-link');
                // } catch(error) {
                //     return 3
                // }


            },
            extractor: function (template) {
                const allVendors = document.querySelectorAll('.vendor-item');

                for (const vendor in allVendors) {
                    const name = vendor.querySelector(".vendor-name").innerText;
                    const description = vendor.querySelector(".vendor-privacy-policy").innerText;
                    const clicksRequiredToAccess = 2;
                    const hasConsentOption = true;
                    const consentOptionDisabled = vendor.querySelector("input").disabled;
                    const consentOptionDefaultStatus = vendor.querySelector("input").checked;

                    template.vendorConsent.push({
                        'name': name,
                        'description': description,
                        'clicksRequiredToAccess': clicksRequiredToAccess,
                        'hasConsentOption': hasConsentOption,
                        'consentOptionDisabled': consentOptionDisabled,
                        'consentOptionDefaultStatus': consentOptionDefaultStatus
                    })
                }

                return template;

            }
        }, {
            waitFor: async function(page) {
                //TODO check here if moreDetailsPresent === true

            },
            extractor: function(template) {

                throw new Error('hello');

                const allCategories = document.querySelector("#optanon-menu").querySelectorAll("li:not(.menu-item-about):not(.menu-item-moreinfo)");

                let name = null;
                let description = null;
                let clicksRequiredToAccess = null;
                let consentOptionDisabled = null;
                let hasConsentOption = null;
                let consentOptionDefaultStatus = null;

                template.vendorConsent.push({
                    'name': name,
                    'description': description,
                    'clicksRequiredToAccess': clicksRequiredToAccess,
                    'hasConsentOption': hasConsentOption,
                    'consentOptionDisabled': consentOptionDisabled,
                    'consentOptionDefaultStatus': consentOptionDefaultStatus
                });

                //TODO make this algorithm less of a monster
                for (const category of allCategories) {
                    category.click(); //click on each of the categories in the 'more info' popup
                    if (document.querySelector('.optanon-cookie-list')) { //check if there is an actual vendor list present
                        const allCookies = document.querySelectorAll(".optanon-group-cookies-list, .optanon-subgroup-cookies-list"); //get the different divs that hold vendor information

                        for (const cookie of allCookies) {
                            if (cookie.className === 'optanon-group-cookies-list') { //the div that holds a long string with cookie names
                                let splitCookieArray = cookie.innerText.split(','); //separate the long string into individual cookies
                                for (const splitCookie of splitCookieArray) {
                                    name = splitCookie.trim(); //trim the cookies of trailing whitespace

                                    if (cookie.querySelector('input[type="checkbox"]')) { //if that cookie has a toggle, but afaik this does not exist for the list of cookies
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

                                    template.vendorConsent.push({
                                        'name': name,
                                        'description': description,
                                        'clicksRequiredToAccess': clicksRequiredToAccess,
                                        'hasConsentOption': hasConsentOption,
                                        'consentOptionDisabled': consentOptionDisabled,
                                        'consentOptionDefaultStatus': consentOptionDefaultStatus
                                    });
                                }
                            } else if (cookie.className === '.optanon-subgroup-cookies-list') { //the divs that hold individual vendor names (urls, really)
                                name = cookie.innerText;

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

                                template.vendorConsent.push({
                                    'name': name,
                                    'description': description,
                                    'clicksRequiredToAccess': clicksRequiredToAccess,
                                    'hasConsentOption': hasConsentOption,
                                    'consentOptionDisabled': consentOptionDisabled,
                                    'consentOptionDefaultStatus': consentOptionDefaultStatus
                                });
                            }
                        }

                    }
                }
                return template;
            }


        }


    ],

    screenshotAfterWaitFor: true,

};