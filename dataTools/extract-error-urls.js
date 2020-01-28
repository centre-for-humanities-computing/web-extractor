const fs = require('fs');
const readline = require('readline');
const targetFile = 'errors.json';
const newFileName = 'errorUrls.txt'

async function processLineByLine() {
  const fileStream = fs.createReadStream(targetFile);

  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  for await (const line of rl) {
    let JSONline = JSON.parse(line);
    let dataOfInterest = JSONline.url + '\r\n';
    
    fs.appendFile(newFileName, dataOfInterest, (err) => {
      if (err) throw err;
      console.log(dataOfInterest.trim() + ' was appended to ' + newFileName);
    });
  }
}

processLineByLine();
