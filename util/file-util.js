const fs = require('fs').promises;
const path = require('path');
const config = require('../config');

module.exports.getUrls = async function(file) {
    let content = await fs.readFile(file, 'utf8');
    content = content.replace(/\r\n/, '\n').replace(/\r/, '\n');
    let urls = content.split('\n')
        .map((line) => line.trim())
        .filter((line) => line.length > 0 && line[0] != '#');
    return urls;
};

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