
# bucket-relay

Buket-Relay is a bucket brigade architecture to build a flexible micro services network as your streaming processor for unstructured data.
Espacially for prosessor like for IoT solution, order processing, transportation tracking.
This is a stream engine for event object file across your micro services pool.


## Architecture

``` 
                          (network server)
                                  ^
                                  :
           +. . . . . . . . . . . + . . . . . . . . . . . +
           :                      :                       :
           v                      v                       v
    +----------+         +-----------+            +----------+
    | uploader |-(http)->| collector |            | uploader |.....>    <object streaming layer>
    +----------+         +-----------+            +----------+
      ^                         |                   ^
      |                         v                   |
 +      +                     +       +          +      +
 | next |                     | spool |          | next |
 +---+--+                     +----+--+          +-+----+
     ^                             :               ^
     : output file        use file :               : out used file
     :                             :               :
 (service)                         +...(service)...+                    <maicro-services layer>
``` 

1. A service output a `file`.
2. **uploader** send the `file` to **collector**s who like to consume the `file`. Those consumers would be found by **network server**.
3. **collector** get the `file`, and stack it to the `spool`.
4. A service use the `file`. And move it to the `next` place. (It may modify the file.)
5. **uploader** send the `file` to ......

* uploader represented by **bucket-uploader** command
* collector represented by **bucket-collector** command
* network server represented by **bucket-network** command
* A servcie would be implemented by you, to solve your problem


## Demo

![demo](https://user-images.githubusercontent.com/4404088/44306219-51bc9b80-a3c5-11e8-8ce2-ddbe1100333d.gif)

```
                                    (visualizer)
                                         :
                                         :
+--------+         +---------+     +-----+-----+     +---------+
| sensor |-------->| gateway |---->| visualize |---->| archive |
+--------+         +---------+     +-----------+     +---------+
                                                          :
                                                          v
                                                      (warehouse/YYYY-MM-DD)
                           +- - - - -+
                           : network :
                           +- - - - -+
```

* **sensor** reports your os.loadavg() every sec.
* **gateway** recieves loadavg report. And send it to **visualize**.
* **visualize** caches latest 10sec report for web client (**visualizer**). And send it to **archive**.
* **archive** stacks reports into `warehouse/YYYY-MM-DD`.
* **network** provides structure of above uploader/collector nodes, and get heatbeat from them to automatically regress network structure against unexpected or expected service stop. _(the **network** is optional. you can use statically defined network structure by using second argument for uploader/collector command)_

To run demo, it is easy to use [quick-pm](https://github.com/RayKitajima/Quick-PM) a simple process manager:

``` 
$ git clone https://github.com/RayKitajima/Bucket-Relay.git
$ cd Bucket-Relay
$ npm install quick-pm

$ quick-pm demo/dyanmic.hjson *1
$ open http://127.0.0.1:10092/web/index.html

$ quick-pm demo/static.hjson *2
``` 

*1 use dynamic network configuration  
*2 use statically defined network

<details>
<summary>otherwise you can run it manually:</summary>

``` 
$ git clone https://github.com/RayKitajima/Bucket-Relay.git
$ cd Bucket-Relay

// network server
$ node lib/bucket-network.js demo/network/dynamic.js

// gateway : collecting the loadavg report
$ node demo/gateway/service.js
$ node lib/bucket-uploader.js demo/gateway/conf/uploader.js

// visualize : realtime chart
$ node demo/visualize/service.js
$ node lib/bucket-collector.js demo/visualize/conf/collector.js
$ node lib/bucket-uploader.js demo/visualize/conf/uploader.js

// archive : report log
$ node demo/archive/service.js
$ node lib/bucket-collector.js demo/archive/conf/collector.js

// sensor : report loadavg of your machine
$ node demo/sensor/loadavg.js
``` 

</details>


## Usage

``` 
$ npm install bucket-relay

$ bucket-network dynamic_network_config.js *1

$ bucket-upload uploader_config.js *2
$ bucket-collector collector_config.js static_network_config.js *3
``` 

*1 booting network server  
*2 uploader working with network  
*3 collector working with static network definition

Whether to use dynamic or static network should be consensus of your micro-services network.


## Configuration

Configuration is defined as JavaScript file, that should honor some module.exports contract.

### bucket-uploader

| name      | what is                                                                     |
|:----------|:----------------------------------------------------------------------------|
| spool     | where upload file is saved in                                               |
| max_conn  | max http thread                                                             |
| cron_time | frequency of spool directory check, as cron expression: "\* \* \* \* \* \*" |
| filter    | how to filter files from spool directory                                    |
| nexthop   | how to define name of nexthop cluster for a file                            |
| log       | logging function called by core module with an argument of string message   |
| network   | optional: defines network server and heatbeat interval (as cron expression) |

<details>
<summary>example:</summary>

``` 
module.exports = {
	spool     : '/path/to/spool',
	max_conn  : 30,
	cron_time : '*/10 * * * * *',
	filter    : function(files){ files.filter( v => v.match(/\.json|\.log$/) ); },
	nexthop   : function(f){ if( f.match(/\.json$/) ){ return 'cluster1' }else{ return 'cluster2' } },
	log       : function(msg){ console.log(msg); },
	network   : { server:'127.0.0.1:10088', heatbeat:'*/30 * * * * *' },
};
``` 

</details>

### bucket-collector

| name    | what is                                                                     |
|:--------|:----------------------------------------------------------------------------|
| id      | optional: if you use static network, define your unique id                  |
| address | listen address                                                              |
| port    | listen port                                                                 |
| spool   | where to write out collected files                                          |
| log     | logging function called by core module with an argument of string message   |
| network | optional: defines network server and my cluster name, and heatbeat interval |

<details>
<summary>example:</summary>

``` 
module.exports = {
	id      : 'json_consumer_1'
	address : '127.0.0.1',
	port    : 10100,
	spool   : /path/to/spool,
	log     : function(msg){ console.log(msg); },
	network : { server:"http://127.0.0.1:10088/", cluster:'cluster1', heatbeat:"*/10 * * * * *" }
};
``` 

</details>


### bucket-network

| name     | what is                                                  |
|:---------|:---------------------------------------------------------|
| server   | defines listen address and port                          | 
| clusters | start point of publishing port to be used by collectors  |

network server publishes port to collectors. That is simply incremented from clusters.port.start.

<details>
<summary>example:</summary>

```
module.exports = {
	server   : { address:'127.0.0.1', port:10088 },
	clusters : { port:{start:10100} }
};
```

</details>

### static network definition

If you want to work with statically defined network structure, you can do it by passing second argument to the uploader/collector command.
The configuration file also should have some module.exports contract.

| name      | what is           |
|:----------|:------------------|
| clusters  | hash with<br>key: \<cluster name\><br>value: list of collectors binded by the name |

collector info:

| name      | sub-property      |
|:----------|:------------------|
| id        | unique id         |
| address   | collector address |
| port      | collector port    |

example:

``` 
module.exports = {
	clusters : {
		cluster1 : [ { id:'json_consumer_1', address:'127.0.0.1', port:10100 } ],
		cluster2 : [ { id:'log_consumer_1', address:'127.0.0.1', port:10101 } ]
	}
};
``` 

## License

MIT

