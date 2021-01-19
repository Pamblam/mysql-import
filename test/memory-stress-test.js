/**
 * These tests are for testing memory and efficiency. They are long-running tests 
 * and should not be considered for code-coverage purposes.
 */

// SET THESE FOR LOCAL TESTING ONLY!
// RESET THEM TO '' BEFORE COMMITING CHANGES!
const mysql_host = 'localhost';
const mysql_user = 'root';
const mysql_pass = 'ourtown1972';

const fs = require('fs');
const expect = require('chai').expect;
const path = require('path');
const {errorHandler,query,mysqlConnect,createTestDB,destroyTestDB,closeConnection} = require('./test-helpers.js');

var config = {
	host: mysql_host || '127.0.0.1', 
	user: mysql_user || 'root', 
	password: mysql_pass || '',
	database: 'mysql-import-test-db-1'
};

mysqlConnect(config);


const MySQLImport = require('../mysql-import.js');
const SQLDumpGenerator = require('./SQLDumpGenerator.js');
const importer = new MySQLImport(config);

importer.onProgress(progress=>{
	var percent = Math.floor(progress.bytes_processed / progress.total_bytes * 10000) / 100;
	var filename = progress.file_path.split("/").pop();
	process.stdout.clearLine();
	process.stdout.cursorTo(0);
	process.stdout.write(`File ${progress.file_no} of ${progress.total_files}: processing ${filename} - ${percent}% Complete`);
});

const start_time = new Date();
var big_dump_file = path.join(__dirname, 'large_dump.sql');

describe('Running Memory Tests', ()=>{
	
	before(async function(){
		this.timeout(0);
		if(!fs.existsSync(big_dump_file)){
			console.log("generating new large dump file.");
			const generator = new SQLDumpGenerator(2.5 * 1e+9, big_dump_file);
			await generator.init();
		}else{
			console.log("Using pre-generated dump file.");
		}
		importer.setEncoding('utf8');
		await createTestDB('mysql-import-test-db-1');
	});
	
	it('Import large dataset', async function(){
		this.timeout(0);
		await importer.import(big_dump_file);
		var tables = await query("SHOW TABLES;");
		expect(tables.length).to.equal(3);
	});
	
});