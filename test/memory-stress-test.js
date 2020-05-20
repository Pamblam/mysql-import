/**
 * These tests are for testing memory and efficiency. They are long-running tests 
 * and should not be considered for code-coverage purposes.
 */

// SET THESE FOR LOCAL TESTING ONLY!
// RESET THEM TO '' BEFORE COMMITING CHANGES!
const mysql_host = '';
const mysql_user = '';
const mysql_pass = '';

const expect = require('chai').expect;
const {errorHandler,query,mysqlConnect,createTestDB,destroyTestDB,closeConnection} = require('./test-helpers.js');

var config = {
	host: mysql_host || '127.0.0.1', 
	user: mysql_user || 'root', 
	password: mysql_pass || '',
	database: 'mysql-import-test-db-1'
};

mysqlConnect(config);

const fs = require('fs');
const MySQLImport = require('../mysql-import.js');
const SQLDumpGenerator = require('./SQLDumpGenerator.js');
const importer = new MySQLImport(config);

const start_time = new Date();
var big_dump_file;

describe('Running Memory Tests', ()=>{
	
	before(async function(){
		this.timeout(0);
		const generator = new SQLDumpGenerator(2.5 * 1e+9, 'large_dump.sql');
		await generator.init();
		big_dump_file = generator.target_file;
		importer.setEncoding('utf8');
	});
	
	it('Import large dataset', async function(){
		this.timeout(0);
		await importer.import(big_dump_file);
		var tables = await query("SHOW TABLES;");
		expect(tables.length).to.equal(3);
	});
	
});