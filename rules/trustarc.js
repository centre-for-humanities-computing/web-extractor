//TODO make sure this has waitFor because TrustArc is slow to load

const template = require('./__cmp-data-template');

module.exports = {

    cmpName: 'trustarc',

    dataTemplate: function() {
        return template;
    },

    extractor: [{
        waitFor: async function (page) {
            await page.waitForFunction(() => {
                    return document.querySelectorAll('#truste-consent-track, .truste_box_overlay, #teconsent').length
                }, {timeout: 10000}
            );
        },
        extract: function (template) {

            let cmpSelectors = ['#truste-consent-track', '.truste_box_overlay', '#teconsent'];
            let element;
            for (let selector of cmpSelectors) {
                element = document.querySelector(selector);
                if (element) {
                    break;
                }
            }

            if (element) {
                //all HTML
                template.html = element.outerHTML;

                //notification style
                if (element.id === "truste-consent-track") {
                    template.notificationStyle = "banner"

                    getBannerInfo();
                } else if (element.classList.contains("truste_box_overlay")) {
                    template.notificationStyle = "barrier"
                    getBarrierInfo();
                } //else if (document.getElementById("teconsent")) {
                // template.notificationStyle = "NA"
                //}

                //TODO check if this actually detects anything
                let iframeURL = element.querySelector('[id*="pop-frame"]')

                function getBannerInfo() {
                    //bulk description
                    let bulkDescription = document.querySelector('#truste-consent-text')
                    template.bulkDescription = bulkDescription.innerText;
                    template.bulkDescriptionHTML = bulkDescription.innerHTML;

                    //reject all
                    let rejectAll = element.querySelector('#truste-consent-required'); //only seen in https://www.cognizant.com/en-dk/
                    if (rejectAll) {
                        template.rejectAllConsent.present = true;
                        template.rejectAllConsent.buttonText = rejectAll.innerText;
                        template.rejectAllConsent.clicksRequiredToAccess = 0
                    }

                    //accept all
                    //the accept button and close button use almost the same code, so I have to check that it has some text and that that text has more than 1 character (in the case they use X as an icon).
                    // It might be possible that there are some accept buttons that have a child element and the text is in there, which will result in a false negative in this case (but I haven't seen this anywhere in my check of 86 sites)
                    let acceptAll = element.querySelector('#truste-consent-button')
                    if (acceptAll && acceptAll.innerText.length > 1) {
                        template.acceptAllConsent.present = true;
                        template.acceptAllConsent.buttonText = acceptAll.innerText;
                        template.acceptAllConsent.clicksRequiredToAccess = 0
                    }

                    let showMoreButton = element.querySelector('#truste-show-consent')
                    if (showMoreButton) {
                        //there are more consent options
                    }

                    //get iframeURL
                }

                function getBarrierInfo() {
                    //barriers are iframes, so to get more info we have to query inside the iframe
                }

                //consent type
                //another way of detecting is by checking the iframe src and whether it has implied or expressed in it.
                //TODO verify that this accruately captures consent type
                let consentType = truste.eu.bindMap.behavior
                if (consentType === 'implied') {
                    template.consent.type = 'implied'
                    template.consent.impliedConsentAction.visitPage = true;
                } else if (consentType === 'expressed') {
                    template.consent.type = 'explicit'
                }

                //if more option button is available
                // let moreOptionButton = element.getElementById("truste-show-consent")
                // if (moreOptionButton) {
                //     moreOptionButton.click()
                // }

            }

            return template;
        }
    }//, {
        // waitFor: async function (page) {
        // },
        // extract:  function (template) {
        //}
        // }
    //}
    ],

    screenshotAfterWaitFor: true,


};