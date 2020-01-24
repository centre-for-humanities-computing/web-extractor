const fs = require('fs').promises;
const CmpExtractor = require('./model/cmp-extractor');
const path = require('path');
const fileUtil = require('./util/file-util');
const config = require('./config');

let tempUrlsPath = 'urls-test.txt';//'urls-dk-top10k.txt'; //'urls-test.txt';
let tempDestDir = 'D:\\temp\\gdpr-scrape\\cmp-data-2020-01-24T12_36_24'; //'d:/temp/gdpr-scrape';
let tempMaxConcurrency = 25;

config.debug = true;

async function demo() {

    let urlsPath = tempUrlsPath;
    let destDir = tempDestDir;
    let rules = await fileUtil.getCmpRules(path.join(__dirname, 'rules'));
    let urls = await fileUtil.getUrls(urlsPath);

    let maxConcurrency = tempMaxConcurrency;

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

