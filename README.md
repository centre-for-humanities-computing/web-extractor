# Web Extractor
A tool for extracting DOM content and taking screenshots of web pages. 

Provided a list of urls and a set of extraction rules Web Extractor loads each url 
and test each rule against the page until a rule succeeds or there are no more rules. If a rule 
succeeds the data described in the rule's extract method is exported.

Web Extractor can be used as a CLI program or as a npm module. 

## CLI Installation
- Install [node.js](https://nodejs.org/en/download/) version 12.9 or higher
- Clone this repository
- Navigate to the root of the repository and run
```
npm install
```


### Usage
- Navigate to the root of the repository and run 
```
node extract -h 
```

### CLI options
- **`-u, --urls <file>`** [required] - A path to a file with a list of urls for extraction. Each url in the file should be on it's own line
- **`-d, --destination <directory>`** [required] - A path to the dir where data should be saved. If the dir already contains previous collected data the new data will be appended to the existing files
- **`-r, --rules <directory>`** [optional] - A path to the dir where extraction rules are located. If not set the "rules" folder in the project will be used as default
- **`-c, --concurrency <integer>`** [optional, default=15] - The maximum simultaneous loaded pages
- **`-n, --no-screenshot`** [optional] - Disable screenshots
- **`-t, --page-timeout <integer>`** [optional, default=90000] - Milliseconds to wait for the initial loading of a page
- **`-h, --headless`** [optional, default=true] - run browser on headless mode
- **`-i, --use-id-for-screenshot-name`** [optional] - Use an universal unique id for screenshot names instead of the url
- **`-x, --debug`** [optional] - Print more detailed error information

>**NOTE** if `cpm-data.json` contains many results with a `requestStrategy` equal to `domContentLoaded` or `errors.json` 
> contains many `TimeoutError` errors, try lowering concurrency or increase page-timeout. 

### Full Example
```
$ node extract -u /data/urls.txt-d /data/web-extract -c 35 -t 90000
```
*Analyze each url in '/data/urls.txt' and save the results in '/data/web-extract'. 
Load a maximum of 35 simultaneous pages and wait a maximum of 90000ms for each page to load.*

## NPM Module Installation
run:
```
npm install @chcaa/web-extractor
```

### Usage
To get started with some simple extractions, create a simple rule (see [Extraction Rules](#extraction-rules)) 
and do the following:
```
import { WebExtractor } from '@chcaa/web-extractor';

async function run() {
    let urls = ['https://www.dr.dk', 'tv2.dk'];

    let rule = {
        extractor: {
            extract: function() {
                return document.querySelector('h1');
            }
        }
    };

    let destDir = '/temp/data/web-extractor';

    let extractor = new WebExtractor(urls, rule, destDir);

    await extractor.execute();
}

run();
```

### API
The following methods and properties are available:

##### constructor(urls, rules, destDir, [options])
- `urls` - an array of urls or a path to a file with urls. (one url pr. line). If further input is needed along with
the url the url can be and object with a property named `url` the object will the be passed in to relevant methods of
the extraction rules (see [Creating Rules](#creating-rules)). If the url's are located in a file each line can be
a string in JSON-format.
- `rules` - the dir where the extraction rules are located or a rule object or an array of rule objects 
(see [Creating Rules](#creating-rules))  
- `destDir` - the dir where the extracted data, screenshots and logs should be saved 
- `options` - additional options in the format

  - ```
    {
        useIdForScreenshotName: {boolean} default false,
        maxConcurrency: {integer} default 15,
        pageTimeoutMs: {integer} default 90000,
        headless: {boolean} default true,
        output: {
            screenshot: {boolean} default true,
            logs: {boolean} default true,
            data: {boolean} default true
        }
        printProgression: {boolean} default false
    }
    ```  
##### execute([progressionListener]) <async>
- `progressionListener` - a function which will be notified on progression during the extraction

Returns: `Promise<undefined>` - resolves when extraction completes or fails if an unhandled error occurred

###### errors <static>
An object with the internal custom errors thrown by Web Extractor.  Can be used in rules which want to 
be able to throw the same kinds of errors for e.g. consistency in the error-log.

##### debug([enable]) <static>
- `enable` a boolean enabling or disabling debug information to the console. 
    
## Results
If the destination path does not contain data from a previous extraction session a new directory will be created with the 
name "data-{DATE-TIME}". The created directory has the following structure:

- data.json
- no-rule-match-urls.txt
- errors.json
- ./screenshots

**data.json** contains the extracted data for each url where a matching rule could be found. Each line is a 
self contained json-object, which makes it easy to parse large files line by line.

**no-rule-match-urls.txt** contains a list of urls which did not match any of the rules.

**errors.json** contains a json object for each error occurred during the extraction process.

**screenshots** contains one or more screenshots for each url where a rule matched.

### Resuming a Previous Extraction
If a path to a directory containing previous extracted data is passed in, Web Extractor will
add to the existing files and screenshot directory instead of creating a new directory. 

### Screenshots
If screenshots are enabled (default) a screenshot will taken of every page which can be reached.
So even if no rule does match or there are no rules at all a screenshot is still taken. 

For further control each rule can specify if additional screenshots should be taken (see [extractor.beforeExtract](#extractorbeforeextractpage-async)).

## Extraction Rules
Rules defines what should be extracted from given web-page as well as when the extraction should take place.

Each rule is tested one by one in alphabetical order until a match is found. 
In the event of a match the result is saved and any remaining rules are aborted.

If no `rules` path is passed in the rules (if any) located in the `rules` directory of the project, will be used.

### Disabling and Deleting Rules
A rule can be temporarily disabled by prefixing the file name with double underscore e.g. `__cookiebot.js`. To completely
remove a rule simply delete the file.

### Creating Rules
Each rule is a node.js module with the following
structure:

```
export default {
    name: 'name of the rule', //required

    init: async function() {} // optional
    dataTemplate: function() {} // optional
    
    extractor: {
        beforeExtract: async function(page, url) {}, // optional 
        extract: function(template, url) {} // optional
        afterExtract: function(data, rul) {} // optional
     }
    
};
```
##### name \<string>

The name of the rule or some other name identifying the extracted data. If only one rule is used the name can be omitted.

##### init(options) \<async>
- `options` - an object with relevant config data for the extractor:
 
  - ```
    {
        destDir: {string}
    }
    ```

Returns: `Promise<undefined>`

If defined this method will be called once before any extraction takes place. 

Can be used for initializing the rule or other preparations which should take place before 
rule is processed.


##### dataTemplate()

Returns: `Object` - a template object to use as a starting point in the first extractor for the rule

If the function is defined it must return a JSON compliant object which will be passed into the first
extractor of the rule (see below). For each url the rule i tested against a new clone of the template
object, so it is safe to modify the template object in the `extract` method.

##### extractor \<object | array>

The extractor object should have at least one of the following methods:

##### extractor.beforeExtract(page, [url]) \<async>

- `page` - an instance of a [puppeteer page](https://github.com/puppeteer/puppeteer/blob/v2.1.0/docs/api.md#class-page)
- `url` - the url or url object currently being processed

Returns: `Promise<object | undefined>` - a control object for what to do when beforeExtract succeeds or `undefined` (default) if the normal order of execution should be followed

The returned object can have the following options:
- `screenshot` - take a screenshot
- `nextExctractorIndex` - continue with the extractor at the following index. Makes selection and iteration possible

```
{
    screenshot: {boolean}, // optional
    nextExctractorIndex: {integer} // optional
}
```

The extraction engine will wait for this method to complete before running the `extract` method.

In the case of a `puppeteer.errors.TimeoutError` the next rule (if present) wil we tested. 
All other errors will be seen as an actual error and the following rules will be aborted and the error logged.

To wait for a given DOM-element to become present and then take a screenshot you could do:

```
extractor: { 
    beforeExtract: async function(page) {
        await page.waitFor('#my-element' {timeout: 5000});
        return {
            screenshot: true
        };
    },
    extract() {...}
}
```

When the `extractor` is made up of more extractors (see [Multiple Extractors](#multiple-extractors)) it can be desirable to be able to choose which
extractor to run next depending on a condition in `beforeExtract`. This can be controlled by returning an object with the 
property `nextExctractorIndex` which determines the next extractor to run. E.g.

```
extractor: {
    beforeExtract: async function(page) {
        try {
            await page.waitFor('#my-element' {timeout: 5000});
            return 2;
        } catch(e) {
            return 3;
        }
    }
}
```

##### extractor.extract([template], [url])

- `template` - a clone of the template object returned by `dataTemplate()` or `null` if `dataTemplate()` is not defined
- `url` - the url or url object currently being processed

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

##### extractor.extractPuppeteer(page, [template], [url]) \<async>

- `page` - a puppeteer [`page`](https://github.com/puppeteer/puppeteer/blob/master/docs/api.md#class-page) instance. 
- `template` - a clone of the template object returned by `dataTemplate()` or `null` if `dataTemplate()` is not defined
- `url` - the url or url object currently being processed

Returns `Promise<?>`: the extraction result or one of: `null`, `undefined`, `[]` or `{}` if no result was found

Use this method of you need to have access to the `page` object and wants to its methods for extraction.

If both `extractor.extractPuppeteer` and `extractor.extract` is present `extractor.extractPuppeteer` will
be executed first.

To extract all paragraph text from a page you could do: 

```
extractor: {
    extractPuppeteer: async function(page) {
        let results = await page.$$('p', (elements) => elements.map((element) => element.textContent));
        return results;
    }
}
```

##### extractor.afterExtract(data, [url]) \<async>

- `data` - the extracted data from [extractor.extract](#extractorextracttemplate)
- `url` - the url or url object currently being processed

Returns: `Promise<data | undefined>` return the processed version of the passed in data or `undefined` 
if you will handle saving the data yourself 

This method will only be called on a successful return value from [extractor.extract](#extractorextracttemplate)

Use this method to do post processing of the extracted data or to handle further saving of data yourself. 
In the case of returning `undefined` the extractor chain will be broken and no further extractors will be called.

#### Multiple Extractors
Sometimes it is required to click buttons, wait for events to happen etc. to complete an extraction. The extractor can
then be divided into multiple sections by providing an array of objects with one or both of `beforeExtract` and `extract`. 
Each extractor will get passed the return value from the previous extractor so you can add to this to get a combined result 
(if present the `template` will be passed to the first object's `extract` method).

if an extractor return one of `null`, `undefined`, `[]` or `{}` the extraction chain will be aborted and no result will
be saved for this rule. If there are more rules the next rule in line will be tested.

To wait for an element to appear, extract some text, 
click next and extract some more text you could do:

```
extractor: [
    {
        beforeExtract: async function(page) {
            await page.waitFor('.popup');
        },
        extract: function() {
            let data = {
                popupPage1: document.querySelector('.popup-text').textContent;
            }
            return data;
        }
    }, {
        beforeExtract: async function(page) {
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
 


