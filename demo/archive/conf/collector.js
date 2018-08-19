
"use strict";

const fs   = require('fs');
const path = require('path');

const spool = path.resolve(__dirname,"../spool");

if( !fs.existsSync(spool) ){ fs.mkdirSync(spool); }

const log = function(msg){
	console.log(msg);
};

const network = {
	server   : "http://127.0.0.1:10088/",
	cluster  : "archive",
	heatbeat : "*/10 * * * * *",
};

module.exports = {
	id      : 'archive_1',
	address : '127.0.0.1',
	port    : 10101,
	spool   : spool,
	log     : log,
	network : network,
};

