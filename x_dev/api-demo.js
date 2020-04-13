const path = require('path');
const WebExtractorApi = require('../src/index');

async function run() {
    let urlsPath = path.join(__dirname, 'urls-top-1000.txt');
    let destDir = "d:/temp/cmp-temp-test";
    let rule = {
        extractor: {
            extract: () => {
                return true; // we accept all pages as a match
            }
        }
    };
    WebExtractorApi.debug(true);

    for (let i = 0; i < 50; i++) { // try to force an error, delete loop again before commit
        console.log("Iteration: " + (i + 1));
        let webExtractor = new WebExtractorApi(urlsPath, rule, destDir, {maxConcurrency: 15, printProgression: false});
        try {
            await webExtractor.execute();
        } catch (e) {
            console.error("BAD!!!!");
            console.error(e);
            process.exit(1);

        }
    }

}

run();