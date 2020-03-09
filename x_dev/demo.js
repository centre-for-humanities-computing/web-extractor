const WebExtractor = require('../src/model/web-extractor');
const path = require('path');
const urlUtil = require('../src/util/url-util');
const ruleUtil = require('../src/util/rule-util');
const config = require('../src/config');

let destDir = 'd:/temp/cmp-temp';
//let urlsPath = path.join(destDir, 'top10Kfor29EUcountries.txt');
//let urlsPath = path.join(destDir, 'stall-test2.txt');
let urlsPath = path.join(__dirname, 'urls-test.txt');
let maxConcurrency = 15;

config.debug = true;

async function demo() {

    //let rules = await ruleUtil.getRules(path.join(destDir, 'rules'));

    let rules = await ruleUtil.getRules(path.join(__dirname, '../rules'));
    let urls = await urlUtil.getUrls(urlsPath);

    if (maxConcurrency > 10) {
        process.setMaxListeners(maxConcurrency + 10); // prevent warning caused by puppeteer registering listeners for each instance
    }

    let options = {
        output: {
            screenshot: true
        },
        maxConcurrency: maxConcurrency,
        pageTimeoutMs: 90000
    };

    let cmpExtractor = new WebExtractor(urls, rules, destDir, options);
    cmpExtractor.addProgressionListener((progress) => {
        console.log(progress);
    });
    await cmpExtractor.execute();
    console.log('done');

}

demo();

