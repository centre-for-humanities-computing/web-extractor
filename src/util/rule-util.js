const fs = require('fs').promises;
const path = require('path');
const _ = require('lodash');
const config = require('../config');

/**
 * Load the rules, prepare and validate them
 * @param dir
 * @returns {Promise<[]>}
 */
module.exports.getRules = async function(dir) {
    let rules = [];
    let filenames = await fs.readdir(dir);
    filenames.sort();
    let rulesIgnoredCount = 0;

    for (let filename of filenames) {
        if (filename.endsWith('.js')) {
            if (!filename.startsWith('__')) {
                let rule = require(path.join(dir, filename));
                rules.push(rule);
            } else {
                rulesIgnoredCount++;
            }

        }
    }

    validateRules(rules);
    prepareRules(rules);

    if (config.debug && rulesIgnoredCount > 0) {
        console.log(`Ignored ${rulesIgnoredCount} rule file(s), due to double leading underscore`);
    }

    if (config.debug && rules.length === 0) {
        console.log(`No rules found in ${path.resolve(dir)}`);
    }

    return rules;
};

/**
 * Throws an Error if rules are not valid
 * @param rules
 */
module.exports.validateRules = validateRules = function(rules) {
  for (let rule of rules) {
      if (!(rule instanceof  Object)) {
          throw new Error('A rule must be an object. ${rule} is not an object.');
      }
      if (rule.dataTemplate !== undefined && typeof rule.dataTemplate !== 'function') {
          throw Error(`The dataTemplate property of a rule must be a function or undefined`);
      }
      if (rule.extractor !== undefined && (!Array.isArray(rule.extractor) && !_.isObject(rule.extractor))) {
          throw new Error(`The extractor property must be an object or an array of objects`);
      }

      let extractors = rule.extractor;
      if (!Array.isArray(extractors)) {
          if (extractors) {
              extractors = [extractors];
          } else {
              extractors = [];
              if (config.debug) {
                  console.log("no extractor defined for rule, to define one set the 'extractor' property");
              }
          }

      }

      for (let extractor of extractors) {
          if (rule.beforeExtract !== undefined && typeof rule.beforeExtract !== 'function') {
              throw Error(`"beforeExtract" must be a function or undefined`);
          }
          if (rule.extract !== undefined && typeof rule.extract !== 'function') {
              throw Error(`"extract" must be a function or undefined`);
          }
          if (rule.extractPuppeteer !== undefined && typeof rule.extractPuppeteer !== 'function') {
              throw Error(`"extractPuppeteer" must be a function or undefined`);
          }
          if (rule.afterExtract !== undefined && typeof rule.afterExtract !== 'function') {
              throw Error(`"afterExtract" must be a function or undefined`);
          }
      }
  }
};

module.exports.initRules = async function(rules, initOptions) {
    for (let rule of rules) {
        if (rule.init) {
            await rule.init(initOptions);
        }
    }
};

module.exports.prepareRules = prepareRules = function(rules) {
    for (let rule of rules) {
        prepareRule(rule);
    }
};

function prepareRule(rule) {
    if (rule.extractor && !_.isArray(rule.extractor)) {
        rule.extractor = [rule.extractor];
    }
}
