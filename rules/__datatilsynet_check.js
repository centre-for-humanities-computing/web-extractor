module.exports = {
    cmpName: 'test', //required

    extractor: {
        extract: function () {
            let res = {
                cmp: null,
                acceptAll: null,
                rejectAll: null,
                html: null
            };

            if (document.querySelector('#CybotCookiebotDialog')) {
                //verified
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
                        res.rejectAll = true;
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
                if (document.querySelector("#qcCmpButtons button[onclick*=\'window.__cmpui(\"setAndSaveAllConsent\",!0)\']")
                    && document.querySelector("#qcCmpButtons button[onclick*=\'window.__cmpui(\"setAndSaveAllConsent\",!0)\']").offsetHeight !== 0) {
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

                //accept
                let acceptBtnSelectors = ['[onclick="CookieInformation.submitAllCategories();"]', '[onkeypress="javascript:CookieInformation.submitAllCategories();"]', '.c-decline', '.coi-banner__accept', '.coi-consent-banner__agree-button']; //perhaps overkill, most decline buttons have two of these
                for (const selector of acceptBtnSelectors) {
                    const acceptBtn = document.querySelector(selector);
                    if (acceptBtn) {
                        res.acceptAll = true;
                        break
                    }
                }

                //reject
                let rejectBtnSelectors = ['[onclick="CookieInformation.declineAllCategories()"]', '[onkeypress="javascript:CookieConsent.dialog.submitDecline();"]', '.c-decline', '#declineButton', '.coi-consent-banner__decline-button']; //perhaps overkill, most decline buttons have two of these
                for (const selector of rejectBtnSelectors) {
                    const rejectBtn = document.querySelector(selector);
                    if (rejectBtn) {
                        res.rejectAll = true;
                        break
                    }
                }

            } else {
                res.cmp = false
            }

            res.html = document.documentElement.outerHTML;

            return res;
        }
    }
};