const template = {
    html: null,
    descriptionPresent: false,
    preselectedValues: true
};

module.exports = {
    cmpName: 'test', //required

    dataTemplate: function () { // optional
        /* EXAMPLE */
        return template;
    },

    extractor: {
        extract: function (template) {
            let res = {
                cmp: null,
                acceptAll: null,
                rejectAll: null
            };
            //check which CMP
            //check buttons
            //return
            if (document.querySelector('#CybotCookiebotDialog')) {
                res.cmp = 'cookiebot';

                //accept+reject buttons: cookiebot has two divs with different consent options that are either hidden or displayed
                const dialogBodyButtonsDisplay = document.getElementById("CybotCookiebotDialogBodyButtons").style.display;
                const dialogBodyLevelWrapperDisplay = document.getElementById("CybotCookiebotDialogBodyLevelWrapper").style.display;

                if (dialogBodyButtonsDisplay !== 'none') {
                    const acceptBtn = document.getElementById('CybotCookiebotDialogBodyButtonAccept');
                    const rejectBtn = document.getElementById('CybotCookiebotDialogBodyButtonDecline');

                    if (acceptBtn.style.display !== 'none') {
                        res.acceptAll = true;
                    }

                    if (rejectBtn.style.display !== 'none') {
                        template.rejectAll = true;
                    }
                } else if (dialogBodyLevelWrapperDisplay !== 'none') {
                    const acceptBtn = document.getElementById('CybotCookiebotDialogBodyLevelButtonAccept');
                    res.acceptAll = true;
                }


            } else if (document.querySelector('.optanon-alert-box-wrapper')) {
                res.cmp = 'onetrust';

                //accept TODO verify that this works
                const allAcceptButtons = document.querySelectorAll('.optanon-allow-all');
                for (const acceptButton of allAcceptButtons) {
                    if (acceptButton.style.display !== 'none' && acceptButton.offsetHeight !== 0) {
                        res.acceptAll = true;
                    }
                }
                //reject
                //Onetrust does not have a reject all option, afawk
                res.rejectAll = false;

            } else if (document.querySelector('#qcCmpUi')) {
                res.cmp = 'quantcast';

                //accept all
                if (document.querySelector(`#qcCmpButtons button[onclick='window.__cmpui("setAndSaveAllConsent",!0)']`)
                    && document.querySelector(`#qcCmpButtons button[onclick='window.__cmpui("setAndSaveAllConsent",!0)']`).offsetHeight !== 0) {
                    res.acceptAll = true;
                }

                //reject all
                if (document.querySelector(".qc-cmp-button.qc-cmp-secondary-button") && document.querySelector(".qc-cmp-button.qc-cmp-secondary-button").offsetHeight !== 0
                    && document.querySelector(".qc-cmp-button.qc-cmp-secondary-button").innerText.toLowerCase() !== "more options") {
                    res.rejectAll = true;

                }

            } else if (document.querySelector('#_evidon_banner') || document.querySelector('#_evidon-banner')) {
                res.cmp = 'crownpeak';

                if (document.querySelector("#_evidon-accept-button")) {
                    res.acceptAll = true;
                } else if (document.querySelector("#_evidon-banner-acceptbutton")) {
                    res.acceptAll = true;
                }

                if (document.querySelector("#_evidon-decline-button")) {
                    res.rejectAll = true;
                } else if (document.querySelector("#_evidon-banner-declinebutton")) {
                    res.rejectAll = true;
                }

            } else if (document.querySelector('#truste-consent-track') || document.querySelector('.truste_box_overlay') || document.querySelector('#teconsent')) {
                res.cmp = 'trustarc';

                if (document.querySelector(".mainContent .call")) {
                    res.acceptAll = true;
                } else if (document.querySelector('#truste-consent-button') && document.querySelector('#truste-consent-button').innerText.length > 1) {
                    res.acceptAll = true;
                }

                if (document.querySelector('#truste-consent-required')) {
                    res.rejectAll = true;
                }


            } else if (document.querySelector('#coiConsentBanner') || document.querySelector('#coi-cookie') || document.querySelector('#coi-banner-wrapper')) {
                res.cmp = 'cookieinformation';

                //acceptAll
                if (document.querySelector(".coi-consent-banner__agree-button") || document.querySelector(".coi-banner__accept") || document.querySelector(".coi-accept-btn") || document.querySelector("a[onkeypress='javascript:CookieInformation.submitAllCategories();']")) {
                    res.acceptAll = true;
                }


                //rejectAll
                if (document.querySelector(".coi-consent-banner__decline-button") || document.querySelector(".coi-banner__decline") || document.querySelector("c-decline")) {
                    res.acceptAll = true;
                }

            } else {
                res.cmp = false
            }


            res.html = document.innerHTML;

            return res;
        }
    }
};