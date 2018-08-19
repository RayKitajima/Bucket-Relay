
"use strict";

const fs   = require('fs');
const path = require('path');

const spool = path.resolve(__dirname,"../next");

if( !fs.existsSync(spool) ){ fs.mkdirSync(spool); }

const filter = function(filenames){
	let responsible = [];
	for( let i=0; i<filenames.length; i++ ){
		if( filenames[i].match(/\.json$/) ){
			responsible.push(filenames[i]);
		}
	}
	return responsible;
};

const nexthop = function(filename){
	if( filename.match(/\.json$/) ){
		return 'archive';
	}
};

const network = {
	server   : "http://127.0.0.1:10088/",
	heatbeat : "*/10 * * * * *",
};

const log = function(msg){
	console.log(msg);
};

module.exports = {
	spool     : spool,
	max_conn  : 30,
	cron_time : "* * * * * *",
	filter    : filter,
	nexthop   : nexthop,
	log       : log,
	network   : network,
};

