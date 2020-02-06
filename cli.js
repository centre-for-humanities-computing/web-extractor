const fs = require('fs').promises;
const CmpExtractor = require('./model/cmp-extractor');
const path = require('path');
const fileUtil = require('./util/file-util');
const cli = require('commander');
const config = require('./config');
const _ = require('lodash');
const singleLineLog = require('single-line-log').stdout;

const optDesc = {
    urls: `A path to a file with a list of urls for extraction. Each url should be on it's own line`,
    destination: `A path to the dir where data should be saved. If the dir already contains previous collected data the new data will be appended to the existing files`,
    concurrency: `The maximum simultaneous loaded web pages. default: ${CmpExtractor.DEFAULT_OPTIONS.maxConcurrency}`,
    noScreenshot: `Disable screenshots. default: ${!CmpExtractor.DEFAULT_OPTIONS.takeScreenshot}`,
    pageTimeout: `Milliseconds to wait for the initial loading of a page. default: ${CmpExtractor.DEFAULT_OPTIONS.pageTimeoutMs}`,
    useIdForScreenshotName: `Use an universal unique id for screenshot names instead of the url. default: ${CmpExtractor.DEFAULT_OPTIONS.useIdForScreenshotName}`,
    debug: 'Print more detailed error information'

};

async function run() {

    try {
        cli.requiredOption('-u, --urls <file>', optDesc.urls);
        cli.requiredOption('-d, --destination <directory>', optDesc.destination);
        cli.option('-c, --concurrency <integer>', optDesc.concurrency, CmpExtractor.DEFAULT_OPTIONS.maxConcurrency);
        cli.option('-n, --no-screenshot', optDesc.noScreenshot);
        cli.option('-t, --page-timeout <integer>', optDesc.pageTimeout, CmpExtractor.DEFAULT_OPTIONS.pageTimeoutMs);
        cli.option('-i, --use-id-for-screenshot-name', optDesc.useIdForScreenshotName, CmpExtractor.DEFAULT_OPTIONS.useIdForScreenshotName);
        cli.option('-x, --debug', false);

        cli.parse(process.argv);

        let urlsPath = cli.urls;
        let destDir = cli.destination;
        let concurrency = Math.max(1, parseIntOrThrow(cli.concurrency));
        let takeScreenshot = cli.screenshot;
        let pageTimeout = Math.max(1, parseIntOrThrow(cli.pageTimeout));
        let useIdForScreenshotName = cli.useIdForScreenshotName;
        let debug = cli.debug;

        config.debug = debug;

        let rules = await fileUtil.getCmpRules(path.join(__dirname, 'rules'));
        let urls = await fileUtil.getUrls(urlsPath);

        if (concurrency > 10) {
            process.setMaxListeners(concurrency + 10); // prevent warning caused by puppeteer registering listeners for each instance
        }

        let options = {
            takeScreenshot: takeScreenshot,
            maxConcurrency: concurrency,
            pageTimeoutMs: pageTimeout,
            useIdForScreenshotName: useIdForScreenshotName
        };

        let start = Date.now();

        let cmpExtractor = new CmpExtractor(urls, rules, destDir, options);
        cmpExtractor.addProgressionListener((progress) => {
            let line = `pending: ${progress.pending}, completed: ${progress.completed}, failed: ${progress.failed}, total: ${progress.total}\n`;
            singleLineLog(line);
        });
        await cmpExtractor.execute();

        console.log(`done... (elapsed: ${elapsedTime(start)})`);
    } catch(e) {
        if (config.debug) {
            console.log(e);
        } else {
            console.error(e.message);
        }
    }

}

function parseIntOrThrow(str) {
    let res = parseInt(str);
    if (!_.isSafeInteger(res)) {
        throw new Error(`Could not parse: ${str}`);
    }
    return res;
}

function elapsedTime(startTime) {
    let elapsed = Date.now() - startTime;
    let secMs = 1000;
    let minMs = 60 * secMs;
    let hoursMs = 60 * minMs;

    let hours = Math.floor(elapsed / hoursMs);
    let minutes = Math.floor((elapsed - hours * hoursMs) / minMs);
    let secs = Math.floor((elapsed - (hoursMs * hours + minutes * minMs)) / secMs);
    return `${hours}h, ${minutes}m, ${secs}s`;
}

run();
