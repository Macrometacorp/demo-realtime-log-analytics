const logFileURL = "https://raw.githubusercontent.com/pzombade/mm-log-publisher/gh-pages/testlogs.log"; // server / testlogs / noramlized ;
const startTime = new Date().getTime();

// Empty the values if we decide to get the email/password from the URL
let hostName, email, password, streamURL, streamName;
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

// Publish the incoming log to the stream
function pulbishLog(log) {
    $.ajax({
        url: streamURL,
        type: 'POST',
        contentType: 'application/json',
        data: convertToString(log),
        dataType: "json",
        async: false,
        success: function(result) { 
            // console.log("Success pulbishLog:", result); 
        },
        error: function(err) {  
            console.error('Failed in pulbishLog for the log: ', err); 
        },
        beforeSend: function (xhr) {
            xhr.setRequestHeader("Authorization", mmJwtToken);
        }
    });
}

function parseResult(result){
    var lines = result.split("\n");
    for (var i = 0, len = lines.length; i < len; i++) {
        pulbishLog(lines[i]);
        lines[i] = undefined;
        count++;
    }
}

// Validate the form fields and set the credentials
function setCredentials(){
    $("#msg").css("color", "#58a6e6").text("Verifying credentials...");
    $('#publishbtn').prop('disabled', true);
    $('#publishbtn').css('background-color', 'gainsboro');

    let isValidForm;
    hostName = `https://api-${$("#gdnUrl").val()}`;
    email = $("#email").val();
    password = $("#password").val();
    let fabricName = $("#fabric").val();
    streamName = $("#streamName").val();
    streamURL = `${hostName}/_fabric/${fabricName}/_api/streams/${streamName}/publish?global=false`;
    isValidForm = hostName && email && password; // Make sure valid values are in

    return isValidForm;
}

// Read the log file and start the publishing
function start() {
    if (!setCredentials()){
        return false;
    }
    
    setTimeout(function () {
        // Login and get the JWT Token
        $.ajax({
            url: `${hostName}/_open/auth`,
            type: 'POST',
            contentType: 'application/json',
            data: JSON.stringify({"email": email, "password": password}),
            datatype: 'json',
            async: false,
            success: function(result) {
                mmJwtToken = `bearer ${result.jwt}`;
                console.log("Got JWT token:", result); 

                //Read the log file and publish events
                $.ajax({
                    url: logFileURL,
                    type: 'GET',
                    datatype: 'application/json',
                    async: false,
                    success: function(logLines) {
                        $("#msg").text("Log streaming in progress...").css("color", "#58a6e6");
                        setTimeout(function () {
                            parseResult(logLines);
                            publishEOF();
                            const endTime = new Date().getTime();
                            const time = ( endTime - startTime) / 1000;
        
                            $('#publishbtn').prop('disabled', false);
                            $('#publishbtn').css('background-color', '#58a6e6');
                            $("#msg").text("Log streaming completed").css("color", "#58a6e6");
                            console.log(`Published ${count} logs in ${time} seconds. It will take some time to reflect aggregated records in the collection.`);
                        }, 1000);    
                    },
                    error: function(logFileError) {
                        $('#publishbtn').prop('disabled', false);
                        $('#publishbtn').css('background-color', '#58a6e6');
                        $("#msg").text("Failed to get the log file.").css("color", "red");
                        console.error('Error while getting the log file:', JSON.parse(logFileError));
                    },
                }); 
            },
            error: function(loginError) {
                $('#publishbtn').prop('disabled', false);
                $('#publishbtn').css('background-color', '#58a6e6');
                $("#msg").text("Failed to login").css("color", "red");
                console.error('Failed in loing:', JSON.parse(loginError)); 
            }
        });
    }, 1000);
}