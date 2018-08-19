
"use strict";

const http  = require('http');
const url   = require('url');
const fs    = require('fs');
const path  = require('path');

const spool = path.resolve(__dirname,"spool");

if( !fs.existsSync(spool) ){ fs.mkdirSync(spool); }

const server = http.createServer(function(req,res){
	let request_url = url.parse(req.url,true);
	
	let msg   = request_url.query.msg;
	let fname = 'raw_msg_' + Date.now() + '.json';
	let fpath = path.resolve(spool,fname);
	fs.writeFileSync(fpath,msg);
	
	res.writeHead(200,{'content-type':'application/json'});
	return res.end(JSON.stringify({success:1}));
});

server.listen(10091,function(){
	console.log("listening on port: 10091");
});

