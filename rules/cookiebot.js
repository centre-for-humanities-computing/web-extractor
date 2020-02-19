//TODO simulate clicks on each element and take screenshots of each
//TODO add the weird 'features' on the IAB tab to the purpose array
//TODO perhaps remove provider, expiryDate, type from vendor info, since this info isn't available for any other CMP
const template = require('./__cmp-data-template');

module.exports = {

    cmpName: 'Cookiebot',

    dataTemplate: function() {
        return template;
    },

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

            //consent
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
                    template.acceptAllConsent.buttonText = acceptBtn.innerText;
                    template.acceptAllConsent.clicksRequiredToAccess = 0;
                }

                if (rejectBtn.style.display !== 'none') {
                    template.rejectAllConsent.present = true;
                    template.rejectAllConsent.buttonText = rejectBtn.innerText;
                    template.rejectAllConsent.clicksRequiredToAccess = 0;
                }
            } else if (dialogBodyLevelWrapperDisplay !== 'none') {
                const acceptBtn = document.getElementById('CybotCookiebotDialogBodyLevelButtonAccept');
                template.acceptAllConsent.present = true;
                template.acceptAllConsent.buttonText = acceptBtn.innerText;
                template.acceptAllConsent.clicksRequiredToAccess = 0;
            }

            //bulk description
            template.bulkDescription = document.getElementById('CybotCookiebotDialogBodyContentText').innerText;
            //bulk description HTML
            template.bulkDescriptionHTML = document.getElementById('CybotCookiebotDialogBodyContentText').innerHTML;

            //purposes
            const purposeElementOnFirstPage = document.getElementById("CybotCookiebotDialogBodyLevelWrapper");
            let purposeInfoFromFirstPage = [];
            if (window.getComputedStyle(purposeElementOnFirstPage).display !== 'none') {
                const allPurposesOnFirstPage = document.getElementById('CybotCookiebotDialogBodyLevelButtonsSelectPane').children;

                for (const purpose of allPurposesOnFirstPage) {
                    const name = purpose.querySelector('label').innerText;
                    const hasConsentOption = true;
                    const consentOptionDisabled = purpose.querySelector('input').disabled;
                    const consentOptionDefaultStatus = purpose.querySelector('input').checked;
                    const clicksRequiredToAccess = 0;
                    purposeInfoFromFirstPage.push({
                        'name': name,
                        'clicksRequiredToAccess': clicksRequiredToAccess,
                        'hasConsentOption': hasConsentOption,
                        'consentOptionDisabled': consentOptionDisabled,
                        'consentOptionDefaultStatus': consentOptionDefaultStatus
                    })
                }
            }

            const purposeElementOnSecondPage = document.getElementById('CybotCookiebotDialogDetailBodyContentCookieContainerTypes');
            let purposeInfoFromSecondPage = [];
            if (window.getComputedStyle(purposeElementOnSecondPage).display !== 'none') {
                const allPurposesOnSecondPage = purposeElementOnSecondPage.children;
                for (const purpose of allPurposesOnSecondPage) {
                    const name = purpose.innerText.split(' ')[0].trim();
                    let hasConsentOption = null;
                    let consentOptionDisabled = null;
                    let consentOptionDefaultStatus = null;
                    const clicksRequiredToAccess = 1;

                    if (!purpose.querySelector('a .CybotCookiebotDialogBodyLevelButton')) {
                        hasConsentOption = false
                    } else {
                        consentOptionDisabled = purpose.querySelector('a .CybotCookiebotDialogBodyLevelButton').disabled;
                        consentOptionDefaultStatus = purpose.querySelector('a .CybotCookiebotDialogBodyLevelButton').checked;
                        hasConsentOption = true
                    }

                    const descriptionId = '#' + purpose.id.replace('Container', 'Tabs');
                    const description = document.querySelector(descriptionId + " .CybotCookiebotDialogDetailBodyContentCookieTypeIntro").innerText;

                    purposeInfoFromSecondPage.push({
                        'name': name,
                        'description': description,
                        'clicksRequiredToAccess': clicksRequiredToAccess,
                        'hasConsentOption': hasConsentOption,
                        'consentOptionDisabled': consentOptionDisabled,
                        'consentOptionDefaultStatus': consentOptionDefaultStatus
                    })
                }
            }

            const IABPage = document.querySelector('#CybotCookiebotDialogDetailBodyContentTabsIAB');
            let purposeInfoFromIABPage = [];

            if (window.getComputedStyle(IABPage).display !== 'none') {
                //get purposes
                const IABpurposes = document.querySelectorAll('.CybotCookiebotDialogBodyIABButtonPurposes');
                for (const IABPurpose of IABpurposes) {
                    const name = IABPurpose.parentElement.querySelector('label').innerText;
                    const description = IABPurpose.parentElement.nextElementSibling.innerText;
                    const clicksRequiredToAccess = 2;
                    const consentOptionDisabled = IABPurpose.disabled;
                    const consentOptionDefaultStatus = IABPurpose.checked;

                    let hasConsentOption = null;
                    if (IABPurpose.type === 'checkbox') {
                        hasConsentOption = true;
                    }

                    purposeInfoFromIABPage.push({
                        'name': name,
                        'description': description,
                        'clicksRequiredToAccess': clicksRequiredToAccess,
                        'hasConsentOption': hasConsentOption,
                        'consentOptionDisabled': consentOptionDisabled,
                        'consentOptionDefaultStatus': consentOptionDefaultStatus
                    })
                }

                const IABvendors = document.querySelectorAll('.CybotCookiebotDialogBodyIABButtonVendors');
                for (const IABvendor of IABvendors) {
                    const name = IABvendor.parentElement.querySelector('label').innerText;
                    const description = IABvendor.parentElement.nextElementSibling.innerHTML;
                    const clicksRequiredToAccess = 2;
                    const consentOptionDisabled = IABvendor.disabled;
                    const consentOptionDefaultStatus = IABvendor.checked;

                    let hasConsentOption = null;
                    if (IABvendor.type === 'checkbox') {
                        hasConsentOption = true;
                    }

                    template.vendorConsent.push({
                        'name': name,
                        'description': description,
                        'clicksRequiredToAccess': clicksRequiredToAccess,
                        'hasConsentOption': hasConsentOption,
                        'consentOptionDisabled': consentOptionDisabled,
                        'consentOptionDefaultStatus': consentOptionDefaultStatus,
                        'purposeCategory': [] //AFAIK, no way of knowing which purpose this vendor belongs to
                    })
                }
            }

            function findMergeableIndex(object1, remainingObjects) {
                for (var i = 0; i < remainingObjects.length; i++) {
                    let object = remainingObjects[i];
                    for (let [key, value] of Object.entries(object)) {
                        if (object1[key] == value) {
                            return i
                        }
                    }
                }
                return -1
            }

            function mergex(array1, array2) {
                let remainingObjects = [...array2];
                let result = [];
                for (let object1 of array1) {
                    let mergeableIndex = findMergeableIndex(object1, remainingObjects);
                    if (mergeableIndex >= 0) {
                        let mergeableObject = remainingObjects[mergeableIndex];
                        // array.splice(start_index, no_of_elements)
                        remainingObjects.splice(mergeableIndex, 1);
                        //merge
                        for (let key in object1) {
                            mergeableObject[key] = object1[key]
                        }
                        result.push(mergeableObject)
                    } else {
                        result.push(object1)
                    }
                }
                //adding all non-duplicates
                for (let remainingObject of remainingObjects) {
                    result.push(remainingObject)
                }

                return result
            }

            //merge the info of the different purpose pages and push them to the template object
            if (purposeInfoFromFirstPage.length && purposeInfoFromSecondPage.length && purposeInfoFromIABPage.length) {
                let firstMerge = mergex(purposeInfoFromFirstPage, purposeInfoFromSecondPage);
                let concatenatedArray = firstMerge.concat(purposeInfoFromIABPage);
                template.purposeConsent.push(concatenatedArray)
            } else if (purposeInfoFromFirstPage.length && purposeInfoFromSecondPage.length) {
                let mergedPurposeInfo = mergex(purposeInfoFromFirstPage, purposeInfoFromSecondPage);
                template.purposeConsent.push(mergedPurposeInfo)
            } else if (!purposeInfoFromFirstPage.length && purposeInfoFromIABPage.length) {
                let concatenatedArray = purposeInfoFromSecondPage.concat(purposeInfoFromIABPage);
                template.purposeConsent.push(concatenatedArray)
            } else if (!purposeInfoFromFirstPage.length) {
                template.purposeConsent.push(purposeInfoFromSecondPage)
            } else if (!purposeInfoFromSecondPage.length && purposeInfoFromIABPage.length) {
                let concatenatedArray = purposeInfoFromFirstPage.concat(purposeInfoFromIABPage);
                template.purposeConsent.push(concatenatedArray)
            } else if (!purposeInfoFromSecondPage.length) {
                template.purposeConsent.push(purposeInfoFromFirstPage)
            }

            return template;
        }


    },
    screenshotAfterWaitFor: true,
}

;