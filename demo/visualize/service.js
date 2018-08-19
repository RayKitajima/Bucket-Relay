
"use strict";

const cronJob = require('cron').CronJob;
const http    = require('http');
const url     = require('url');
const path    = require('path');
const fs      = require('fs');

const spool    = path.resolve(__dirname,"spool");
const next     = path.resolve(__dirname,"next");
const doc_root = path.resolve(__dirname);

if( !fs.existsSync(spool) ){ fs.mkdirSync(spool); }
if( !fs.existsSync(next) ){ fs.mkdirSync(next); }

const stack = []; // last 100 entries

const load = function(){
	let files = fs.readdirSync(spool);
	for( let i=0; i<files.length; i++ ){
		if( files[i].match(/\.json$/)  ){
			let file_path = path.resolve(spool,files[i]);
			let data = JSON.parse(fs.readFileSync(file_path,'utf8'));
			if( stack.length > 100 ){
				stack.shift();
			}
			stack.push(data);
			let next_path = path.resolve(next,files[i]);
			fs.renameSync(file_path,next_path);
		}
	}
};

const job = new cronJob({
	cronTime : '* * * * * *',
	onTick   : load,
	start    : false
});

const web = function(file_path,res){
	file_path.replace(/[\.\.|~|^\.]/g,''); // quick sanitize
	file_path = doc_root + file_path;
	
	fs.readFile(file_path,function(err,data){
		if( err ){
			res.statusCode = 404;
			return res.end();
		}
		res.end(data);
	});
};

const gate = function(req,res){
	let request_url = url.parse(req.url,true);
	let match;
	match = request_url.pathname.match(/^\/data/);
	if( match ){
		res.writeHead(200,{'content-type':'application/json'});
		return res.end(JSON.stringify(stack));
	}
	match = request_url.pathname.match(/^\/web/);
	if( match ){
		web(request_url.pathname,res);
	}else{
		res.statusCode = 404;
		res.end();
	}
};

const server = http.createServer(function(req,res){
	if( req.method == 'GET' ){
		gate(req,res);
	}else{
		res.statusCode = 500;
		res.end();
	}
});

job.start();

server.listen(10092,function(){
	console.log("Realtime loadavg chart is served on:");
	console.log("http://127.0.0.1:10092/web/index.html");
});

