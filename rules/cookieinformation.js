const template = require('./__cmp-data-template');

module.exports = {

    cmpName: 'cookieinformation',

    dataTemplate: function() {
        return template;
    },

    extractor: [{
        waitFor: async function (page) {
            await page.waitForFunction(() => {
                    return document.querySelectorAll('#coiConsentBanner, #coi-cookie, #coi-banner-wrapper').length
                }, {timeout:10000}
            );
        },
        extract: function (template) {

            let selectors = ['#coiConsentBanner', '#coi-cookie', '#coi-banner-wrapper'];
            let element;
            for (let selector of selectors) {
                element = document.querySelector(selector);
                if (element) {
                    template.html = element.outerHTML;
                    break;
                }
            }

            //check if there is a read more button
            const nextPageButtonSelectors = ['.summary-texts__show-details', '#coiShowDetails', '.coi-banner__nextpage', '#show_details', '.coi-banner__iab-toggle', '.coi-banner__iab-vendor-link']; //TODO this is a bit of a shitty solution, because now it checks whether these elements exists, rather than if the actual info from the next page is visible to the user. As a result, degulesider.dk's puroses are not scraped properly
            function checkIfNextPageButtonExists(nextPageButtonSelectors) {
                for (const selector of nextPageButtonSelectors) {
                    let nextPageButton = document.querySelector(selector);
                    if (nextPageButton) {
                        return true;
                    }
                }
            }
            const nextPageExists = checkIfNextPageButtonExists(nextPageButtonSelectors)

            // CookieInformation has 6(8?) different pop-up styles, as far as I'm aware: Checkboxes, Standard, Simple, Sidebar, Overlay, Overlayv2, CCPA, IAB
            let popUpVersion;
            if (element.id === 'coiConsentBanner') {
                if (element.querySelector('.coi-consent-banner__cookie-categories')) {
                    popUpVersion = 'checkboxes'
                    if (nextPageExists) {getCheckboxesPurposes()}
                    //checkboxes: banner with accept and reject button, purpose checkboxes
                    // #coiConsentBanner
                    //     .coi-consent-banner__base
                    //     .coi-consent-banner__summary
                    //     .coi-consent-banner__consent-area
                    //     .coi-consent-banner__cookie-categories
                    //     .coi-consent-banner__consent-buttons
                } else if (window.getComputedStyle(element).width !== document.documentElement.clientWidth + 'px') {
                    popUpVersion = 'sidebar'
                    if (nextPageExists) {getStandardOrSidebarPurposes()}
                    // sidebar: dialog box with accept button and show controls (maybe plain-text reject button)
                    // window.getComputedStyle(document.querySelector('#coiConsentBanner')).width !== document.documentElement.clientWidth + "px"
                    // #coiConsentBanner
                    //     .coi-consent-banner__base
                    //     .coi-consent-banner__consent-area
                    //     .coi-consent-banner__summary
                } else {
                    popUpVersion = 'standard'
                    if (nextPageExists) {getStandardOrSidebarPurposes()}
                    //standard: banner with accept button and show controls (maybe plain-text reject button)
                    // #coiConsentBanner
                    //     .coi-consent-banner__base
                    //     .coi-consent-banner__consent-area
                    //     .coi-consent-banner__summary
                }
            } else if (element.id === 'coi-cookie') {
                popUpVersion = 'simple'

                //simple: banner with accept and reject button, no further integrated controls
                // #coi-cookie
                    // #c-left
                    // #c-right
            } else if (element.id === 'coi-banner-wrapper') {
                if (element.querySelector('.coi-banner-consent-group')) {
                    popUpVersion = 'overlayv2';
                    if (nextPageExists) {getOverlayv2Purposes()}
                    //overlayv2: barrier with accept and reject button, purpose toggles, and show controls
                    // #coi-banner-wrapper
                    // #coiPage-1
                    //     .coi-banner__summary
                    //     .coi-banner__page-footer
                    //     .coi-banner-consent-group
                } else if (element.querySelector('.coi-iab-wrapper')) {
                    popUpVersion = 'overlayIAB'
                    if (nextPageExists) {getOverlayIABPurposes()}
                } else {
                    popUpVersion = 'overlay';

                    if (nextPageExists) {getOverlayPurposes()}
                    //overlay: barrier with accept button and show controls
                    // #coi-banner-wrapper
                    // #coiPage-1
                    //     .coi-banner__summary
                    //     .coi-banner__page-footer
                }
            }

            //notificationStyle
            if (popUpVersion === 'checkboxes' || popUpVersion === 'standard' || popUpVersion === 'simple') {
                template.notificationStyle = 'banner';
            } else if (popUpVersion === 'overlay' || popUpVersion === 'overlayv2' || popUpVersion === 'overlayIAB') {
                template.notificationStyle = 'barrier';
            } else if (popUpVersion === 'sidebar') {
                template.notificationStyle = 'custom';
            }

            //consent
            //as far as I can tell, they do not allow any implicit consent
            template.consent.type = 'explicit';

            //accept
            let acceptBtnSelectors = ['[onclick="CookieInformation.submitAllCategories();"]', '[onkeypress="javascript:CookieInformation.submitAllCategories();"]', '.c-decline', '.coi-banner__accept', '.coi-consent-banner__agree-button']; //perhaps overkill, most decline buttons have two of these
            for (const selector of acceptBtnSelectors) {
                const acceptBtn = document.querySelector(selector);
                if (acceptBtn) {
                    template.acceptAllConsent.present = true;
                    template.acceptAllConsent.buttonText = acceptBtn.innerText;
                    template.acceptAllConsent.clicksRequiredToAccess = 0;
                    break
                }
            }

            //TODO there is also the 'submit currently toggled on' button for consent, which has the onkepress=CookieInformation.submitConsent() (found at emaerket.dk). Is that accept? reject?

            //reject
            let rejectBtnSelectors = ['[onclick="CookieInformation.declineAllCategories();"]', '[onkeypress="javascript:CookieConsent.dialog.submitDecline();"]', '[onclick="CookieConsent.dialog.submitDecline()]', '.c-decline', '#declineButton', '.coi-consent-banner__decline-button']; //perhaps overkill, most decline buttons have two of these
            for (const selector of rejectBtnSelectors) {
                const rejectBtn = document.querySelector(selector);
                if (rejectBtn) {
                    template.rejectAllConsent.present = true;
                    template.rejectAllConsent.buttonText = rejectBtn.innerText;
                    template.rejectAllConsent.clicksRequiredToAccess = 0;
                    break
                }
            }

            //bulk description
            function getDescriptionInfo(descriptionTextSelectors) {
                for (let selector of descriptionTextSelectors) {
                    let description = document.querySelector(selector);
                    if (description) {
                        template.bulkDescription = description.innerText;
                        template.bulkDescriptionHTML = description.innerHTML;
                        break;
                    }
                }
            }

            const descriptionTextSelectors = ['#cookie_summary', '#coi-banner-wrapper_label', '.summary-texts__description', '.coi-banner__maintext', '#coi-cookie', '.coi-banner-discription'];
            const descriptionHeaderSelectors = ['.summary-texts__title ', '#coiBannerHeadline', '.coi-banner__headline'];
            getDescriptionInfo(descriptionTextSelectors);

            //purposeConsent

            // standard + sidebar
            function getStandardOrSidebarPurposes() {
                const allPurposes = element.querySelectorAll('.coi-consent-banner__category-container');

                for (const purpose of allPurposes) {
                    const name = purpose.querySelector('*.coi-consent-banner__category-name').innerText;
                    const description = purpose.querySelector('.coi-consent-banner__category-description').innerText;
                    const clicksRequiredToAccess = 1;
                    let hasConsentOption = null;
                    let consentOptionDisabled = null;
                    let consentOptionDefaultStatus = null;

                    let toggle = purpose.querySelector('.coi-consent-banner__switch-checkbox');

                    if (toggle) {
                        hasConsentOption = true;
                        consentOptionDefaultStatus = toggle.checked;
                        consentOptionDisabled = toggle.disabled;
                    } else if (!toggle) {
                        hasConsentOption = false
                    }

                    template.purposeConsent.push({
                        'name': name,
                        'description': description,
                        'clicksRequiredToAccess': clicksRequiredToAccess,
                        'hasConsentOption': hasConsentOption,
                        'consentOptionDisabled': consentOptionDisabled,
                        'consentOptionDefaultStatus': consentOptionDefaultStatus
                    })

                    getStandardOrSidebarVendors(purpose, name)

                }
            }

            // checkboxes
            function getCheckboxesPurposes() {
                const allPurposes = element.querySelector('.coi-consent-banner__cookie-categories').children;

                for (const purpose of allPurposes) {
                    const name = purpose.innerText;
                    const description = null;
                    const clicksRequiredToAccess = 0;
                    let hasConsentOption = null;
                    let consentOptionDisabled = null;
                    let consentOptionDefaultStatus = null;

                    if (purpose.querySelector('.coi-consent-banner__category-checkbox')) {
                        hasConsentOption = true;
                        consentOptionDisabled = purpose.querySelector('.coi-consent-banner__category-checkbox').disabled;
                        consentOptionDefaultStatus = purpose.querySelector('.coi-consent-banner__category-checkbox').checked;
                    } else {
                        hasConsentOption = false;
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

            //simple
            // // does not have purposes

            // overlay
            function getOverlayPurposes() {
                const allPurposesWithDescriptions = element.querySelectorAll('.coi-consent-banner__category-container');

                for (const purpose of allPurposesWithDescriptions) {
                    const name = purpose.querySelector('*.coi-consent-banner__category-name span').innerText
                    const description = purpose.querySelector('.coi-consent-banner__category-description').innerText
                    const clicksRequiredToAccess = 1;
                    let hasConsentOption = null;
                    let consentOptionDisabled = null;
                    let consentOptionDefaultStatus = null;

                    const toggle = purpose.querySelector('.coi__checkbox');
                    if (toggle) {
                        hasConsentOption = true;
                        consentOptionDisabled = toggle.disabled;
                        consentOptionDefaultStatus = toggle.checked;
                    } else if (!toggle) {
                        hasConsentOption = false
                    }

                    template.purposeConsent.push({
                        'name': name,
                        'description': description,
                        'clicksRequiredToAccess': clicksRequiredToAccess,
                        'hasConsentOption': hasConsentOption,
                        'consentOptionDisabled': consentOptionDisabled,
                        'consentOptionDefaultStatus': consentOptionDefaultStatus
                    });

                    getOverlayVendors(purpose, name, clicksRequiredToAccess)
                }
            }

            //overlay IAB
            function getOverlayIABPurposes() {
                const allPurposesWithDescriptions = element.querySelectorAll('.coi-consent-banner__category-container');

                for (const purpose of allPurposesWithDescriptions) {
                    const name = purpose.querySelector('*.coi-consent-banner__category-name span').innerText
                    const description = purpose.querySelector('.coi-consent-banner__category-description').innerText
                    const clicksRequiredToAccess = 1;
                    let hasConsentOption = null;
                    let consentOptionDisabled = null;
                    let consentOptionDefaultStatus = null;

                    const toggle = purpose.querySelector('.coi__checkbox');
                    if (toggle) {
                        hasConsentOption = true;
                        consentOptionDisabled = toggle.disabled;
                        consentOptionDefaultStatus = toggle.checked;
                    } else if (!toggle) {
                        hasConsentOption = false
                    }

                    template.purposeConsent.push({
                        'name': name,
                        'description': description,
                        'clicksRequiredToAccess': clicksRequiredToAccess,
                        'hasConsentOption': hasConsentOption,
                        'consentOptionDisabled': consentOptionDisabled,
                        'consentOptionDefaultStatus': consentOptionDefaultStatus
                    });

                    getOverlayVendors(purpose, name, clicksRequiredToAccess)
                }


                function getIABPurposesButton(IABPurposeButtonSelectors) {
                    for (const selector of IABPurposeButtonSelectors) {
                        const IABPurposeButton = document.querySelector(selector)
                        if (IABPurposeButton) {
                            return IABPurposeButton
                        }
                    }
                }

                const IABPurposeButtonSelectors = ['#show-purposes', '.coi-banner__iab-toggle'];

                const IABPurposesButton = getIABPurposesButton(IABPurposeButtonSelectors)
                IABPurposesButton.click(); //TODO should do an await here to make sure the elements are loaded properly
                const allIABPurposesWithDescriptions = element.querySelectorAll('.iab-purpose-container');

                let clicksRequiredToAccess;
                for (const IABpurpose of allIABPurposesWithDescriptions) {
                    const name = IABpurpose.querySelector('*.iab-purpose-name').innerText;
                    const description = IABpurpose.querySelector('.iab-purpose-description').innerText;
                    clicksRequiredToAccess = 1; //TODO do not hardcode but actually check? it's 1 if #IABListOfPurposes style.display !== hidden and #IABFullVendorList style.display === hidden? Currently incorrect for degulesider.dk.. that site has both buttons on the first page
                    let hasConsentOption = null;
                    let consentOptionDisabled = null;
                    let consentOptionDefaultStatus = null;

                    const toggle = IABpurpose.querySelector('.coi__checkbox_purpose');
                    if (toggle) {
                        hasConsentOption = true;
                        consentOptionDisabled = toggle.disabled;
                        consentOptionDefaultStatus = toggle.checked;
                    } else if (!toggle) {
                        hasConsentOption = false
                    }

                    template.purposeConsent.push({
                        'name': name,
                        'description': description,
                        'clicksRequiredToAccess': clicksRequiredToAccess,
                        'hasConsentOption': hasConsentOption,
                        'consentOptionDisabled': consentOptionDisabled,
                        'consentOptionDefaultStatus': consentOptionDefaultStatus
                    });
                }

                getOverlayIABVendors(clicksRequiredToAccess); //function call outside of purpose loop because vendors and purposes are disconnected in IAB design. To pass clicksRequiredToAccess, it needs to be defined outside of loop, hence that messiness
            }

            function getNameOfPurposeWithToggle(purposeWithToggle) {
                return purposeWithToggle.querySelector('.consent-feld-name').innerText
            }

            function getNameOfPurposeWithDescription(purposeWithDescription) {
                return purposeWithDescription.querySelector('*.coi-consent-banner__category-name span').innerText
            }

            function getDescriptionOfPurposeWithDescription(purposeWithDescription) {
                return purposeWithDescription.querySelector('.coi-consent-banner__category-description').innerText
            }

            // overlayv2
            function getOverlayv2Purposes() {
                const allPurposesWithDescriptions = element.querySelectorAll('.coi-consent-banner__category-container');

                const allPurposesWithToggles = element.querySelectorAll('.coi-banner-consent-field');

                for (const purposeWithDescription of allPurposesWithDescriptions) {
                    const purposeWithToggle = Array.from(allPurposesWithToggles).find(eachPurposeWithToggle => getNameOfPurposeWithDescription(purposeWithDescription) == getNameOfPurposeWithToggle(eachPurposeWithToggle));

                    let notInAllPurposesWithToggles = purposeWithToggle == undefined
                    let name;
                    if (notInAllPurposesWithToggles) {
                        //If there is no associated purposeWithToggle we assume that the name is "unclassifed" or something like that
                        name = getNameOfPurposeWithDescription(purposeWithDescription)
                    } else {
                        name = getNameOfPurposeWithToggle(purposeWithToggle)
                    }

                    const description = getDescriptionOfPurposeWithDescription(purposeWithDescription)
                    const clicksRequiredToAccess = notInAllPurposesWithToggles ? 1 : 0;
                    let hasConsentOption = null;
                    let consentOptionDisabled = null;
                    let consentOptionDefaultStatus = null;

                    let toggle = notInAllPurposesWithToggles ? undefined : purposeWithToggle.querySelector('.coi__checkbox');
                    if (toggle) {
                        hasConsentOption = true;
                        consentOptionDisabled = toggle.disabled;
                        consentOptionDefaultStatus = toggle.checked;
                    } else if (!toggle) {
                        hasConsentOption = false
                    }

                    template.purposeConsent.push({
                        'name': name,
                        'description': description,
                        'clicksRequiredToAccess': clicksRequiredToAccess,
                        'hasConsentOption': hasConsentOption,
                        'consentOptionDisabled': consentOptionDisabled,
                        'consentOptionDefaultStatus': consentOptionDefaultStatus
                    })

                    getOverlayVendors(purposeWithDescription, name, clicksRequiredToAccess)

                }
            }

            //vendorConsent
            //TODO merge these two functions to be the same, except for the allCookies element + clicksRequiredToAccess

            function checkIfExists(element) {
                if (!element || element.length === 0 ) {
                    return null;
                } else {
                    return element.innerText
                }
            }
            // standard or sidebar
            function getStandardOrSidebarVendors(purpose, purposeName) {
                const allCookies = purpose.querySelectorAll('.coi-consent-banner__cookie-details');

                for (const cookie of allCookies) {
                    const emptyCookieList = cookie.querySelector('.coi-consent-banner__no-cookies');
                    if (!emptyCookieList) { //check if this purpose has vendors
                        const name = cookie.querySelector('.cookie-details__detail-container.cookie-details__detail-container-name .cookie-details__detail-content').innerText;
                        //TODO fix this to be on different line or something.. better concat
                        const vendorName = [checkIfExists(cookie.querySelector('.cookie-details__detail-container.cookie-details__detail-container-provider .cookie-details__detail-content')), '\n', checkIfExists(cookie.querySelector('.cookie-details__detail-container.cookie-details__detail-container-data-processor-name .cookie-details__detail-content'))].join('')
                        const description = checkIfExists(cookie.querySelector('.cookie-details__detail-container.cookie-details__detail-container-purpose .cookie-details__detail-content'));
                        const hasConsentOption = false; //have not seen any examples of vendor level consent toggles
                        const clicksRequiredToAccess = 1;
                        const consentOptionDisabled = null;
                        const consentOptionDefaultStatus = null;
                        const purposeCategory = purposeName
                        const expiryDate = checkIfExists(cookie.querySelector('.cookie-details__detail-container.cookie-details__detail-container-expiry .cookie-details__detail-content').innerText);

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

                }
            }

            //checkboxes
            // doesn't have vendors

            //simple
            // doesn't have vendors

            // overlay
            function getOverlayVendors(purpose, purposeName, clicksRequiredToAccessPurpose) {
                const allCookies = purpose.querySelectorAll('.coi-consent-banner__cookie-details');

                for (const cookie of allCookies) {
                    const emptyCookieList = cookie.querySelector('.coi-consent-banner__no-cookies');
                    if (!emptyCookieList) {
                        const name = checkIfExists(cookie.querySelector('.cookie-details__detail-container.cookie-details__detail-container-name .cookie-details__detail-content'));
                        //TODO fix this to be on different line or something.. better concat
                        const vendorName = [checkIfExists(cookie.querySelector('.cookie-details__detail-container.cookie-details__detail-container-provider .cookie-details__detail-content')), '\n', checkIfExists(cookie.querySelector('.cookie-details__detail-container.cookie-details__detail-container-data-processor-name .cookie-details__detail-content'))].join('');
                        const description = checkIfExists(cookie.querySelector('.cookie-details__detail-container.cookie-details__detail-container-purpose .cookie-details__detail-content'));
                        const hasConsentOption = false; //have not seen any examples of vendor level consent toggles
                        const consentOptionDisabled = null;
                        const consentOptionDefaultStatus = null;
                        const purposeCategory = purposeName
                        const expiryDate = checkIfExists(cookie.querySelector('.cookie-details__detail-container.cookie-details__detail-container-expiry .cookie-details__detail-content'));

                        template.vendorConsent.push({
                            'name': name,
                            'vendor': vendorName,
                            'description': description,
                            'clicksRequiredToAccess': clicksRequiredToAccessPurpose + 1,
                            'hasConsentOption': hasConsentOption,
                            'consentOptionDisabled': consentOptionDisabled,
                            'consentOptionDefaultStatus': consentOptionDefaultStatus,
                            'purposeCategory': purposeCategory,
                            'expiryDate': expiryDate
                        })
                    }
                }
            }

            //overlay IAB
            function getOverlayIABVendors(clicksRequiredToAccessPurpose) {
                const allCookies = document.querySelectorAll('.iab-single-vendor');

                for (const cookie of allCookies) {
                    const emptyCookieList = cookie.querySelector('.coi-consent-banner__no-cookies');
                    if (!emptyCookieList) {
                        const name = null
                        const vendorName = cookie.querySelector('.iab-vendor-name').innerText;
                        const description = cookie.querySelector('.iab-vendors-purposes-names').innerText; //TODO break this info down into description and purposes?
                        let hasConsentOption = null; //have not seen any examples of vendor level consent toggles
                        let consentOptionDisabled = null;
                        let consentOptionDefaultStatus = null;
                        const purposeCategory = null;
                        const expiryDate = null;

                        const toggle = cookie.querySelector('.coi__checkbox_vendor');
                        if (toggle) {
                            hasConsentOption = true;
                            consentOptionDisabled = toggle.disabled;
                            consentOptionDefaultStatus = toggle.checked;
                        } else if (!toggle) {
                            hasConsentOption = false
                        }

                        template.vendorConsent.push({
                            'name': name,
                            'vendor': vendorName,
                            'description': description,
                            'clicksRequiredToAccess': clicksRequiredToAccessPurpose + 1, //TODO make this not hard coded, if possible?
                            'hasConsentOption': hasConsentOption,
                            'consentOptionDisabled': consentOptionDisabled,
                            'consentOptionDefaultStatus': consentOptionDefaultStatus,
                            'purposeCategory': purposeCategory,
                            'expiryDate': expiryDate
                        })
                    }
                }
            }

            return template;
        }
    }],

    screenshotAfterWaitFor: true,

};