const jsc8 = require('jsc8');
const fs = require('fs');
const readline = require('readline');

// Configure the federation details
const global_url = "https://prashant.eng.macrometa.io";
const userName = "mm@macrometa.io";
const password = "Macrometa123!@#";

// Configure log file and input stream name if required
const logFilePath = "./server.log"; // testlogs.log can be used for testing. It has fewer logs.
const input_log_stream = "input_log_stream";

const eofFlag = "EOF";
let count = 0;
let producer;
let rd;
const start = new Date().getTime();

async function handlePublish (line) {
  const message = {
    "log":line,
  };
  const payloadObj = { payload: Buffer.from(JSON.stringify(message)).toString("base64") };
  producer.send(JSON.stringify(payloadObj));
  count++;
}

async function processLineByLine() {
  rd = readline.createInterface({
    input: fs.createReadStream(logFilePath),
    console: false
  });

  console.log("About to start the processing:", new Date());
  
  rd.on('line', function(line) {
      try{
        handlePublish(line);
      }catch(error){
        console.error("Could not process line:",line);
      }
  });

  rd.on('close', function(line) {
    
    // This is important line. 
    // The line has `EOF` flag that will be read as `verb`
    // This gives indication to log_processor app that log file has been processed till the end
    // CEP App will then purge the cached
    const eofLog=`13.66.139.0 - - [12/Feb/2021:00:00:23 +0100] "${eofFlag} /index.php?option=com_phocagallery&view=category&id=1:almhuette-raith&Itemid=53 HTTP/1.1" 404 32653 "-" "Mozilla/5.0 (compatible; bingbot/2.0; +https://www.macrometa.com)" "-"`;
    
    console.log("Finished all the logs in the log file. Sending EOF flag.");
    handlePublish(eofLog);
    const end = new Date().getTime();
    const time = ( end - start) / 1000;
    console.log(`Published ${count} logs in ${time} seconds.`);
  });
}

(async function() {
  const client = new jsc8(global_url);
  await client.login(userName, password);
    
  try{
    producer = await client.createStreamProducer(input_log_stream, true);
  }catch(error){
    console.error("Error at createStreamProducer",error);
  }
  await producer.on("open", processLineByLine);
})();
