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