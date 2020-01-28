const fs = require('fs');
const readline = require('readline');
const targetFile = 'cmp-data.json';
const newFileName = 'errorUrls.txt'

const cmps = []
async function processLineByLine() {
  const fileStream = fs.createReadStream(targetFile);

  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  for await (const line of rl) {
    let JSONline = JSON.parse(line);
    let dataOfInterest = JSONline.cmpName;
    
    cmps.push(dataOfInterest)
    
    // fs.appendFile(newFileName, dataOfInterest, (err) => {
    //   if (err) throw err;
    //   console.log(dataOfInterest.trim() + ' was appended to ' + newFileName);
    // });
  }
  let frequency = {}
  cmps.forEach(function(x) { frequency[x] = (frequency[x] || 0)+1; });
  console.log(frequency, "total: " + cmps.length)
}

processLineByLine();
