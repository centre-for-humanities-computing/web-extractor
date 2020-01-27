# Cmp Extractor
A tool for extracting Consent Management Provider data.

Provided a list of urls and a set of extraction rules Cmp-extractor loads each url 
and test each rule against the web page until a rule succeeds or there are no more rules. If a rule 
succeeds the data described in the rules extract method is exported.

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
$ node run -h 
```

### CLI options
- `-u, --urls <file>` [required] - A path for file with a list of urls for extraction. Each url should be on it's own line
- `-d, --destination <directory>` [required] - A path to the dir where data should be saved. If the dir already contains previous collected data the new data will be appended to the existing files
- `-c, --concurrency <integer>` [optional, default=25] - The maximum simultaneous loaded web pages
- `-n, --no-screenshot` [optional] - Disable screenshots
- `-t, --page-timeout <integer>` [optional, default=60000] - Milliseconds to wait for the initial loading of a page
- `-i, --use-id-for-screenshot-name` [optional] - Use an universal unique id for screenshot names instead of the url
- `-x, --debug` [optional] - Print more detailed error information

### Full Example
```
$ -u /data/urls.txt-d /data/cmp-crawls -c 35 -t 90000
```
*Analyze each url in '/data/urls.txt' and save the results '/data/cmp-crawls'. 
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


# TODO
Lav dokumentation færdig.

Beskriv hvordan man nye regler og fjerner eller disabler regler.


