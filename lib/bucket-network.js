
"use strict";

const http  = require('http');
const url   = require('url');
const fs    = require('fs');
const path  = require('path');
const hjson = require('hjson');

const config_file = path.resolve(process.argv[2]);

let config   = '';
let clusters = {}; // { cluster_name: { id:{ address:address, port:port } } }
let id_map   = {}; // id:name
let port_set = new Set(); // collection of published port

const configure = function(){
	config = require(config_file);
};

const publish_id = function(){
	return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g,function(c){
		let r = Math.random()*16|0,v=c=='x'?r:r&0x3|0x8; return v.toString(16); }).toUpperCase();
};

const publish_port = function(){
	let port;
	if( port_set.size > 0 ){
		let ports = Array.from(port_set.keys());
		port = Math.max.apply(null,ports) + 1;
	}else{
		port = config.clusters.port.start;
	}
	port_set.add(port);
	return port;
};

// *    *    *    *    *    *    *    *    *    *    *    *    *    *    *    *    *    *    *    * 

const api_register = function(query,callback){
	let name    = query.cluster; // cluster_name
	let address = query.address;
	let port    = query.port || publish_port(); // network confirmation or regression if port defined
	let id      = query.id   || publish_id();   // (same)
	if( !clusters[name] ){ clusters[name] = {}; }
	id_map[id] = name;
	clusters[name][id] = { address:address, port:port };
	callback(false,JSON.stringify({ id:id, port:port }));
};

const api_remove = function(query,callback){
	let id = query.id;
	let name = id_map[id]; // cluster_name
	if( clusters[name] ){
		let port = clusters[name][id].port;
		delete clusters[name][id];
		delete id_map[id];
		port_set.delete();
		callback(false,JSON.stringify({success:1}));
	}else{
		callback(true);
	}
};

// *    *    *    *    *    *    *    *    *    *    *    *    *    *    *    *    *    *    *    * 

const gate = function(req,res){
	let request_url = url.parse(req.url,true);
	let match;
	match = request_url.pathname.match(/^\/clusters/);
	if( match ){
		res.writeHead(200,{'content-type':'application/json'});
		return res.end(JSON.stringify(clusters));
	}
	match = request_url.pathname.match(/^\/register/);
	if( match ){
		return api_register(request_url.query,function(err,result){
			if( err ){
				res.statusCode = 500;
				return res.end();
			}else{
				res.writeHead(200,{'content-type':'application/json'});
				return res.end(result);
			}
		});
	}
	match = request_url.pathname.match(/^\/remove/);
	if( match ){
		return api_remove(request_url.query,function(err,result){
			if( err ){
				res.statusCode = 500;
				return res.end();
			}else{
				res.writeHead(200,{'content-type':'application/json'});
				return res.end(result);
			}
		});
	}else{
		res.statusCode = 500;
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

process.on('SIGHUP',configure);

configure();

server.listen(config.server.port,function(){
	console.log("listening on port "+config.server.port);
});

