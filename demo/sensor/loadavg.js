
"use strict";

const cronJob = require('cron').CronJob;
const http    = require('http');
const os      = require('os');

const report = function(){
	const msg = JSON.stringify({
		tag       : 'loadavg',
		timestamp : Date.now(),
		value     : os.loadavg(), //=> [ 0.994140625, 1.02197265625, 1.00537109375 ]
	});
	const url = 'http://127.0.0.1:10091/?msg='+msg;
	http.get(url,function(res){
		let body = '';
		res.setEncoding('utf8');
		res.on('data',function(chunk){ body += chunk; });
		res.on('end',function(res){
			console.log("msg sent:"+body);
		});
	}).on('error',function(error){
		console.log(error);
	});
};

const job = new cronJob({
	cronTime : '* * * * * *',
	onTick   : report,
	start    : false
});

job.start();

