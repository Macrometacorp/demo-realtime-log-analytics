const jsc8 = require('jsc8');

// Configure log file and input stream name if required
const logFileURL = "https://raw.githubusercontent.com/pzombade/mm-log-publisher/gh-pages/server.log"; // server / testlogs / noramlized ;
const consoleLogSize = 300; // number of logs to be shown in the console

let startTime, count = 0;
let producer, fabricName, hostName, email, password;


// Publish the log on the producer stream
async function pulbishLog(line) {
    const message = {
        "log":line,
    };

    const payloadObj = { payload: Buffer.from(JSON.stringify(message)).toString("base64") };
    
    setTimeout(function () {
        producer.send(JSON.stringify(payloadObj));
    }, 1000); 

    
}
   

// Publish the EOF file message
function publishEOF(){
    const eofFlag = "EOF";
    console.log("Sending EOF flag...");
    const eofLog=`14.66.139.0 - - [12/Feb/2021:00:00:23 +0100] "${eofFlag} /index.php?option=com_phocagallery&view=category&id=1:almhuette-raith&Itemid=53 HTTP/1.1" 404 32653 "-" "Mozilla/5.0 (compatible; bingbot/2.0; +https://www.macrometa.com)" "-"`;
    pulbishLog(eofLog);
    const endTime = new Date().getTime();
    const time = ( endTime - startTime) / 1000 / 60;

    $('#publishbtn').prop('disabled', false);
    $('#publishbtn').css('background-color', '#58a6e6');
    $("#msg").text(`Log streaming completed. Published ${count} logs.`).css("color", "#58a6e6");
    count = 0;
    console.log(`Published ${count} logs in ${time} minutes. It will take some time to reflect aggregated records in the collection.`);
}


// Parse the file into single lines
async function parseLogLines(result){
    var lines = result.split("\n");
    const length = lines.length;
    
    for (var i = 0; i < length; i++) {

        // Append the last 300 logs - TODO - This should be dynamic
        // if(length-i <= consoleLogSize){
        //     $("textarea#logstextarea").val($("textarea#logstextarea").val()+"\n"+lines[i]);
        // }
        
        await pulbishLog(lines[i]);
        lines[i] = undefined;
        count++;

        // When last line is reached publish EOF
        if( i+1 >= lines.length ){
            publishEOF();
        }
    }
}


// Get the log file
async function getLogFile() {
    $.ajax({
        url: logFileURL,
        type: 'GET',
        datatype: 'application/json',
        async: false,
        success: function(logLines) {
            $("#msg").text("Log streaming in progress...").css("color", "#58a6e6");
            setTimeout(function () {
                parseLogLines(logLines);
            }, 1000); 
        },
        error: function(logFileError) {
            $('#publishbtn').prop('disabled', false);
            $('#publishbtn').css('background-color', '#58a6e6');
            $("#msg").text("Failed to get the log file.").css("color", "red");
            console.error('Error while getting the log file:', JSON.parse(logFileError));
        },
    }); 
}


// Validate the form fields and set the credentials
function setCredentials(){
    $("#msg").css("color", "#58a6e6").text("Verifying credentials...");
    $('#publishbtn').prop('disabled', true);
    $('#publishbtn').css('background-color', 'gainsboro');

    hostName = `https://${$("#gdnUrl").val()}`;
    email = $("#email").val();
    password = $("#password").val();
    fabricName = $("#fabric").val();
    streamName = $("#streamName").val();
    const isValidForm = !!(hostName && email && password && fabricName && streamName); // Make sure valid values are in

    return isValidForm;
}


// Verify the credentials and prepare the client and producer
async function start() {

    startTime = new Date().getTime()
    //$("textarea#logstextarea").val("");
    
    if (!setCredentials()){
        $('#publishbtn').prop('disabled', false);
        $('#publishbtn').css('background-color', '#58a6e6');  
        alert("Please provide valid details. All fields are mandatory.");
        return false;
    }  

    try{
        const client = new jsc8({url: hostName, fabricName: fabricName});
        await client.login(email, password);
        //client.useFabric(fabricName);
        const isLocalStream = streamName.startsWith("c8locals");
        streamName = streamName.substring(streamName.indexOf(".") + 1);
        producer = await client.createStreamProducer(streamName, isLocalStream);

        // Start the processing
        await producer.on("open", getLogFile);
    }catch(error){
        $('#publishbtn').prop('disabled', false);
        $('#publishbtn').css('background-color', '#58a6e6');
        $("#msg").text(`Failed to login: ${error.message}`).css("color", "red");
        console.error('Failed in login in go', JSON.parse(error));
    }
}


// Handle th Publish button from browser
window.publish = function(){
    start();
}