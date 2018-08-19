
// 
// static network configuration for demo system
// 
// usage:
// 
//     $ bucket-uploader demo/visualize/uploader.js demo/network/static.js
//     $ bucket-collector demo/visualize/collector.js demo/network/static.js
//         :
// 

"use strict";

module.exports = {
	clusters : {
		visualize : [ { id:'visualize_1', address:'127.0.0.1', port:10100 } ],
		archive   : [ { id:'archive_1',   address:'127.0.0.1', port:10101 } ]
	}
};
