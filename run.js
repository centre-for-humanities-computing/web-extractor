const fs = require('fs').promises;
const CmpExtractor = require('./model/cmp-extractor');
const path = require('path');
const fileUtil = require('./util/file-util');
const config = require('./model/config');

let tempUrlsPath = 'urls-test.txt';//'urls-dk-top10k.txt'; //'urls-test.txt';
let tempDestDir = 'd:/temp/gdpr-scrape';
let tempMaxConcurrency = 25;

config.debug = true;


/* Hvis den køres fra terminal, så dræb alle beskeder om:
*
* ERROR: The process with PID \d+ (child process of PID \d+) could not be terminated.
*
* brug: https://github.com/sindresorhus/filter-console
* Lav kun hvis den køres fra konsollen
*
* */


async function run() {

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

run();

