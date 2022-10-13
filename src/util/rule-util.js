import fs from 'fs/promises';
import path from 'path';
import { pathToFileURL } from "url";
import _ from 'lodash';
import config from '../config.js';

/**
 * Load the rules, prepare and validate them
 * @param dir
 * @returns {Promise<[]>}
 */
export async function loadRules(dir) {
    let rules = [];
    let filenames = await fs.readdir(dir);
    filenames.sort();
    let rulesIgnoredCount = 0;

    for (let filename of filenames) {
        if (filename.endsWith('.js')) {
            if (!filename.startsWith('__')) {
                let rule = await import(pathToFileURL(path.join(dir, filename)));
                rules.push(rule.default);
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
}

/**
 * Throws an Error if rules are not valid
 * @param rules
 */
export function validateRules(rules) {
  for (let rule of rules) {
      if (!_.isObject(rule)) {
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
}

export function createRulesAnalysisContexts(rules) {
    let contexts = [];
    for (let i = 0; i < rules.length; i++) {
        let rule = rules[i];
        if (rule['__analysisContext']) {
            throw new Error(`The rule at index ${i} is already an analysisContext use the original rule as input`);
        }
        let analysisContext = Object.create(rule);
        analysisContext.__analysisContext = true;
        contexts.push(analysisContext);
    }
    return contexts;
}

export async function initRules(rules, initOptions) {
    for (let rule of rules) {
        if (!rule['__analysisContext']) {
            throw new Error('Can only init rules which is created with createRulesAnalysisContexts() use this method to create the rules to init');
        }
        if (rule['__initialized']) {
            throw new Error('The rule is already initialized and cannot be reused. Create a new rule-context using createRulesAnalysisContexts');
        }
        if (rule.init) {
            rule.__initialized = true;
            await rule.init(initOptions);
        }
    }
}

export function prepareRules(rules) {
    for (let rule of rules) {
        prepareRule(rule);
    }
}

function prepareRule(rule) {
    if (rule.extractor && !_.isArray(rule.extractor)) {
        rule.extractor = [rule.extractor];
    }
}
