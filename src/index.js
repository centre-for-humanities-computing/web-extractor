const WebExtractor = require('./model/web-extractor');
const errors = require('./model/error');
const config = require('./config');
const fileUtil = require('./util/file-util');
const ruleUtil = require('./util/rule-util');
const singleLineLog = require('single-line-log').stdout;
const appRootPath = require('app-root-path');
const path = require('path');

class ExtractorWrapper {

    /**
     *
     * @param urls an array of urls or a path to a file with urls (one url on each line)
     * @param rulesDir the dir where the rules are located or null if the default location should be used
     * @param destDir the destination dir for extracted data and screenshots
     * @param options additional settings see the readme file
     */
    constructor(urls, rulesDir, destDir, options) {
        this._urls = urls;
        if (!rulesDir) {
            rulesDir = path.join(appRootPath.toString(), 'rules');
        }
        this._rulesDir = rulesDir;
        this._destDir = destDir;
        this._options = options;
    }

    async execute(progressionListener) {
        let urls = this._urls;
        if (!Array.isArray(urls)) {
            urls = await fileUtil.getUrls(urls);
        }
        let rules = await ruleUtil.getRules(this._rulesDir);
        let webExtractor = new WebExtractor(urls, rules, this._destDir, this._options);
        this._webExtractor = webExtractor;
        if (progressionListener) {
            webExtractor.addProgressionListener(progressionListener);
        }
        if (this._options.printProgression) {
            webExtractor.addProgressionListener((progress) => {
                let line = `pending: ${progress.pending}, completed: ${progress.completed}, failed: ${progress.failed}, total: ${progress.total}\n`;
                singleLineLog(line);
            });
        }
        await webExtractor.execute();
    }

    /**
     * The custom errors used by the extractor. Can be used in rules which want to
     * be able to throw the same kinds of errors for consistency in the error-log.
     * @returns {{NullError: NullError, HttpError: HttpError}}
     */
    static get errors() {
        return errors;
    }

    /**
     * Enable or disable debug info. If enabled more info will be written to the console
     * @param enable
     */
    static debug(enable = true) {
        config.debug = enable;
    }
}

module.exports = ExtractorWrapper;