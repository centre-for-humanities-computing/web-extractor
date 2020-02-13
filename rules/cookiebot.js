const template = require('./__cmp-data-template');

module.exports = {

    cmpName: 'Cookiebot',

    waitFor: undefined,

    extractor: function(template) {

        let element = document.querySelector('#CybotCookiebotDialog');

        if (element) {
            //all HTML
            template.html = element.innerHTML;

            //notification style
            const width = element.style.width;
            if (width === '100%') {
                template.notificationStyle = 'banner'
            } else if (width === 'auto') {
                template.notificationStyle = 'barrier'
            } else {
                template.notificationStyle = 'custom'
            }

            //consent action
            if (window.CookieConsent.dialog.consentLevel === 'implied') {
                template.consent.type = 'implied';
                checkConsentAction()
            } else if (window.CookieConsent.dialog.consentLevel === 'strict') {
                template.consent.type = 'explicit';
            }

            function checkConsentAction() {
                if (window.CookieConsent.dialog.impliedConsentOnRefresh) {
                    template.consent.impliedConsentAction.refreshPage = true
                }
                if (window.CookieConsent.dialog.impliedConsentOnScroll) {
                    template.consent.impliedConsentAction.scrollPage = true
                }
            }

            //accept+reject buttons: cookiebot has two divs with different consent options that are either hidden or displayed
            const dialogBodyButtonsDisplay = document.getElementById("CybotCookiebotDialogBodyButtons").style.display;
            const dialogBodyLevelWrapperDisplay = document.getElementById("CybotCookiebotDialogBodyLevelWrapper").style.display;

            if (dialogBodyButtonsDisplay !== 'none') {
                const acceptBtn = document.getElementById('CybotCookiebotDialogBodyButtonAccept');
                const rejectBtn = document.getElementById('CybotCookiebotDialogBodyButtonDecline');

                if (acceptBtn.style.display !== 'none') {
                    template.acceptAllConsent.present = true;
                    template.acceptAllConsent.label = acceptBtn.innerText;
                    template.acceptAllConsent.clicks = 0;
                }

                if (rejectBtn.style.display !== 'none') {
                    template.rejectAllConsent.present = true;
                    template.rejectAllConsent.label = rejectBtn.innerText;
                    template.rejectAllConsent.clicks = 0;
                }
            } else if (dialogBodyLevelWrapperDisplay !== 'none') {
                const acceptBtn = document.getElementById( 'CybotCookiebotDialogBodyLevelButtonAccept');
                template.acceptAllConsent.present = true;
                template.acceptAllConsent.label = acceptBtn.innerText;
                template.acceptAllConsent.clicks = 0;
            }

            //bulk description
            template.bulkDescription = document.getElementById('CybotCookiebotDialogBodyContentText').innerText;
            //bulk description HTML
            template.bulkDescriptionHTML = document.getElementById('CybotCookiebotDialogBodyContentText').innerHTML;

            //purposes
            const purposeElementOnFirstPage = document.getElementById("CybotCookiebotDialogBodyLevelWrapper");
            const purposeElementOnSecondPage = document.getElementById('CybotCookiebotDialogDetailBodyContentCookieContainerTypes');


            //getPurposeInfoFirstPage
            //getPurposeInfoSecondPage
            //mergePurposeInfo



            if (purposeElementOnFirstPage.style.display !== 'none' && purposeElementOnFirstPage.style.display !== '') {
                const allPurposesOnFirstPage = document.getElementById('CybotCookiebotDialogBodyLevelButtonsSelectPane').children

                for (const purpose of allPurposesOnFirstPage) {
                    const label = purpose.querySelector('label').innerText;
                    const hasConsentOption = true;
                    const consentOptionDisabled = purpose.querySelector('input').disabled;
                    const consentOptionDefaultStatus = purpose.querySelector('input').checked;
                    const clicks = 0;
                    const descriptionId = '#' + purpose.querySelector('input').id.replace('BodyLevelButton', 'DetailBodyContentCookieTabs');
                    const description = document.querySelector(descriptionId + " .CybotCookiebotDialogDetailBodyContentCookieTypeIntro").innerText;

                    template.purposeConsent.push({'name': label, 'description': description, 'clicksRequiredToAccess': clicks, 'hasConsentOption': hasConsentOption, 'consentOptionDisabled': consentOptionDisabled, 'consentOptionDefaultStatus': consentOptionDefaultStatus})
                }

                //now that we have all the info from the first page, we have to augment this with the purposes from the 2nd page
                for (const purpose of purposeElementOnSecondPage.children) {
                    let label = purpose.innerText.split(' ')[0].trim();
                    let purposeAlreadyExists = template.purposeConsent.filter(existingPurpose => existingPurpose.name === label);

                    if (!purposeAlreadyExists.length) {
                        const purposeData = getSecondPagePurposeDetail(purpose)
                        template.purposeConsent.push(purposeData)
                    }
                }
            } else if (purposeElementOnSecondPage) {
                const allPurposesOnSecondPage = purposeElementOnSecondPage.children;
                for (const purpose of allPurposesOnSecondPage) {
                    const purposeData = getSecondPagePurposeDetail(purpose);
                    template.purposeConsent.push(purposeData)
                }
            }

            //this function extracts the purpose information from the second page and returns it as an object
            function getSecondPagePurposeDetail(purpose) {
                let label = purpose.innerText.split(' ')[0].trim();
                let hasConsentOption = null;
                let consentOptionDisabled = null;
                let consentOptionDefaultStatus = null;
                const clicks = 1;

                if (!purpose.querySelector('a .CybotCookiebotDialogBodyLevelButton')) {
                    hasConsentOption = false
                } else {
                    consentOptionDisabled = purpose.querySelector('a .CybotCookiebotDialogBodyLevelButton').disabled;
                    consentOptionDefaultStatus = purpose.querySelector('a .CybotCookiebotDialogBodyLevelButton').checked;
                    hasConsentOption = true
                }

                const descriptionId = '#' + purpose.id.replace('Container', 'Tabs');
                const description = document.querySelector(descriptionId + " .CybotCookiebotDialogDetailBodyContentCookieTypeIntro").innerText;

                return {'name': label, 'description': description,  'clicksRequiredToAccess': clicks, 'hasConsentOption': hasConsentOption, 'consentOptionDisabled': consentOptionDisabled, 'consentOptionDefaultStatus': consentOptionDefaultStatus};
            }

            function getVendorDetail(purpose) {

            }


            //vendor
            // let vendors = purposeElementOnSecondPage.querySelectorAll("tbody tr")
            // vendorLabels.map(function(vendor) {
            //     var vendorLabel = vendor.childNodes[0].innerText.replace(/\./g,'_');
            //     CookieConsentObject.vendorLabels.push({[vendorLabel]: categoryLabel})
            //     if (vendor.childNodes.length > 1) {
            //         CookieConsentObject.vendorDescriptions.push({[vendorLabel]: vendor.childNodes[2].innerText})
            //         CookieConsentObject.vendorEnabled.push({[vendorLabel]: 'disabled'})
            //     } else {
            //         CookieConsentObject.vendorDescriptions.push({[vendorLabel]: 'NA'})
            //         CookieConsentObject.vendorEnabled.push({[vendorLabel]: 'NA'})
            //     }
            //     CookieConsentObject.vendorDefaultStatus.push({[vendorLabel]: 'NA'})
            // })

            return template;
        }


    },
    screenshotAfterWaitFor: true,

    dataTemplate: function() {
        return template;
    }
}

;