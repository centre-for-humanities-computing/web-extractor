import fs from 'fs/promises';
import _  from 'lodash';

export async function getUrls(file) {
    let content = await fs.readFile(file, 'utf8');
    content = content.replace(/\r\n/, '\n').replace(/\r/, '\n');
    let urls = content.split('\n')
        .map((line) => line.trim())
        .filter((line) => line.length > 0 && line[0] !== '#')
        .map((line) => line.startsWith('{') ? JSON.parse(line) : line);

    validateUrls(urls);

    return urls;
};

/**
 * Throws Error if urls is not valid
 * @param urls
 */
export function validateUrls(urls) {
    for (let i = 0; i < urls.length; i++) {
        let actualUrl = unwrapUrl(urls[i]);
        if (actualUrl === undefined) {
            throw new Error(`Object at index ${i} must have an "url" property`);
        }
    }
};

export function unwrapUrl(urlLike) {
    if (_.isString(urlLike)) {
        return urlLike;
    }
    return urlLike.url;
};