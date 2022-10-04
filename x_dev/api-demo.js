import path from 'path';
import { fileURLToPath } from 'url';
import { WebExtractorApi } from '../src/index.js';
import delay from 'delay';

async function run() {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);

    let urlsPath = path.join(__dirname, 'urls-test.txt');
    let destDir = "d:/temp/web-extractor-temp-test";
    let rule = {
        extractor: {
            extract: () => {
                return true; // we accept all pages as a match
            }
        }
    };
    WebExtractorApi.debug(true);

    try {
        let webExtractor = new WebExtractorApi(urlsPath, rule, destDir, {maxConcurrency: 15, printProgression: false});
        await webExtractor.execute()
    } catch (e) {
        console.error(e);
    }

   /* for (let i = 0; i < 50; i++) { // try to force an error, delete loop again before commit
        console.log("Iteration: " + (i + 1));
        let webExtractor = new WebExtractorApi(urlsPath, rule, destDir, {maxConcurrency: 15, printProgression: false});
        try {
            await webExtractor.execute();
        } catch (e) {
            console.error("BAD!!!!");
            console.error(e);
            process.exit(1);

        }
    }*/

}

run();