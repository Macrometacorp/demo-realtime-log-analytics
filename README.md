# Realtime Log Analytics using GDN

Building real-time log analytics solution using GDN

![realtime-log-analytics2.png](readmeImages/realtime-log-analytics2.png)

### Setup

| **Federation** | **Email** | **Passsword** |
|------------|----------|--------------|
| [Global Data Network](https://gdn.paas.macrometa.io/) | demo@macrometa.io | `xxxxxxxx`| 
| [Log File](https://raw.githubusercontent.com/pzombade/mm-log-publisher/gh-pages/server.log) | -- | -- |
| [Log Publisher](https://macrometacorp.github.io/demo-realtime-log-analytics) | -- | -- |
| [Analytics Dashboard](https://dashboards.poc.macrometa.io/d/tWcKbZ8Mz/demo-realtime-log-analytics?orgId=1) | -- | -- |

**How To Run:**

**On Federation:**
> ```
> Create and publish following Stream Workers in your federation:
> 1. log_processor
> 2. agg_code_processor
> 3. agg_verb_processor
> 
> Following collections are created automatically:
> 1. http_verb_agg_count (doc collection)
> 2. http_code_agg_count (doc collection)
> 3. http_error_msgs (doc collection)
>
> Note: If you have run this tutorial before, you may want to truncate the collections.
> ```

**On Development Machine:**
> ```
> git clone https://github.com/Macrometacorp/tutorial-log-analytics.git
> cd tutorial-log-analytics
> git fetch
> git checkout gh-pages
> npm install
> browserify producer.js > bundle.js //required if you make any changes in the producer.js
> #Open index.html in browser.
> #Enter your federation details and click on Publish button. 
> #The logs will be published on `c8locals.input_log_stream`. The aggreation collections will be populated.
> ```

### Stream Workers

**log_processor:**

```
@App:name("log_processor")
@App:description("Process error logs")


-- Read the incoming log and extract verb, code, url, timestamp, body
define function parseLog[javascript] return string {

    var log = data[0];
    var key = data[1];
    const regex = /"[^"]+"|[^\s]+/g;
    const splittedLine = log.match(regex).map(e => e.replace(/"(.+)"/, "$1"));
    let [ipAddress, , , dateStr, seconds, headers, httpCode, , , body] = splittedLine;
    const [httpVerb, url] = headers.split(" ");
    
    // -- Round of the seconds  Ex. 11/Feb/2020:13:55:23 +0100 to 11/Feb/2020:13:55:00
    const timeStamp = dateStr.slice(1,-1).substr(0, dateStr.length-4)+":00";
    
    let response;
    
    if(key=='verb'){
       response = httpVerb.trim();
    }else if(key=='code'){
       response = httpCode;
    }else if(key=='url'){
       response = url;
    }else if(key=='timestamp'){
       response = timeStamp;
    }else if(key=='body'){
       response = body;
    }
    
    return response;
};


@info("Read logs from input_log_stream stream")
@source(type="c8streams", stream.list="input_log_stream", replication.type="local", @map(type='json'))
define stream input_log_stream(log string);

@info("Read logs from input_log_stream stream and publish them to the logger")
@sink(type="logger", priority='INFO')
define stream input_logger_stream(log string);

@info("Store the error logs in http_error_msgs table")
@store(type="c8db", collection="http_error_msgs", replication.type="global", @map(type='json'))
define table http_error_msgs(timestamp string, verb string, code int, url string, body string);

@info("Publish the log data on http_intermediate_agg_counts for further processing")
@sink(type='c8streams', stream='http_intermediate_agg_counts', replication.type="local", @map(type='json'))
define stream http_intermediate_agg_counts(timestamp string, verb string, code int, url string);

select log from input_log_stream
insert into input_logger_stream;

@info("Store the error logs into http_error_msgs collection")
SELECT
    parseLog(log, "timestamp") as timestamp,
    parseLog(log, 'verb') as verb,
    convert(parseLog(log, 'code'), 'int') as code,
    parseLog(log, 'url') as url,
    parseLog(log, 'body') as body
FROM input_log_stream[
    (convert(parseLog(log,'code'), 'int') >= 400) 
    and (convert(parseLog(log, 'code'), 'int') <= 599)
    and false==str:equalsIgnoreCase(parseLog(log, 'verb'), "EOF")
]
INSERT into http_error_msgs;


@info("Publish the log data on http_intermediate_agg_counts stream for further processing")
SELECT
    parseLog(log, 'timestamp') as timestamp,
    parseLog(log, 'verb') as verb,
    convert(parseLog(log, 'code'), 'int') as code,
    parseLog(log, 'url') as url
FROM input_log_stream
INSERT into http_intermediate_agg_counts;
```



**agg_code_processor:**

```
@App:name("agg_code_processor")
@App:description("Process aggregated code counts")


-- Populate and update the code-counter map. Increment counter value for the current verb
define function updateCache[javascript] return string {
    var code = data[0].toString();
    var cachedValue = data[1];
    let map = JSON.parse(cachedValue);
    typeof map[code] == 'undefined' ? map[code] = 1 : map[code]++;

    return JSON.stringify(map);
};


-- Convert the record into JSON
define function toJson[javascript] return object {
    const cache = data[0];
    let json =  JSON.parse(cache);
    const timestamp = new Date(data[1].replace(':',' ')).getTime() ;
    json.timestamp =  timestamp;

    return  json;
};

-- Collection does not support key having special caracter like / and :
-- Replace such characters with _ (underscore)
define function getKey[javascript] return string {
    return  data[0].replace(/\//g,"_").replace(/:/g,"_");
};


@store(type='c8db', collection='http_code_agg_counts', replication.type="global", @map(type='json'))
define table http_code_agg_counts(log object);

@source(type='c8streams', stream.list='http_intermediate_agg_counts', replication.type="local", @map(type='json'))
define stream http_intermediate_agg_counts(timestamp string, verb string, code int, url string);

@store(type='c8streams', collection='put_in_cache', replication.type="local", @map(type='json'))
define stream put_in_cache(isVerbPut bool, isTimestampPut bool, oldData bool);


-- Maintain timestamp from the log in the cache
select
    ifThenElse(cache:get(getKey(timestamp), "") == "", 
        cache:put(getKey(timestamp),updateCache(code, "{}")), 
        cache:put(getKey(timestamp),updateCache(code, cache:get(getKey(timestamp))))
    ) as isVerbPut,
    false as isTimestampPut,
    false as oldData
    from http_intermediate_agg_counts
insert into put_in_cache;


-- When a log with new minute arrives
-- Get the old timestamp value 
-- And the previously aggregated cached data for that timestamp 
-- Insert that into the collection.
-- Skip insert if previously aggregated cached data is not available. i.e., 1st log from the file
select
    toJson(cache:get("old_timestamp_data", ""), cache:get("old_timestamp", "")) as log
    from http_intermediate_agg_counts[
        false==str:equalsIgnoreCase(getKey(cache:get("old_timestamp_key", "")), getKey(timestamp))
        and false==str:equalsIgnoreCase(cache:get("old_timestamp_data", "") ,"")
    ]
INSERT into http_code_agg_counts;


-- Update the cache with
-- old_timestamp_key    Ex. `11_Feb_2020_13_56_00`
-- old_timestamp        Ex. `11/Feb/2020:13:56:00`
-- old_timestamp_data   Ex.  `{'map': { '200': 3, '400': 1, '401': 1, '505': 1 }}`
select
    cache:put("old_timestamp_key", getKey(timestamp)) as isVerbPut,
    cache:put("old_timestamp", timestamp) as isTimestampPut,
    cache:put("old_timestamp_data", cache:get(getKey(timestamp))) as oldData
    from http_intermediate_agg_counts[
        false==str:equalsIgnoreCase(verb, "EOF")
    ]
insert into put_in_cache;


-- Once file has been processed, it is required to purge the cache
-- The JS client app will send a dummy log with `EOF` text in the verb field
select
    cache:purge() as isVerbPut,
    false as isTimestampPut,
    false as oldData
    from http_intermediate_agg_counts[
        str:equalsIgnoreCase(verb, "EOF")
    ]
insert into put_in_cache;
```



**agg_verb_processor:**

```
@App:name("agg_verb_processor")
@App:description("Process aggregated verb counts")


-- Populate and update the verb-counter map. Increment counter value by 1 for the current verb.
define function updateCache[javascript] return string {
    var verb = data[0];
    var cachedValue = data[1];
    let map = JSON.parse(cachedValue);
    typeof map[verb] == 'undefined' ? map[verb] = 1 : map[verb]++;

    return JSON.stringify(map);
};

-- Convert the record into JSON
define function toJson[javascript] return object {
    const cache = data[0];
    let json =  JSON.parse(cache);
    const timestamp = new Date(data[1].replace(':',' ')).getTime() ;
    json.timestamp =  timestamp;

    return  json;
};

-- Collection does not support key having special caracter like / and :
-- Replace such characters with _ (underscore)
define function getKey[javascript] return string {
    return  data[0].replace(/\//g,"_").replace(/:/g,"_");
};


@source(type='c8streams', stream.list='http_intermediate_agg_counts', replication.type="local", @map(type='json'))
define stream http_intermediate_agg_counts(timestamp string, verb string, code int, url string);

@store(type='c8db', collection='http_verb_agg_counts', replication.type="global", @map(type='json'))
define table http_verb_agg_counts(log object);

@store(type='c8streams', collection='put_in_cache', replication.type="local", @map(type='json'))
define stream put_in_cache(isVerbPut bool, isTimestampPut bool,oldData bool);

-- Maintain timestamp from the log in the cache
select
ifThenElse(cache:get(getKey(timestamp),"") == "", 
    cache:put(getKey(timestamp),updateCache(verb,"{}")), 
    cache:put(getKey(timestamp),updateCache(verb,cache:get(getKey(timestamp))))) as isVerbPut,
false as isTimestampPut,
false as oldData
from http_intermediate_agg_counts
insert into put_in_cache;



-- When a log with new minute arrives
-- Get the old timestamp value 
-- And the previously aggregated cached data for that timestamp 
-- Insert that into the collection.
-- Skip insert if previously aggregated cached data is not available. i.e., 1st log from the file
select
    toJson(cache:get("old_timestamp_data",""), cache:get("old_timestamp","")) as log
from http_intermediate_agg_counts[false==str:equalsIgnoreCase(cache:get("old_timestamp_data",""),"")
    and false==str:equalsIgnoreCase(getKey(cache:get("old_timestamp_key","")), getKey(timestamp))]
INSERT into http_verb_agg_counts;


-- Update the cache with
-- old_timestamp_key    Ex. `11_Feb_2020_13_56_00`
-- old_timestamp        Ex. `11/Feb/2020:13:56:00`
-- old_timestamp_data   Ex.  `{'map': { '200': 3, '400': 1, '401': 1, '505': 1 }}`
select
    cache:put("old_timestamp_key",getKey(timestamp)) as isVerbPut,
    cache:put("old_timestamp",timestamp) as isTimestampPut,
    cache:put("old_timestamp_data",cache:get(getKey(timestamp))) as oldData
from http_intermediate_agg_counts[false==str:equalsIgnoreCase(verb,"EOF")]
insert into put_in_cache;


-- Once file has been processed, it is required to purge the cache
-- The JS client app will send a dummy log with `EOF` text in the verb field
select
    cache:purge() as isVerbPut,
    false as isTimestampPut,
    false as oldData
from http_intermediate_agg_counts[str:equalsIgnoreCase(verb,"EOF")]
insert into put_in_cache;
```


### Collections

- http_verb_agg_count (doc collection)
- http_code_agg_count (doc collection)
- http_error_msgs (doc collection)



### Search

Create a View called `c8search_view_http_error_msgs` with below JSON object.
It will apply search on `body` field of `http_error_msgs` collection.


```js
{
  "links": {
    "http_error_msgs": {
      "analyzers": [
        "identity"
      ],
      "fields": {
        "body": {
          "analyzers": []
        }
      },
      "includeAllFields": true,
      "storeValues": "none",
      "trackListPositions": false
    }
  },
  "primarySort": []
}
```

On the above view lets execute below query to search and fetch all the documents those mention `Safari` in the `body` field.

```js
FOR doc in c8search_view_http_error_msgs
SEARCH ANALYZER(doc.body IN TOKENS('Safari', 'text_en'), 'text_en')
SORT BM25(doc) desc 
RETURN doc
```


### Visualization

Please refer below 'c8-grafana-plugin' for visualization.<br/>
https://github.com/Macrometacorp/c8-grafana-plugin

Grafana Dashboard:
![grafana_dashboard.png](readmeImages/grafana_dashboard.png)

### Developer Notes

* `index.html` renders the UI of https://macrometacorp.github.io/demo-realtime-log-analytics . The page refers to `bundle.js` script. `bundle.js` is bundled version of `producer.js` and all of its dependencies.
* Each time you update the `producer.js` you need to rebuild the `bundle.js` file.<br/>
* Use below command to do the same. Also make sure you chekin `bundle.js` along with `producer.js`<br/>
`browserify producer.js > bundle.js`



