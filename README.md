# Cmp Extractor
A tool for extracting Consent Management Provider data.

Provided a list of urls and a set of extraction rules Cmp-extractor loads each url 
and test each rule against the web page until a rule succeeds or there are no more rules. If a rule 
succeeds the data described in the rule's extract method is exported.

A set of rules for common CMP's is included as default, 
but additionally rules can be added and the existing ones can be disabled. 


## Installation
- Install [node.js](https://nodejs.org/en/download/) version 12.9 or higher
- Clone this repository
- Navigate to the root of the repository and run
```
$ npm install
```

## Usage
- Navigate to the root of the repository and run 
```
$ node extract -h 
```

### CLI options
- **`-u, --urls <file>`** [required] - A path for a file with a list of urls for extraction. Each url in the file should be on it's own line
- **`-d, --destination <directory>`** [required] - A path to the dir where data should be saved. If the dir already contains previous collected data the new data will be appended to the existing files
- **`-c, --concurrency <integer>`** [optional, default=25] - The maximum simultaneous loaded web pages
- **`-n, --no-screenshot`** [optional] - Disable screenshots
- **`-t, --page-timeout <integer>`** [optional, default=60000] - Milliseconds to wait for the initial loading of a page
- **`-i, --use-id-for-screenshot-name`** [optional] - Use an universal unique id for screenshot names instead of the url
- **`-x, --debug`** [optional] - Print more detailed error information

### Full Example
```
$ node extract -u /data/urls.txt-d /data/cmp-crawls -c 35 -t 90000
```
*Analyze each url in '/data/urls.txt' and save the results in '/data/cmp-crawls'. 
Load a maximum of 35 simultaneous web pages and wait a maximum of 90000ms for each page to load.*

### Results
If the destination path does not contain data from a previous extraction session a new directory will be created with the 
name "cmp-data-{DATE-TIME}". The created directory has the following structure:

- cmp-data.json
- cmp-not-found-urls.txt
- errors.json
- ./screenshots

**cmp-data.json** contains the extracted data for each url where a matching rule could be found. Each line is a 
self contained json-object, which makes is easy the parse large files line by line.

**cmp-not-found-urls.txt** contains a list of urls which did not match any of the rules.

**errors.json** contains a json object for each error occurred during the extraction process.

**screenshots** contains one or more screenshots for each url where a rule matched.

#### Resuming a Previous Extraction
If a path to a directory containing previous extracted data is passed in Cmp-extractor will
add to the existing files and and screenshot directory instead of creating a new directory. 


## Extraction Rules
The extraction rules can found in `rules` directory of the project. Each rule is a node module with the following
structure:

```
module.exports = {
    cmpName: 'name of cmp', //required

    waitFor: async function(page) {}, // optional

    screenshotAfterWaitFor: false, // optional

    extractor: function() {} // optional
};
```

##### waitFor

Type: `async function`\
Parameter: `page` an instance of a [puppeteer page](https://github.com/puppeteer/puppeteer/blob/v2.1.0/docs/api.md#class-page)

The extraction engine will wait for this method to complete before running the `extractor` function(s).

To wait for a given DOM-element to become present you can do:

```
waitFor: async function(page) {
    await page.waitFor('#my-element' {timeout: 5000});
}
```

##### screenshotAfterWaitFor
Type: `boolean`

Should a screenshot be taken aften each waitFor? 

##### extractor
Type: `function | array`\
Returns: the extraction result or `null, undefined, [], {}` if no result was found

The extractor function is executed in the context of the document so you have access to `document`, `window` etc.

To extract all paragraph text from a document you can do: 

```
extractor: function() {
    let results = [];
    let paragraphs = document.querySelector('p');
    if (p) {
        for (let p of paragraphs) {
            results.push(p.textContent);
        }
    }
    return results;
}
```

Sometimes it is required to click buttons, wait for events to happen etc. to complete an extraction. The extractor can
then be divided into multiple sections by providing an array of objects with one or both of `waitFor` and `extractor`. 
Each extractor will get passed the return value from the following extractor so you can add to a combined result.

To wait for element to appear, extract the text, and click next and extract the text you could do:

```
extractor: [
    {
        waitFor: async function(page) {
            await page.waitFor('.popup');
        },
        extractor: function() {
            let result = {
                popupPage1: document.querySelector('.popup-text').textContent;
            }
            return result;
        }
    }, {
        waitFor: async function(page) {
            await page.click('.popup .next-button');
            await page.waitFor('.popup .page2');
        },
        extractor: function(data) { // data is the object returned in the extractor above
            data['popupPage2'] = document.querySelector('.popup-text').textContent;
            return data;
        }
    }

]
```

All this could also have been done in the extractor alone using the DOM and mutation-observers etc. so the above is only
an easier way to do it. 
 

## Disable og Remove Rules
A rule can be temporarily disabled by prefixing the file name with double underscore e.g. `__cookiebot.js`. To completely
remove a rule simply delete de file.


