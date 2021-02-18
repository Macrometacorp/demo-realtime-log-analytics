const jsc8 = require('jsc8');
const fs = require('fs');
const readline = require('readline');

// Configure the federation
const global_url = "https://prashant.eng.macrometa.io";
const userName = "mm@macrometa.io";
const password = "Macrometa123!@#";

const logFilePath = "./server.log";
const input_log_stream = "input_log_stream";

const client = new jsc8(global_url);
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
    const lastLog=`13.66.139.0 - - [12/Feb/2020:00:00:23 +0100] "EOF /index.php?option=com_phocagallery&view=category&id=1:almhuette-raith&Itemid=53 HTTP/1.1" 404 32653 "-" "Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)" "-"`;
    console.log("Finished all the logs in the log file. Sending EOF flag.");
    handlePublish(lastLog);
    const end = new Date().getTime();
    const time = ( end - start) / 1000;
    console.log(`Published ${count} logs in ${time} seconds.`);
  });
}

(async function() {
  await client.login(userName, password);
    
  try{
    producer = await client.createStreamProducer(input_log_stream, true);
  }catch(error){
    console.error("Error at createStreamProducer",error);
  }
  await producer.on("open", processLineByLine);
})();
