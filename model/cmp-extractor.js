const {default: PQueue} = require('p-queue');
const PageAnalyzer = require('./page-analyzer');
const uniqid = require('uniqid');
const filenamifyUrl = require('filenamify-url');
const EventEmitter = require('events').EventEmitter;
const _ = require('lodash');
const fs = require('fs').promises;
const fsStandard = require('fs');
const path = require('path');
const errors = require('./error');
const puppeteer = require('puppeteer');
const fkill = require('fkill');
const AwaitLock = require('await-lock').default;
const FileHandleWriteLock = require('../util/file-handle-write-lock');
const config = require('../config');


const DEFAULT_OPTIONS = Object.freeze({
    takeScreenshot: true,
    useIdForScreenshotName: false,
    maxConcurrency: 25,
    pageTimeoutMs: 120000
});

const FILE_NAMES = Object.freeze({
    cmpData: 'cmp-data.json',
    cmpNotFoundUrls: 'cmp-not-found-urls.txt',
    errors: 'errors.json'
});

const bigIntDescComparator = (a, b) => {
    let res = b.timeElapsedSinceLastActivityNs() - a.timeElapsedSinceLastActivityNs();
    if (res > 0) {
        return 1;
    } else if (res < 0) {
        return -1;
    }
    return 0;
};

class CmpExtractor {

    constructor(urls, cmpRules, destDir, options = {}) {
        options = _.defaults(options, DEFAULT_OPTIONS);
        this._urls = urls;
        this._cmpRules = cmpRules;
        if (this._isExistingCmpDataDir(destDir)) {
            this._destDir = destDir;
        } else {
            let dataDirName = `cmp-data-${getDateTimeDirString()}`;
            this._destDir = path.join(destDir, dataDirName);
        }
        this._takeScreenshot = options.takeScreenshot;
        this._useIdForScreenshotName = options.useIdForScreenshotName;
        this._maxConcurrency = options.maxConcurrency;
        this._pageTimeout = options.pageTimeoutMs;
        this._queue = new PQueue({concurrency: this._maxConcurrency});
        this._eventEmitter = new EventEmitter();
        this._closeLock = new AwaitLock();
        this._browserInstanceLock = new AwaitLock();
        this._activePageAnalyzers = new Set();
        this._progression = {total: urls.length, completed: 0, failed: 0, pending: urls.length};
    }

    addProgressionListener(listener) {
        this._eventEmitter.addListener('progression', listener);
    }

    removeProgressionListener(listener) {
        this._eventEmitter.removeListener('progression', listener);
    }

    async execute() {
        // mkdir if not exists
        await fs.mkdir(this._destDir, {recursive: true});
        if (this._takeScreenshot) {
            await fs.mkdir(path.join(this._destDir, 'screenshots'), {recursive: true});
        }

        // open files
        this._cmpDataFile = await FileHandleWriteLock.open(path.join(this._destDir, FILE_NAMES.cmpData), 'a');
        this._cmpNotFoundUrlFile = await FileHandleWriteLock.open(path.join(this._destDir, FILE_NAMES.cmpNotFoundUrls), 'a');
        this._errorLogFile = await FileHandleWriteLock.open(path.join(this._destDir, FILE_NAMES.errors), 'a');

        let closeTimer = setInterval(async () => {
            let analyzersSorted = Array.from(this._activePageAnalyzers).sort(bigIntDescComparator);
            if (analyzersSorted.length > 0) {
                let analyzer = analyzersSorted.shift();

                if (analyzer.timeElapsedSinceLastActivityNs() > (this._maxConcurrency * 10 * 1000000000) + this._pageTimeout * 1000000) { // max concurrency * 10 secs + pageTimeout
                    try {
                        let error = createBaseError(analyzer._url);
                        error.errorType = 'forceClose';
                        error.error = `The analyzer for ${analyzer._url} has been inactive for ${analyzer.timeElapsedSinceLastActivityNs() / 1000000n}ms`;
                        let json = JSON.stringify(error) + '\n';
                        await this._errorLogFile.write(json);

                        try {
                            /*
                            * make the hanging promise throw and error in PageAnalyzer.
                            * Sometimes a faulty page makes pupeteer page.screenshot() and page.evaluate() hang forever
                            * */
                            await analyzer.close();
                        } catch(e) {
                            //no-op
                        }
                    } catch (e) {
                        console.error(e); // should never happen
                    } finally {
                        // reset the remaining analyzers
                        for (let analyzer of analyzersSorted) {
                            analyzer._resetActionTimer();
                        }
                    }
                }
            }
        }, 10000); // every 10 seconds

        this._emitProgression();

        for (let i = 0; i < this._urls.length; i++) {
            let url = this._urls[i];
            this._queue.add(() => {
                return this._runAnalysis(url);
            });

            if (i % this._maxConcurrency === 0) {
                await this._queue.onEmpty();
            }

            if (i % (this._maxConcurrency * 20) === 0) {
                await this._queue.onIdle();
                await this._reloadBrowser(); // prevent to large memory leaks from Chromium
            }
        }

        await this._queue.onIdle();

        //close files
        for (let fileHandleWriteLock of [this._cmpDataFile, this._cmpNotFoundUrlFile, this._errorLogFile]) {
            try {
                await fileHandleWriteLock.close();
            } catch (e) {
                if (config.debug) {
                    console.error('Could not close file: ', e);
                }
            }
        }

        await this._close();
        clearInterval(closeTimer);
    }

    async _runAnalysis(url) {
        let analyzer = null;
        try {
            analyzer = new PageAnalyzer(url, this._cmpRules, this._pageTimeout);
            this._activePageAnalyzers.add(analyzer);

            let id = uniqid();

            let screenshotInfo = undefined;
            if (this._takeScreenshot) {
                screenshotInfo = {
                    dirPath: path.join(this._destDir, 'screenshots'),
                    imageName: this._useIdForScreenshotName ? id : filenamifyUrl(url)
                };
            }

            let browser = await this._browserInstance();
            let res = await analyzer.extractCmpData(browser, screenshotInfo);

            if (!PageAnalyzer.isRuleMatch(res.data)) {
                await this._cmpNotFoundUrlFile.write(url + '\n');
            } else {
                let entry = {
                    time: (new Date()).toISOString(),
                    url: url,
                    cmpName: res.cmpName,
                    data: res.data
                };

                if (this._useIdForScreenshotName) {
                    entry.id = id;
                }

                let json = JSON.stringify(entry);

                await this._cmpDataFile.write(json);
                //avoid concatenating large strings
                await this._cmpDataFile.write('\n');
            }

            this._progression.completed++;
        } catch (e) {
            this._progression.failed++;
            if (config.debug) {
                console.error(e);
            }

            let error = createBaseError(url);

            if (e instanceof errors.HttpError) {
                error.errorType = 'http';
                error.error = e.statusCode;
            } else {
                error.errorType = 'internal';
                error.error = e.toString();
                error.stack = e.stack;
            }
            let json = JSON.stringify(error) + '\n';
            await this._errorLogFile.write(json);
        } finally {
            this._progression.pending--;
            this._emitProgression();
            this._activePageAnalyzers.delete(analyzer);
        }
    }

    _emitProgression() {
        this._eventEmitter.emit('progression', _.clone(this._progression));
    }

    async _reloadBrowser() {
        await this._close();
        await this._browserInstance();
    }

    async _close() {
        try {
            await this._closeLock.acquireAsync();  // we are accessing shared properties are doing async work and can be accessed by multiple async functions
            this._browserCloseRequired = false;
            if (!this._browser) {
                return;
            }
            let browser = this._browser;
            let pid = browser.process().pid;
            await browser.close();
            this._browser = null;
            await fkill(pid, {
                force: true,
                tree: true,
                silent: true
            });
        } finally {
            this._closeLock.release();
        }
    }

    async _browserInstance() {
        try {
            await this._browserInstanceLock.acquireAsync(); // we are accessing shared properties are doing async work and can be accessed by multiple async functions
            if (this._browserCloseRequired) {
                await this._close();
            }
            if (!this._browser) {
                this._browser = await puppeteer.launch({headless: true, defaultViewport: {width: 1024, height: 1024},
                    args: []});
                this._browser.once('disconnected', () => this._browserCloseRequired = true);
            }
            return this._browser;
        } finally {
            this._browserInstanceLock.release();
        }
    }

    _isExistingCmpDataDir(dirPath) {
        return fsStandard.existsSync(dirPath) && fsStandard.existsSync(path.join(dirPath, FILE_NAMES.cmpData));
    }

}

function createBaseError(url) {
   return {
        timestamp: (new Date()).toISOString(),
        url: url
    };
}

function getDateTimeDirString() {
    let now = new Date();
    return `${now.getFullYear()}-${padDatePart(now.getMonth() + 1)}-${padDatePart(now.getDate())}`
        + `T${padDatePart(now.getHours())}_${padDatePart(now.getMinutes())}_${padDatePart(now.getSeconds())}`;
}

function padDatePart(part) {
    return `${part}`.padStart(2, '0');
}

CmpExtractor.DEFAULT_OPTIONS = DEFAULT_OPTIONS;

module.exports = CmpExtractor;