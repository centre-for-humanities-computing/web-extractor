import _ from 'lodash';
import fsStandard from 'fs';
import fs from 'fs/promises';
import path from 'path';
import * as cli from 'commander';
import * as lineReader from 'line-reader';

function extractProperties(object, properties) {
    let res = {};
    for (let path of properties) {
        let value = _.get(object, path);
        _.set(res, path, value);
    }
    return res;
}

async function map(srcFile, destFile, properties) {
    let dest = null;
    try {
        await fs.mkdir(path.dirname(destFile), {recursive: true});
        dest = await fs.open(destFile, 'a');

        let readerPromise = new Promise((function(resolve, reject) {
            let lineCount = 1;
            lineReader.eachLine(srcFile, {encoding: 'utf8', separator: '\n'},async (line, isLast, cb) => {
                if (line.trim().length === 0) {
                    cb(false);
                    return;
                }
                try {
                    let json = JSON.parse(line);
                    let result = extractProperties(json, properties);
                    let jsonString = JSON.stringify(result);
                    await dest.appendFile(jsonString + '\n', {encoding: 'utf8'});
                    cb(true);
                } catch(e) {
                    cb(false);
                    console.error('Error on line:' + lineCount);
                    reject(e);
                }
                lineCount++;

            }, (error) => {
                if (error) {
                    reject(error);
                } else {
                    resolve();
                }
            });
        }));

        await readerPromise;

    } catch(e) {
        console.error(e);
    } finally {
        if (dest) {
            try {
                await dest.close();
            } catch (e) {
                // do nothing
            }
        }
    }
}

const optDesc = {
    source: `A path to a file with the json to extract properties from`,
    destination: `A path to the destination where the extracted properties should be saved`,
    properties: `A comma separated string with the path for each property to extract. E.g. "name, address.street"`
};

async function run() {
    try {
        cli.requiredOption('-s, --source <file>', optDesc.source);
        cli.requiredOption('-d, --destination <file>', optDesc.destination);
        cli.requiredOption('-p, --properties <string>', optDesc.properties);

        cli.parse(process.argv);

        let source = cli.source;
        let destination = cli.destination;
        let properties = cli.properties;
        properties = properties.split(',').map((s) => s.trim());

        await map(source, destination, properties);

        console.log(`done...`);
    } catch(e) {
       console.error(e);
    }
}

run();
