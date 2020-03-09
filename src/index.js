const WebExtractor = require('./model/web-extractor');
const errors = require('./model/error');
const config = require('./config');
const urlUtil = require('./util/url-util');
const ruleUtil = require('./util/rule-util');
const singleLineLog = require('single-line-log').stdout;

class WebExtractorApi {

    /**
     *
     * @param urls an array of urls or a path to a file with urls (one url on each line)
     * @param rules the dir where the rules are located or a rule object or an array of rule objects
     * @param destDir the destination dir for extracted data and screenshots
     * @param options additional settings see the readme file
     */
    constructor(urls, rules, destDir, options) {
        this._executed = false;
        this._urls = urls;
        this._rules = rules;
        this._destDir = destDir;
        this._options = options;
    }

    async execute(progressionListener) {
        if (this._executed) {
            throw new Error('Each extractor instance can only be executed once');
        }
        this._executed = true;

        let urls = this._urls;
        if (!Array.isArray(urls)) {
            urls = await urlUtil.getUrls(urls);
        } else {
            urlUtil.validateUrls(urls);
        }

        let rules = null;
        if (_.isString(this._rules)) {
            rules = await ruleUtil.getRules(this._rules); // also prepares and validates rules
        } else {
            if (rules instanceof Object) {
                rules = [this._rules];
            } else {
                rules = this._rules;
            }
            ruleUtil.validateRules(rules);
            ruleUtil.prepareRules(rules);
        }

        await ruleUtil.initRules(rules, {destDir: this._destDir}); // init rules every time because destDir can change

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

module.exports = WebExtractorApi;