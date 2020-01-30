const fs = require('fs').promises;
const CmpExtractor = require('../model/cmp-extractor');
const path = require('path');
const fileUtil = require('../util/file-util');
const config = require('../config');

let urlsPath = 'urls-test.txt';
let destDir = 'd:/temp/gdpr-scrape';
let maxConcurrency = 25;

config.debug = true;

async function demo() {

    let rules = await fileUtil.getCmpRules(path.join(__dirname, 'rules'));
    let urls = await fileUtil.getUrls(urlsPath);

    if (maxConcurrency > 10) {
        process.setMaxListeners(maxConcurrency + 10); // prevent warning caused by puppeteer registering listeners for each instance
    }

    let options = {
        takeScreenshot: true,
        maxConcurrency: maxConcurrency,
        createNewDirForEachRun: true,
        pageTimeoutMs: 60000
    };

    let cmpExtractor = new CmpExtractor(urls, rules, destDir, options);
    cmpExtractor.addProgressionListener((progress) => {
        console.log(progress);
    });
    await cmpExtractor.execute();
    console.log('done');

}

demo();

