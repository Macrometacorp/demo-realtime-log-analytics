<!DOCTYPE html>
<html>
<head>
<script src="https://ajax.googleapis.com/ajax/libs/jquery/3.5.1/jquery.min.js"></script>
<script>

function convert(line){
    const message = {
    "log":line,
  };
  return JSON.stringify(message);    
}

function pulbish(log) {
    $.ajax({
        url: 'https://api-prashant.eng.macrometa.io/_fabric/_system/_api/streams/c8locals.input_log_stream/publish?global=false',
        type: 'POST',
        contentType: 'application/json',
        callback: '?',
        data: convert(log),
        datatype: 'application/json',
        success: function(result) { 
            console.log(result); 
        },
        error: function(err) {  
            console.log('Failed!' + err); 
        },
        beforeSend: function (xhr) {
            xhr.setRequestHeader("Authorization", "bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpYXQiOjEuNjEzODk2MjU3NTIwNDMwN2UrNiwiZXhwIjoxNjEzOTM5NDU3LCJpc3MiOiJtYWNyb21ldGEiLCJwcmVmZXJyZWRfdXNlcm5hbWUiOiJyb290IiwidGVuYW50IjoiX21tIn0=.hFeltAtpjna7IM20AQ_Qxr6P8ZKzZW0SFkS5-hWzQxQ=");
        }
    });
}

function startPublishing() {
    $.ajax({
        url: 'https://raw.githubusercontent.com/Macrometacorp/tutorial-log-analytics/main/testlogs.log?token=ARWTGKNQHDVNPYLKZHUOGQ3AHNISC',
        type: 'GET',
        callback: '?',
        datatype: 'application/json',
        success: function(result) { 
            console.log(result); 
            var lines = result.split("\n");
            for (var i = 0, len = lines.length; i < len; i++) {
                console.log("Read >> " + lines[i]);
                pulbish(lines[i]);
            }
        },
        error: function() { alert('Failed!'); },
        //beforeSend: setHeader

    });  
}

// A $( document ).ready() block.
$( document ).ready(function() {
    console.log( "Starting to publish..." );
    startPublishing();
});

</script>
</head>
<body>
    
   <h3>Publishing has alreday been started while the page was being loaded...</h3></br>
   Optionally if required we can have this  this button to publish the events again <button onclick="startPublishing()">Click me</button> 
</body>
</html>
