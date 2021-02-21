<!DOCTYPE html>
<html>
<head>
<script src="https://ajax.googleapis.com/ajax/libs/jquery/3.5.1/jquery.min.js"></script>
<script>

function pulbish(log) {
    $.ajax({
        url: 'https://api-prashant.eng.macrometa.io/_fabric/_system/_api/streams/c8locals.input_log_file/publish?global=false',
        type: 'POST',
        contentType: 'application/json',
        callback: '?',
        data: log,
        datatype: 'application/json',
        success: function(result) { 
            console.log(result); 
        },
        error: function(err) {  
            console.log('Failed!' + err); 
        },
        beforeSend: function (xhr) {
            xhr.setRequestHeader("Authorization", "bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpYXQiOjEuNjEzODk3MTIxODQwMDM3NGUrNiwiZXhwIjoxNjEzOTQwMzIxLCJpc3MiOiJtYWNyb21ldGEiLCJwcmVmZXJyZWRfdXNlcm5hbWUiOiJyb290IiwidGVuYW50IjoiX21tIn0=.FYWWFtBnnxVhO-hBvVbNZUhSMJddtoow3yMCtKz2dBI=");
        }
    });
}

function startPublishing() {
    $.ajax({
        url: 'https://raw.githubusercontent.com/Macrometacorp/tutorial-log-analytics/main/testlogs.log?token=ARWTGKNQHDVNPYLKZHUOGQ3AHNISC',
        type: 'GET',
        callback: '?',
     //   data: myData,
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
</script>
</head>
<body>

<h2>This is a heading</h2>

<p>This is a paragraph.</p>
<p>This is another paragraph.</p>

<button onclick="startPublishing()">Click me</button>

</body>
</html>
