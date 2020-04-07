//TODO I changed how data is passed between extracts by creating this intermediateData object. Test whether this still works correctly

const template = require('./__cmp-data-template');

module.exports = {

    cmpName: 'quantcast',

    dataTemplate: function() {
        return template;
    },

    intermediateData: {},

    extractor: [
        {
            extract: function(template) {
                const element = document.querySelector('#qcCmpUi');

                if (element) {
                    //all HTML
                    template.html = element.innerHTML;

                    //notification style
                    if (window.getComputedStyle(element).position === 'relative') {
                        template.notificationStyle = 'barrier'
                    } else if (window.getComputedStyle(element).position === 'fixed') {
                        template.notificationStyle = 'banner'
                    } else {
                        template.notificationStyle = 'custom'
                    };


                    //consent
                    //as far as we are able to tell, quantcast does not allow implied consent
                    template.consent.type = 'explicit'

                    //accept all
                    if (document.querySelector("#qcCmpButtons button[onclick*=setAndSaveAllConsent]")
                        && document.querySelector("#qcCmpButtons button[onclick*=setAndSaveAllConsent]").offsetHeight !== 0) {
                        template.acceptAllConsent.present = true;
                        template.acceptAllConsent.buttonText = document.querySelector("#qcCmpButtons button[onclick*=setAndSaveAllConsent]").innerText;
                        template.acceptAllConsent.clicksRequiredToAccess = 0;
                    }

                    //reject all
                    //TODO figure out how to detect reject all vs more info button!
                    //on jp.dk more info button = #qc-cmp-purpose-button   .qc-cmp-alt-action qc-cmp-center-bottom   [onclick*=window.__cmpui("updateConsentUi",2)]
                    //onvalutaomregneren.dk, nothing on the element. Class=qc-cmp-button qc-cmp-secondary-button, but in script vvvvvvv
                    //if 'No Option':false(onvalutaomregneren.dk)//'No Option': false(feltet.dk) > get rid of whitespace!
                    //newsbreak.dk > neither on element, nor in script...

                    const rejectAllButtonInitialised = [...document.querySelectorAll('script')]             // get all the scripts
                                                                    .map(element => element.innerHTML)               // get their contents
                                                                    .some(element => element.includes('cmp') && (element.includes("'No Option':false") || element.includes("'No Option': false"))) // keep only those containing the query

                    if (document.querySelector(".qc-cmp-button.qc-cmp-secondary-button") && document.querySelector(".qc-cmp-button.qc-cmp-secondary-button").offsetHeight !== 0
                        && rejectAllButtonInitialised) {
                        template.rejectAllConsent.present = true;
                        template.rejectAllConsent.buttonText = document.querySelector(".qc-cmp-button.qc-cmp-secondary-button").innerText;
                        template.rejectAllConsent.clicksRequiredToAccess = 0;
                    }

                    //bulk description
                    template.bulkDescription = document.querySelector(".qc-cmp-main-messaging").innerText;
                    template.bulkDescriptionHTML = document.querySelector(".qc-cmp-main-messaging").innerHTML;

                    //check if vendor link on first page (changes minimumClicksRequired)
                    const vendorLink = document.getElementById("qc-cmp-vendor-button");
                    if (vendorLink && vendorLink.offsetHeight !== 0) {
                        intermediateData.vendorPageClicks = 1;
                    }

                    //purpose page
                    const purposeLink = document.getElementById("qc-cmp-purpose-button");
                    if (purposeLink && purposeLink.offsetHeight !== 0) {
                        intermediateData.purposePageClicks = 1;
                        // purposeLink.click() //TODO perhaps move somewhere else?
                    }

                    //TODO figure out transition logic:
                    // if purposeLink, click purposeLink.
                    // else if !purposeLink && vendorLink, click vendorLink.
                    // else if !purposeLinkg && !vendorLink, done

                    return template
                }

            }
        }, {
            waitFor: async function(page) {

                //TODO based on previous transition logic, might have to wait for different element here.
                // For current testing purposes, I simply wait for purpose page to appear after clicking purposeLink
                await page.waitFor('#qc-cmp-purpose-button');
                await page.click('#qc-cmp-purpose-button');
                await page.waitFor('#qcCmpPurposesContainer');

            },
            extract: function(template) {
                //rejectAll on second page
                if (template.rejectAllConsent.present === null) {
                    const rejectAllButton = document.querySelector("button[onclick='window.__cmpui(\"disableAllPurposeConsents\")']");
                    if (rejectAllButton && rejectAllButton.offsetHeight !== 0) {
                        template.rejectAllConsent.present = true;
                        template.rejectAllConsent.buttonText = rejectAllButton.innerText;
                        template.rejectAllConsent.clicksRequiredToAccess = intermediateData.purposePageClicks;
                    }
                }

                //purposes
                const allPurposes = document.querySelectorAll('#qcCmpPurposesContainer .qc-cmp-purpose-info'); //NOTE: this currently also selects the 'features', which I'm unsure if they count as purposes (and need consent) or are something else
                for (const purpose of allPurposes) {
                    const name = purpose.querySelector(".qc-cmp-bold-messaging").innerText;
                    const description = purpose.querySelector(".qc-cmp-purpose-description").innerText;
                    const clicksRequiredToAccess = intermediateData.purposePageClicks;

                    let hasConsentOption = null;
                    let consentOptionDisabled = null;
                    let consentOptionDefaultStatus = null;
                    if (purpose.querySelector(".qc-cmp-toggle-off")) {
                        hasConsentOption = true;
                        consentOptionDisabled = false;
                        consentOptionDefaultStatus = false;
                    } else if (purpose.querySelector(".qc-cmp-toggle-on")) {
                        hasConsentOption = true;
                        consentOptionDisabled = false;
                        consentOptionDefaultStatus = true;
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

                //TODO figure out transition logic:
                // if (intermediateData.vendorClicks === 1, && vendorLinkOnThisPage) {vendorLinkOnThisPage.click()}
                // if (!intermediateData.vendorClicks && vendorLinkOnThisPage), {vendorClicks = 2; vendorLinkOnThisPage.click()}
                // else (do nothing > vendor page does not exist)

                const vendorLink = document.querySelector("a[onclick='window.__cmpui(\"updateConsentUi\",3)']");
                if (vendorLink && vendorLink.offsetHeight !== 0) {
                    if (!intermediateData.vendorPageClicks) {
                        intermediateData.vendorPageClicks = 2
                    }
                    vendorLink.click()
                }

                return template;
            }
        },{
            waitFor: async function(page) {
                await page.waitFor('#qcCmpPartnerInfo');
            },
            extract: function(template) {
                //rejectAll on third page
                if (template.rejectAllConsent.present === null) {
                    const rejectAllButton = document.querySelector("'button[onclick='window.__cmpui(\"toggleAllVendorConsents\",!1)']");
                    if (rejectAllButton && rejectAllButton.offsetHeight !== 0) {
                        template.rejectAllConsent.present = true;
                        template.rejectAllConsent.buttonText = rejectAllButton.innerText;
                        template.rejectAllConsent.clicksRequiredToAccess = intermediateData.vendorPageClicks;
                    }
                }

                //vendor
                const allVendors = document.querySelectorAll('.qc-cmp-table-row.qc-cmp-vendor-row');
                for (const vendor of allVendors) {
                    const name = vendor.innerText;
                    //TODO: purposeCategory is an ugly long string of smushed together purposes now.. make it an array?
                    const purposeCategory = vendor.nextSibling.querySelector('.qc-cmp-vendor-info-list').innerText;
                    const description = vendor.nextSibling.querySelector('.qc-cmp-vendor-info-content').innerText;
                    const clicksRequiredToAccess = intermediateData.vendorPageClicks;

                    //TODO check if the consentOptionDisabled logic is correct > find a test website that has them disabled
                    let hasConsentOption = null;
                    let consentOptionDisabled = null;
                    let consentOptionDefaultStatus = null;
                    if (vendor.querySelector('.qc-cmp-toggle-off')) {
                        hasConsentOption = true;
                        consentOptionDefaultStatus = false;
                        consentOptionDisabled = vendor.querySelector('.qc-cmp-toggle').disabled || vendor.querySelector('.qc-cmp-toggle').disabled === 'disabled';
                    } else if (vendor.querySelector('.qc-cmp-toggle-on')) {
                        hasConsentOption = true;
                        consentOptionDisabled = vendor.querySelector('.qc-cmp-toggle').disabled || vendor.querySelector('.qc-cmp-toggle').disabled === 'disabled';
                        consentOptionDefaultStatus = true;
                    } else {
                        hasConsentOption = false;
                    }

                    template.vendorConsent.push({
                        'name': name,
                        'description': description,
                        'clicksRequiredToAccess': clicksRequiredToAccess,
                        'hasConsentOption': hasConsentOption,
                        'consentOptionDisabled': consentOptionDisabled,
                        'consentOptionDefaultStatus': consentOptionDefaultStatus,
                        'purposeCategory': purposeCategory
                    })
                }
                return template;
            }
        }
    ],

    screenshotAfterWaitFor: true,

};