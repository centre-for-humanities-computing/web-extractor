const fs = require('fs').promises;
const path = require('path');
const _ = require('lodash');
const config = require('../config');

module.exports.extractorMode = extractorMode = Object.freeze({
    DOCUMENT: 'document',
    PUPPETEER: 'puppeteer'
});

const EXTRACTOR_MODES = new Set[Object.values(extractorMode)];

module.exports.getCmpRules = async function(dir) {
    let rules = [];
    let filenames = await fs.readdir(dir);
    console.log(dir);
    filenames.sort();
    let rulesIgnoredCount = 0;

    for (let filename of filenames) {
        if (filename.endsWith('.js')) {
            if (!filename.startsWith('__')) {
                let rule = require(path.join(dir, filename));
                if (rule.dataTemplate !== undefined && typeof rule.dataTemplate !== 'function') {
                    throw Error(`The dataTemplate property of a rule must be a function or undefined`);
                }
                prepareRule(rule);
                rules.push(rule);
            } else {
                rulesIgnoredCount++;
            }

        }
    }
    if (config.debug && rulesIgnoredCount > 0) {
        console.log(`Ignored ${rulesIgnoredCount} rule file(s), due to double leading underscore`);
    }
    return rules;
};

function prepareRule(rule) {
    if (!rule.extractorMode) {
        rule.extractorMode = 'document';
    } else {
        testExtractorModeAndThrow(rule.extractorMode);
    }

    if (!_.isArray(rule.extractor)) {
        rule.extractor = [rule.extractor];
    }

    for (let extractor of rule.extractor) {
        if (extractor.mode) {
            testExtractorModeAndThrow(extractor.mode);
        } else {
            extractor.mode = rule.extractorMode;
        }
    }

}

function testExtractorModeAndThrow(extractorMode) {
    if (!EXTRACTOR_MODES.has(extractorMode)) {
        throw new Error(`Unsupported extractorMode "${extractorMode}. use one of ${Object.values(extractorMode)}"`);
    }
    return true;
}