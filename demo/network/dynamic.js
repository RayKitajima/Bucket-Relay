
// 
// network server configuration for demo system
// 
// usage:
// 
//     $ bucket-network demo/network/dynamic.js
// 

"use strict";

module.exports = {
	server   : { address:'127.0.0.1', port:10088 },
	clusters : { port:{start:10100} }
};
