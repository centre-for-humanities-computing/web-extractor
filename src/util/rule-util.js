const fs = require('fs').promises;
const path = require('path');
const _ = require('lodash');
const config = require('../config');

module.exports.getRules = async function(dir) {
    let rules = [];
    let filenames = await fs.readdir(dir);
    filenames.sort();
    let rulesIgnoredCount = 0;

    for (let filename of filenames) {
        if (filename.endsWith('.js')) {
            if (!filename.startsWith('__')) {
                let rule = require(path.join(dir, filename));
                if (rule.dataTemplate !== undefined && typeof rule.dataTemplate !== 'function') {
                    throw Error(`The dataTemplate property of a rule must be a function or undefined`);
                }
                if (!rule.extractor) {
                    throw new Error(`No extractor function or array found for: ${path.join(dir, filename)}`);
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

    if (config.debug && rules.length === 0) {
        console.log(`No rules found in ${path.resolve(dir)}`)
    }

    return rules;
};

function prepareRule(rule) {
    if (!_.isArray(rule.extractor)) {
        rule.extractor = [rule.extractor];
    }

}
