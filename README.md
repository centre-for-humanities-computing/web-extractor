# Cmp Extractor
A tool for extracting Consent Management Provider data.

Provided a list of urls and a set of extraction rules Cmp-extractor loads each url 
and test each rule against the page until a rule succeeds or there are no more rules. If a rule 
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
- **`-u, --urls <file>`** [required] - A path to a file with a list of urls for extraction. Each url in the file should be on it's own line
- **`-d, --destination <directory>`** [required] - A path to the dir where data should be saved. If the dir already contains previous collected data the new data will be appended to the existing files
- **`-r, --rules <directory>`** [optional] - A path to the dir where extraction rules are located. If not set the "rules" folder in project will be used as default
- **`-c, --concurrency <integer>`** [optional, default=25] - The maximum simultaneous loaded pages
- **`-n, --no-screenshot`** [optional] - Disable screenshots
- **`-t, --page-timeout <integer>`** [optional, default=60000] - Milliseconds to wait for the initial loading of a page
- **`-i, --use-id-for-screenshot-name`** [optional] - Use an universal unique id for screenshot names instead of the url
- **`-x, --debug`** [optional] - Print more detailed error information

### Full Example
```
$ node extract -u /data/urls.txt-d /data/cmp-crawls -c 35 -t 90000
```
*Analyze each url in '/data/urls.txt' and save the results in '/data/cmp-crawls'. 
Load a maximum of 35 simultaneous pages and wait a maximum of 90000ms for each page to load.*

### Results
If the destination path does not contain data from a previous extraction session a new directory will be created with the 
name "cmp-data-{DATE-TIME}". The created directory has the following structure:

- cmp-data.json
- cmp-not-found-urls.txt
- errors.json
- ./screenshots

**cmp-data.json** contains the extracted data for each url where a matching rule could be found. Each line is a 
self contained json-object, which makes it easy to parse large files line by line.

**cmp-not-found-urls.txt** contains a list of urls which did not match any of the rules.

**errors.json** contains a json object for each error occurred during the extraction process.

**screenshots** contains one or more screenshots for each url where a rule matched.

### Resuming a Previous Extraction
If a path to a directory containing previous extracted data is passed in, Cmp-extractor will
add to the existing files and screenshot directory instead of creating a new directory. 

## Extraction Rules
Each rule is tested one by one in alphabetical order until a match is found. 
In the event of a match the result is saved and any remaining rules are aborted.
If no `rules` path is passed in the default extraction rules, located in the `rules` directory of the project, will be used.

### Disabling and Deleting Rules
A rule can be temporarily disabled by prefixing the file name with double underscore e.g. `__cookiebot.js`. To completely
remove a rule simply delete the file.

### Creating Rules
Each rule is a node.js module with the following
structure:

```
module.exports = {
    cmpName: 'name of cmp', //required

    screenshotAfterWaitFor: false, // optional

    dataTemplate: function() {} // optional
    
    extractor: {
        waitFor: async function(page) {}, // optional 
        extract: function(template) {} // optional
     }
    
};
```
##### cmpName
Type: `string`

The name of the CMP or some other name identifying the extracted data.

##### screenshotAfterWaitFor
Type: `boolean`

Should a screenshot after each waitFor? If `false` only the initial screenshot after page load will be saved.

##### dataTemplate
Type: `function`\
Returns: a template object to use as a starting point in the first extractor for the rule

If the function is defined it must return a JSON compliant object which will be passed into the first
extractor of the rule (see below). For each url the rule i tested against a new clone of the template
object, so it is safe to modify the template object in the `extract` method.

##### extractor
Type: `object` | `array`

The extractor object should have one or both of the following methods:

##### waitFor

Type: `async function`\
Parameter: `page` - an instance of a [puppeteer page](https://github.com/puppeteer/puppeteer/blob/v2.1.0/docs/api.md#class-page)\
Returns: the index of the next extractor to execute or `undefined` (default) if the normal order of execution should be followed

The extraction engine will wait for this method to complete before running the `extract` method.

In the case of a `puppeteer.errors.TimeoutError` the next rule (if present) wil we tested. 
All other errors will be seen as an actual error and the following rules will be aborted and the error logged.

To wait for a given DOM-element to become present you could do:

```
extractor: { 
    waitFor: async function(page) {
        await page.waitFor('#my-element' {timeout: 5000});
    },
    extract() {...}
}
```

When the `extractor` is made up of more extractors (see [Multiple Extractors](#multiple-extractors)) it can be desirable to be able to choose which
extractor to run next depending on a condition in `waitFor`. This can be controlled by returning the index of 
the next extractor to run. E.g.

```
extractor: {
    waitFor: async function(page) {
        try {
            await page.waitFor('#my-element' {timeout: 5000});
            return 2;
        } catch(e) {
            return 3;
        }
    }
}
```


##### extract
Type: `function`\
Parameter: `template` - a clone of the template object returned by `dataTemplate()` or `null` if `dataTemplate()` is not defined\
Returns: the extraction result or one of: `null`, `undefined`, `[]` or `{}` if no result was found

The `extract` method is executed in the context of the page so you have access to `document`, `window` etc.

To extract all paragraph text from a page you could do: 

```
extractor: {
    extract: function() {
        let results = [];
        let paragraphs = document.querySelector('p');
        if (p) {
            for (let p of paragraphs) {
                results.push(p.textContent);
            }
        }
        return results;
    }
}
```


#### Multiple Extractors
Sometimes it is required to click buttons, wait for events to happen etc. to complete an extraction. The extractor can
then be divided into multiple sections by providing an array of objects with one or both of `waitFor` and `extract`. 
Each extractor will get passed the return value from the previous extractor so you can add to this to get a combined result 
(if present the `template` will be passed to the first object's `extract` method).

To wait for an element to appear, extract some text, 
click next and extract some more text you could do:

```
extractor: [
    {
        waitFor: async function(page) {
            await page.waitFor('.popup');
        },
        extract: function() {
            let data = {
                popupPage1: document.querySelector('.popup-text').textContent;
            }
            return data;
        }
    }, {
        waitFor: async function(page) {
            await page.click('.popup .next-button');
            await page.waitFor('.popup .page2');
        },
        extract: function(data) { // data is the object returned in the extractor above
            data['popupPage2'] = document.querySelector('.popup-text').textContent;
            return data;
        }
    }

]
```

All this could also have been done in the extractor alone using the DOM, events and mutation-observers etc., 
so the above is only an easier way to do it. 
 


