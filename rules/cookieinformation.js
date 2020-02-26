const template = require('./__cmp-data-template');

module.exports = {

    cmpName: 'cookieinformation',

    dataTemplate: function() {
        return template;
    },
    //TODO talk to Peter about why it still happens that, when waitFor returns nothing (timeout) it still pushes it to the cookieinformation template object and does not go on to the next rule..
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


            // CookieInformation has 6(8?) different pop-up styles, as far as I'm aware: Checkboxes, Standard, Simple, Sidebar, Overlay, Overlayv2, CCPA, IAB
            let popUpVersion;
            if (element.id === 'coiConsentBanner') {
                if (element.querySelector('.coi-consent-banner__cookie-categories')) {
                    popUpVersion = 'checkboxes'
                    getCheckboxesPurposes()
                    //checkboxes: banner with accept and reject button, purpose checkboxes
                    // #coiConsentBanner
                    //     .coi-consent-banner__base
                    //     .coi-consent-banner__summary
                    //     .coi-consent-banner__consent-area
                    //     .coi-consent-banner__cookie-categories
                    //     .coi-consent-banner__consent-buttons
                } else if (window.getComputedStyle(element).width !== document.documentElement.clientWidth + 'px') {
                    popUpVersion = 'sidebar'
                    getStandardOrSidebarPurposes()
                    // sidebar: dialog box with accept button and show controls (maybe plain-text reject button)
                    // window.getComputedStyle(document.querySelector('#coiConsentBanner')).width !== document.documentElement.clientWidth + "px"
                    // #coiConsentBanner
                    //     .coi-consent-banner__base
                    //     .coi-consent-banner__consent-area
                    //     .coi-consent-banner__summary
                } else {
                    popUpVersion = 'standard'
                    getStandardOrSidebarPurposes()
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
                    getOverlayv2Purposes()
                    //overlayv2: barrier with accept and reject button, purpose toggles, and show controls
                    // #coi-banner-wrapper
                    // #coiPage-1
                    //     .coi-banner__summary
                    //     .coi-banner__page-footer
                    //     .coi-banner-consent-group
                } else {
                    popUpVersion = 'overlay';
                    getOverlayPurposes()
                    //overlay: barrier with accept button and show controls
                    // #coi-banner-wrapper
                    // #coiPage-1
                    //     .coi-banner__summary
                    //     .coi-banner__page-footer
                }
            }

            //notificationStyle
            if (popUpVersion === 'checkboxes' || popUpVersion === 'standard') {
                template.notificationStyle = 'banner';
            } else if (popUpVersion === 'overlay' || popUpVersion === 'overlayv2') {
                template.notificationStyle = 'barrier';
            } else if (popUpVersion === 'simple') {
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

            //reject
            let rejectBtnSelectors = ['[onclick="CookieInformation.declineAllCategories()"]', '[onkeypress="javascript:CookieConsent.dialog.submitDecline();"]', '.c-decline', '#declineButton', '.coi-consent-banner__decline-button']; //perhaps overkill, most decline buttons have two of these
            for (const selector of rejectBtnSelectors) {
                const rejectBtn = document.querySelector(selector);
                if (rejectBtn) {
                    template.rejectAllConsent.present = true;
                    template.rejectAllConsent.buttonText = rejectBtn.innerText;
                    template.rejectAllConsent.clicksRequiredToAccess = 0;
                    break
                }
            }

            //bulk description //TODO make this less repetitive
            let header = element.querySelector('#coiBannerHeadline');
            if (element.querySelector('#cookie_summary')) {
                let text = element.querySelector('#cookie_summary');
                template.bulkDescriptionHTML = header.innerHTML + '\n' + text.innerHTML;
                template.bulkDescription = header.innerText + '\n' + text.innerText
            } else if (element.querySelector('#coi-banner-wrapper_label')) {
                let text = element.querySelector('#coi-banner-wrapper_label');
                template.bulkDescriptionHTML = header.innerHTML + '\n' + text.innerHTML;
                template.bulkDescription = header.innerText + '\n' + text.innerText
            }

            //purposeConsent
            // standard + sidebar
            function getStandardOrSidebarPurposes() {
                const allPurposes = element.querySelectorAll('.coi-consent-banner__category-container');

                for (const purpose of allPurposes) {
                    const name = purpose.querySelector('*.coi-consent-banner__category-name').innerText
                    const description = purpose.querySelector('.coi-consent-banner__category-description').innerText
                    const clicksRequiredToAccess = 1;
                    let hasConsentOption = null;
                    let consentOptionDisabled = null;
                    let consentOptionDefaultStatus = null;

                    let toggle = purpose.querySelector('coi-consent-banner__switch-checkbox');

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
                    })

                    getOverlayVendors(purpose, name, clicksRequiredToAccess)
                }
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
                    let name
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

            // standard or sidebar
            function getStandardOrSidebarVendors(purpose, purposeName) {
                const allCookies = purpose.querySelectorAll('.coi-consent-banner__cookie-details');

                for (const cookie of allCookies) {
                    const name = cookie.querySelector('.cookie-details__detail-container.cookie-details__detail-container-name .cookie-details__detail-content').innerText;
                    //TODO fix this to be on different line or something.. better concat
                    const vendorName = checkIfNotEmpty(cookie.querySelector('.cookie-details__detail-container.cookie-details__detail-container-provider .cookie-details__detail-content')) + checkIfNotEmpty(cookie.querySelector('.cookie-details__detail-container.cookie-details__detail-container-data-processor-name .cookie-details__detail-content'));
                    const description = checkIfNotEmpty(cookie.querySelector('.cookie-details__detail-container.cookie-details__detail-container-purpose .cookie-details__detail-content'));
                    const hasConsentOption = false; //have not seen any examples of vendor level consent toggles
                    const clicksRequiredToAccess = 1;
                    const consentOptionDisabled = null;
                    const consentOptionDefaultStatus = null;
                    const purposeCategory = purposeName
                    const expiryDate = checkIfNotEmpty(cookie.querySelector('.cookie-details__detail-container.cookie-details__detail-container-expiry .cookie-details__detail-content').innerText);

                    function checkIfNotEmpty(element) {
                        if (!element || element.length === 0 ) {
                            return null
                        } else {
                            return element.innerText + '\n' //TODO fix this
                        }
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
            }

            //checkboxes
            // doesn't have vendors

            //simple
            // doesn't have vendors

            // overlay
            function getOverlayVendors(purpose, purposeName, clicksRequiredToAccessPurpose) {
                const allCookies = purpose.querySelectorAll('.coi-consent-banner__found-cookies');

                for (const cookie of allCookies) {
                    const name = cookie.querySelector('.cookie-details__detail-container.cookie-details__detail-container-name .cookie-details__detail-content').innerText;
                    //TODO fix this to be on different line or something.. better concat
                    const vendorName = checkIfExists(cookie.querySelector('.cookie-details__detail-container.cookie-details__detail-container-provider .cookie-details__detail-content')) + checkIfExists(cookie.querySelector('.cookie-details__detail-container.cookie-details__detail-container-data-processor-name .cookie-details__detail-content'));
                    const description = checkIfExists(cookie.querySelector('.cookie-details__detail-container.cookie-details__detail-container-purpose .cookie-details__detail-content'));
                    const hasConsentOption = false; //have not seen any examples of vendor level consent toggles
                    const consentOptionDisabled = null;
                    const consentOptionDefaultStatus = null;
                    const purposeCategory = purposeName
                    const expiryDate = checkIfExists(cookie.querySelector('.cookie-details__detail-container.cookie-details__detail-container-expiry .cookie-details__detail-content'));

                    function checkIfExists(element) {
                        if (!element || element.length === 0 ) {
                            return null
                        } else {
                            return element.innerText + '\n'
                        }
                    }

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

            return template;
        }
    }],

    screenshotAfterWaitFor: true,

};