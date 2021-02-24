const logFileURL = "https://raw.githubusercontent.com/pzombade/mm-log-publisher/gh-pages/server.log"; //server / testlogs;
const streamName = "c8locals.input_log_stream";
const startTime = new Date().getTime();
let streamURL;

// Empty the values if we decide to get the email/password from the URL
let hostName, email, password;
let mmJwtToken;
let count = 0;

// Convert the message to string
function convertToString(line){
    const message = {
        "log":line,
    };
    return JSON.stringify(message);    
}

// Publish the EOF file message
function publishEOF(){
    const eofFlag = "EOF";
    console.log("Sending EOF flag...");
    const eofLog=`13.66.139.0 - - [12/Feb/2021:00:00:23 +0100] "${eofFlag} /index.php?option=com_phocagallery&view=category&id=1:almhuette-raith&Itemid=53 HTTP/1.1" 404 32653 "-" "Mozilla/5.0 (compatible; bingbot/2.0; +https://www.macrometa.com)" "-"`;
    pulbishLog(eofLog);
}

// Get the JWT Token
function getMMJwtToken(email, password){
    $.ajax({
        url: `${hostName}/_open/auth`,
        type: 'POST',
        contentType: 'application/json',
        data: JSON.stringify({"email": email, "password": password}),
        datatype: 'json',
        async: false,
        success: function(result) {
            mmJwtToken = `bearer ${result.jwt}`;
            console.log("Got JWT token: ", result); 
        },
        error: function(err) {  
            console.log('Failed in getMMJwtToken:' + err); 
        }
    });
}

// Publish the incoming log to the stream
function pulbishLog(log) {
    $.ajax({
        url: streamURL,
        type: 'POST',
        contentType: 'application/json',
        data: convertToString(log),
        datatype: 'application/json',
        async: false,
        success: function(result) { 
            // console.log("Success pulbishLog:", result); 
        },
        error: function(err) {  
            console.log('Failed in pulbishLog for the log: ' + err); 
        },
        beforeSend: function (xhr) {
            xhr.setRequestHeader("Authorization", mmJwtToken);
        }
    });
}

function parseResult(result){
    var lines = result.split("\n");
    for (var i = 0, len = lines.length; i < len; i++) {
        //console.log("Read >> " + lines[i]);
        pulbishLog(lines[i]);
        count++;
    }
}

// Validate the form fields and set the credentials
function setCredentials(){
    let isValidForm;
    hostName = `https://api-${$("#gdnUrl").val()}`;
    email = $("#email").val();
    password = $("#password").val();
    let fabricName = $("#fabric").val();
    streamURL = `${hostName}/_fabric/${fabricName}/_api/streams/${streamName}/publish?global=false`;
    isValidForm = hostName && email && password; // Make sure valid values are in

    return isValidForm;
}

// Read the log file and start the publishing
function start() {
    $('#publish-button').prop('disabled', true);
    $('#publish-button').css('background-color', 'gainsboro');
    
    if (!setCredentials()){
        alert("Please provide valid GDN URL, User Name and Password.");
        return false;
    }
    
    //Read the log file and publish events
    $.ajax({
        url: logFileURL,
        type: 'GET',
        datatype: 'application/json',
        async: false,
        success: function(result) { 
            console.log(result);
            getMMJwtToken(email, password);
            parseResult(result);
            publishEOF();
            const endTime = new Date().getTime();
            const time = ( endTime - startTime) / 1000;
            console.log(`Published ${count} logs in ${time} seconds. It will take some time to reflect aggregated records in the collection.`);
            $('#publish-button').prop('disabled', false);
            $('#publish-button').css('background-color', '#58a6e6');
        },
        error: function(err) { 
            console.log('Failed in main:', err); 
        },
    });  
}