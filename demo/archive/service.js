
"use strict";

const cronJob = require('cron').CronJob;
const path    = require('path');
const fs      = require('fs');

const spool = path.resolve(__dirname,"spool");
const warehouse = path.resolve(__dirname,"warehouse");

if( !fs.existsSync(spool) ){ fs.mkdirSync(spool); }
if( !fs.existsSync(warehouse) ){ fs.mkdirSync(warehouse); }

const archive = function(){
	let now = new Date();
	let iso = now.toISOString();
	let archive_name = iso.substring(0,iso.indexOf('T'));
	let archive_path = path.resolve(warehouse,archive_name);
	
	let files = fs.readdirSync(spool);
	for( let i=0; i<files.length; i++ ){
		if( files[i].match(/\.json$/)  ){
			let file_path = path.resolve(spool,files[i]);
			let content = fs.readFileSync(file_path,'utf8') + '\n';
			fs.appendFileSync(archive_path,content);
			fs.unlinkSync(file_path);
		}
	}
};

const job = new cronJob({
	cronTime : '*/2 * * * * *',
	onTick   : archive,
	start    : false
});

job.start();
