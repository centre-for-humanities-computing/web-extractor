import { WebExtractor } from '../src/model/web-extractor.js';
import path from 'path';
import { fileURLToPath } from 'url';
import * as urlUtil from '../src/util/url-util.js';
import * as ruleUtil from '../src/util/rule-util.js';
import config from '../src/config.js';

let destDir = 'd:/temp/web-extractor-temp-test';
//let urlsPath = path.join(destDir, 'top10Kfor29EUcountries.txt');
//let urlsPath = path.join(destDir, 'stall-test2.txt');
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// let urlsPath = path.join(__dirname, 'urls-test.txt');
let urlsPath = path.join(__dirname, 'failing-urls.txt');
let maxConcurrency = 15;

config.debug = true;

async function demo() {

    //let rules = await ruleUtil.getRules(path.join(destDir, 'rules'));

    //let rules = await ruleUtil.getRules(path.join(__dirname, '../rules'));
    let rules = [{
        extractor: {
            extract: () => {
                return true; // we accept all pages as a match
            }
        }
    }];
    let urls = await urlUtil.getUrls(urlsPath);

    if (maxConcurrency > 10) {
        process.setMaxListeners(maxConcurrency + 10); // prevent warning caused by puppeteer registering listeners for each instance
    }

    let options = {
        userAgent: undefined, // if undefined a default will be used
        output: {
            screenshot: true
        },
        maxConcurrency: maxConcurrency,
        pageTimeoutMs: 90000
    };

    options.output = false;

    let cmpExtractor = new WebExtractor(urls, rules, destDir, options);
    cmpExtractor.addProgressionListener((progress) => {
        console.log(progress);
    });
    await cmpExtractor.execute();
    console.log('done');

}

demo();

