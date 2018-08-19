
"use strict";

const cronJob = require('cron').CronJob;
const http    = require('http');
const fs      = require('fs');
const path    = require('path');

const config = require(path.resolve(process.argv[2]));

if( !fs.existsSync(config.spool) ){
	config.log("you must make directory for uploaded files before start collector.");
	config.log(config.spool + " not found");
	process.exit(1);
}

const configure = function(callback){
	config.runtime = {}; // init runtime space
	if( process.argv[3] ){
		const clusters = require(path.resolve(process.argv[3]));
		config.clusters = clusters;
		config.runtime.id = config.id;
		config.runtime.port = config.port;
		config.runtime.address = config.address;
		if( callback ){ callback(); }
	}else{
		if( config.network ){
			if( !config.network.server.match(/\/$/) ){
				config.network.server += '/';
			}
			let address = config.runtime.address || config.address;
			let port    = config.runtime.port || config.port;
			let id      = config.runtime.id;
			let name    = config.network.cluster; // cluster_name
			const query = `${config.network.server}register?cluster=${name}&address=${address}&id=${id}&port=${port}`; 
			http.get(query,function(res){
				let body = '';
				res.setEncoding('utf8');
				res.on('data',function(chunk){ body += chunk; });
				res.on('end',function(res){
					let network_config = JSON.parse(body);
					config.runtime.id = network_config.id;
					config.runtime.port = network_config.port;
					config.runtime.address = network_config.address;
					if( callback ){ callback(); }
				});
			}).on('error',function(error){
				console.log("failed to get network configuration");
				console.log(error);
				process.exit();
			});
		}else{
			console.log("no network configuration");
			process.exit();
		}
	}
};

const exit_handler = function(){
	if( config.network ){
		if( !config.network.server.match(/\/$/) ){
			config.network.server += '/';
		}
		const query = `${config.network.server}remove?id=${config.runtime.id}`; // remove me from the network
		http.get(query,function(res){
			let body = '';
			res.setEncoding('utf8');
			res.on('data',function(chunk){ body += chunk; });
			res.on('end',function(res){
				console.log("\nbye");
				process.exit(1);
			});
		}).on('error',function(error){
			console.log("failed to remove me from network");
			console.log(error);
			process.exit(1);
		});
	}else{
		console.log("\nbye");
		process.exit(1);
	}
};

process.on('SIGINT',exit_handler);
process.on('SIGTERM',exit_handler);

const server = http.createServer(function(req,res){
	let filename = req.url.substr(1);
	let filepath = path.resolve(config.spool,filename);
	let temppath = filepath + '.tmp';
	let writestrem = fs.createWriteStream(temppath);
	req.pipe(writestrem);
	req.on('end',function(){
		res.end('success');
	});
	req.on('error',function(err){
		config.log("failed to get file:" + filename);
	});
	writestrem.on('close',function(){
		fs.renameSync(temppath,filepath);
	});
	writestrem.on('error',function(){
		config.log("failed to write file:" + filename);
	});
});

configure(function(){
	server.listen(config.runtime.port,config.runtime.address,function(){
		config.log("collector listening on port:"+config.runtime.port);
		
		if( config.network && config.network.heatbeat ){
			new cronJob({
				cronTime : config.network.heatbeat,
				onTick   : configure,
				start    : true
			});
		}
	});
});

