const template = require('./__cmp-data-template');

module.exports = {

    cmpName: 'crownpeak',

    dataTemplate: function() {
        return template;
    },

    extractor: [
        {
            waitFor: async function (page) {
                await page.waitForFunction(() => {
                        return document.querySelectorAll('#_evidon_banner, #_evidon-banner').length
                    }, {timeout:10000}
                );
            },
            extract: function (template) {

                let cmpSelectors = ['#_evidon_banner', '#_evidon-banner'];
                let element;
                for (let selector of cmpSelectors) {
                    element = document.querySelector(selector);
                    if (element) {
                        break;
                    }
                }

                if (element) {
                    //all HTML
                    function getHTML(selector) {
                        template.html = document.querySelector(selector).outerHTML;
                    }

                    //notification style
                    if (window.evidon.notice.consentTypeId === 2) {
                        template.notificationStyle = 'banner';
                        getHTML('#_evidon_banner');
                        getBulkDescription('#_evidon-message');
                    } else if (window.evidon.notice.consentTypeId === 3) {
                        template.notificationStyle = 'barrier';
                        getHTML('#_evidon-banner');

                        const cookieMessage = document.getElementById('_evidon-banner-cookiemessage');
                        const acceptMessage = document.getElementById("_evidon-banner-acceptmessage")
                        if (cookieMessage && cookieMessage.style.display !== 'none') {
                            getBulkDescription('#_evidon-banner-cookiemessage');
                        } else if (acceptMessage && acceptMessage.style.display !== 'none') {
                            getBulkDescription('#_evidon-banner-acceptmessage');
                        }
                    }

                    //consent
                    const closePopup = window.evidon.notice.closeConsentEnabled;
                    const navigatePage = window.evidon.notice.navigationConsentEnabled;
                    const clickPage = window.evidon.notice.pageclickConsentEnabled; //adobe.com
                    const scrollPage = window.evidon.notice.scrollConsentEnabled; //livenation.co.uk

                    const closeButton = document.querySelector('#__ghostery-close-icon-svg');

                    //TODO answer question below:
                    //there is no unambiguous measurement of whether consent is explicit or not, so leave it null?
                    //other option is to assume good faith and, if none of the previous if statements === true, assume consent.type = explicit
                    template.consent.type = 'explicit';

                    if (template.notificationStyle === 'banner' && closeButton && closePopup) {
                        template.consent.type = 'implied';
                        template.consent.impliedConsentAction.closePopup = true
                    }

                    if (navigatePage) {
                        template.consent.type = 'implied';
                        template.consent.impliedConsentAction.navigatePage = true
                    }

                    if (clickPage) {
                        template.consent.type = 'implied';
                        template.consent.impliedConsentAction.clickPage = true
                    }

                    if (scrollPage) {
                        template.consent.type = 'implied';
                        template.consent.impliedConsentAction.scrollPage = true
                    }




                    //accept+reject buttons
                    function getButtonInfo(buttonArray, objectName) {
                        for (let buttonObject of buttonArray) {
                            let button = document.querySelector(buttonObject.selector);
                            if (button) {
                                template[objectName].present = true;
                                template[objectName].buttonText = button.innerText;
                                template[objectName].clicksRequiredToAccess = buttonObject.clicksRequiredToAccess;
                                break;
                            }
                        }
                    }

                    //accept
                    let acceptButtonDetails = [{selector:'#_evidon-accept-button',clicksRequiredToAccess: 0},
                                                 {selector:'#_evidon-banner-acceptbutton', clicksRequiredToAccess: 0}];
                    getButtonInfo(acceptButtonDetails, 'acceptAllConsent');

                    //reject
                    //TODO verify that these are not identifying always-hidden reject buttons
                    let rejectButtonDetails = [{selector:'#_evidon-decline-button', clicksRequiredToAccess: 0},
                                                 {selector:'#_evidon-banner-declinebutton', clicksRequiredToAccess: 0}];
                    getButtonInfo(rejectButtonDetails, 'rejectAllConsent');

                    //bulk description
                    function getBulkDescription(selector) {
                        template.bulkDescription = document.querySelector(selector).innerText
                        template.bulkDescriptionHTML = document.querySelector(selector).innerHTML
                    }


                    ///////////////////// BELOW FOR INFO FROM SECOND PAGE ////////////////////////
                    // go to next page
                    // let allNextButtonSelectors = ['a[onclick=\'event.preventDefault(); window.evidon.notice.showConsentTool();\']', //same page iframe
                    //                               '#_evidon-option-button', //
                    //                               '#_evidon-banner-cookiebutton'];
                    // for (const nextButtonSelector of allNextButtonSelectors) {
                    //     const nextButton = document.querySelector(nextButtonSelector)
                    //     if (nextButton) {
                    //         nextButton.click()
                    //         break;
                    //     }
                    // }

                }

                return template;
            }
        }//,  {
        //     waitFor: async function(page) {
        //         // let l2Page = await page.$('#_evidon-banner-cookiebuttontext');
        //         // console.log(l2Page.jsonValue())
        //         // page.click(l2Page.jsonValue());
        //         await page.click('#_evidon-banner-cookiebuttontext');
        //         await page.waitFor('#_evidon-banner-l2', {timeout: 5000});
        //
        //
        //     }, extract: function(template) {
        //
        //         function getButtonInfo(buttonArray, objectName) {
        //             for (let buttonObject of buttonArray) {
        //                 let button = document.querySelector(buttonObject.selector);
        //                 if (button) {
        //                     template[objectName].present = true;
        //                     template[objectName].buttonText = button.innerText;
        //                     template[objectName].clicksRequiredToAccess = buttonObject.clicksRequiredToAccess;
        //                     break;
        //                 }
        //             }
        //         }
        //         const acceptButtonDetails = [{selector: '#evidon-l2-acceopt-button', clicksRequiredToAccess: 1}] //TODO verify that this 'acceopt' typo is universal?;
        //         const rejectButtonDetails = [{selector: '#evidon-l2-decline-button', clicksRequiredToAccess: 1}]
        //         template.vendorConsent.push(document.querySelector('#evidon-l2-decline-button'))
        //         getButtonInfo(acceptButtonDetails, 'acceptAllConsent');
        //         getButtonInfo(rejectButtonDetails, 'acceptAllConsent');
        //
        //
        //         return template
        //
        //     }
        // }, {
        //     waitFor: async function(page) {
        //
        //         //there are two possible pages after the click()
        //         //either the category/vendor iframe (e.g., economist)
        //         //or the weird intermediate screen with an accept/reject button and a link to the category/vendor iframe on a separate page
        //         //The next step is to extract the url of both and scrape those pages
        //
        //         const JSHandleURL = await page.waitForFunction(() => {
        //             let URLs = document.querySelectorAll('iframe[src*="l3.evidon"], [href*="l3.evidon"]');
        //             if (URLs.length > 0 && URLs[0].href) {
        //                 return URLs[0].href
        //             } else if (URLs.length > 0 && URLs[0].src) {
        //                 return URLs[0].src
        //             }
        //         }, {polling: 100, timeout:10000});
        //
        //         let URL = await JSHandleURL.jsonValue();
        //
        //         const response = await page.goto(URL);
        //
        //         if (response.status() < 200 ||response.status() > 226) {
        //             // throw new error.HttpError(response.status());
        //             //TODO make this a proper http error
        //             throw new Error('HTTPError: ' + response.status());
        //         }
        //
        //
        //     }, extract: function(template) {
        //         template.purposeConsent.push(true)
        //         // const l2Page = document.querySelector('[href*="l3.evidon"]');
        //         // const l3Page = document.querySelector('iframe[src*="l3.evidon"]');
        //         //
        //         // let clicksCounter
        //         //
        //         // if (l2Page) {
        //         //     clicksCounter = 1
        //         // }
        //         //
        //         //
        //         // if (document.body.querySelectorAll(".category-group").length > 0) {
        //         //     category = document.body.querySelectorAll(".category-group")
        //         //     getCategoryGroupInfo(category)
        //         // } else if (document.body.querySelectorAll(".thirdparty-category-header").length > 0) {
        //         //     categoryConsent = 'present'
        //         //     categoryConsentClicks = clickCounter
        //         //     category = document.body.querySelectorAll(".thirdparty-category")
        //         //     getThirdPartyCategoryInfo(category)
        //         // }
        //         //
        //
        //         return template
        //
        //     }
        // }
    ],

    screenshotAfterWaitFor: true,

};