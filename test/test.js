
// SET THESE FOR LOCAL TESTING ONLY!
// RESET THEM TO '' BEFORE COMMITING CHANGES!
const mysql_host = '';
const mysql_user = '';
const mysql_pass = '';

const expect = require('chai').expect;
const {errorHandler,query,mysqlConnect,createTestDB,destroyTestDB} = require('./test-helpers.js');

var config = {
	host: mysql_host || '127.0.0.1', 
	user: mysql_user || 'root', 
	password: mysql_pass || '', 
	database: 'testdb',
	onerror: errorHandler
};

mysqlConnect(config);

const importer = require('../mysql-import.js').config(config);
const start_time = new Date();

describe('Running All Tests', ()=>{
	
	before(async ()=>{
		await createTestDB();
		await importer.import(__dirname+'/test.sql');
	});
	
	after(async ()=>{
		await destroyTestDB();
		console.log(`All tests completed in ${(new Date() - start_time)/1000} seconds.`);
	});
	
	it('Import two tables', async ()=>{
		var tables = await query("SHOW TABLES;");
		expect(tables.length).to.equal(2);
	});

	it('978 Rows Imported Into Test DB', async ()=>{
		var rows = await query("SELECT * FROM `importtest`;");
		expect(rows.length).to.equal(978);
	});
	
	it('5 Rows With Semicolons Imported Into Test DB', async ()=>{
		var rows = await query('SELECT * FROM `importtest` WHERE `doc` LIKE "%;%";');
		expect(rows.length).to.equal(5);
	});
});