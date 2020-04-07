const fs = require('fs').promises;
const CmpExtractor = require('../model/cmp-extractor');
const path = require('path');
const fileUtil = require('../util/file-util');
const ruleUtil = require('../util/rule-util');
const config = require('../config');

let destDir = 'd:/temp/cmp-temp';
let urlsPath = path.join(__dirname, 'urls-test.txt');
// let urlsPath = path.join(__dirname, '1379DK.txt');
let maxConcurrency = 15;

config.debug = true;

async function demo() {

    //let rules = await ruleUtil.getCmpRules(path.join(destDir, 'rules'));

    let rules = await ruleUtil.getCmpRules(path.join(__dirname, '../rules'));
    let urls = await fileUtil.getUrls(urlsPath);

    if (maxConcurrency > 10) {
        process.setMaxListeners(maxConcurrency + 10); // prevent warning caused by puppeteer registering listeners for each instance
    }

    let options = {
        takeScreenshot: true,
        maxConcurrency: maxConcurrency,
        createNewDirForEachRun: true,
        pageTimeoutMs: 90000
    };

    let cmpExtractor = new CmpExtractor(urls, rules, destDir, options);
    cmpExtractor.addProgressionListener((progress) => {
        console.log(progress);
    });
    await cmpExtractor.execute();
    console.log('done');

}

demo();

