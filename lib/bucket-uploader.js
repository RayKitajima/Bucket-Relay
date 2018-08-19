
"use strict";

const cronJob = require('cron').CronJob;
const fs      = require('fs');
const path    = require('path');
const http    = require('http');

const config = require(path.resolve(process.argv[2]));

let file_working = 0;  // number of files now being in sending process
let send_working = {}; // number of sending process now working

const configure = function(callback){
	if( !config.max_conn ){
		config.max_conn = 30; // default
	}
	if( process.argv[3] ){
		const clusters = require(path.resolve(process.argv[3]));
		config.clusters = clusters.clusters;
		if( callback ){ callback(); }
	}else{
		if( config.network ){
			http.get(`${config.network.server}clusters`,function(res){
				let body = '';
				res.setEncoding('utf8');
				res.on('data',function(chunk){ body += chunk; });
				res.on('end',function(res){
					// { cluster_name: { id: { address:, port: } } } -> { cluster_name : [{id:, address:, port: }] }
					let raw_clusters = JSON.parse(body);
					let names = Object.keys(raw_clusters);
					let clusters = {};
					for( let i=0; i<names.length; i++ ){
						let raw_cluster = raw_clusters[names[i]];
						let ids = Object.keys(raw_cluster);
						let cluster = [];
						for( let j=0; j<ids.length; j++ ){
							let node = raw_cluster[ids[j]];
							node.id = ids[j];
							cluster.push(node);
						}
						clusters[names[i]] = cluster;
					}
					config.clusters = clusters;
				});
				if( callback ){ callback(); }
			}).on('error',function(error){
				console.log("failed to network configuration");
				console.log(error);
				process.exit();
			});
		}else{
			console.log("no network configuration");
			process.exit();
		}
	}
};

const send = function(host,port,filename,filepath){
	let req = http.request({
		hostname : host,
		port     : port,
		path     : '/' + filename,
		method   : 'PUT'
	});
	let stream = fs.createReadStream(filepath);
	req.on('error',function(err){
		config.log("failed to open http request: " + err);
		send_working[filepath] = send_working[filepath] - 1;
		if( send_working[filepath] == 0 ){
			file_working = file_working - 1;
			delete send_working[filepath];
			fs.unlinkSync(filepath);
		}
		return; // just ignore, try to send next time
	});
	stream.on('error',function(err){
		config.log("failed to open read stream: " + err);
		send_working[filepath] = send_working[filepath] - 1;
		if( send_working[filepath] == 0 ){
			file_working = file_working - 1;
			delete send_working[filepath];
			fs.unlinkSync(filepath);
		}
		return; // just ignore, try to send next time
	});
	stream.pipe(req);
	stream.on('end',function(err){
		send_working[filepath] = send_working[filepath] - 1;
		if( err ){
			config.log("got error to send: " + filename); // just ignore this file, and try to send next time
			return;
		}
		if( send_working[filepath] == 0 ){
			file_working = file_working - 1;
			delete send_working[filepath];
			fs.unlinkSync(filepath);
		}
	});
};

const watch = function(){
	let sending_process = Object.keys(send_working);
	if( sending_process.length != 0 ){
		config.log("stil working previous turn: "+sending_process.length);
		return;
	}
	
	let files = config.filter( fs.readdirSync(config.spool) );
	
	file_working = files.length;
	
	if( file_working >= config.max_conn ){
		files.splice(config.max_conn); // rest will be sent next time
		file_working = files.length;
	}
	
	for( let i=0; i<files.length; i++ ){
		let filepath = path.resolve(config.spool,files[i]);
		
		let nexthop = config.nexthop(files[i]);
		let cluster = config.clusters[nexthop];
		
		if( !cluster ){
			config.log("nexthop not defined for file:"+files[i]);
			file_working = file_working - 1;
			continue;
		}
		send_working[filepath] = cluster.length;
		for( let j=0; j<cluster.length; j++ ){
			let node = cluster[j];
			send(node.address,node.port,files[i],filepath);
		}
	}
};

const job = new cronJob({
	cronTime : config.cron_time,
	onTick   : watch,
	start    : false
});

process.on('SIGHUP',configure);

configure(function(){
	job.start();

	if( config.network && config.network.heatbeat ){
		new cronJob({
			cronTime : config.network.heatbeat,
			onTick   : configure,
			start    : true
		});
	}
});

