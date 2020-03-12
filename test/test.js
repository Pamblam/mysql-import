
// SET THESE FOR LOCAL TESTING ONLY!
// RESET THEM TO '' BEFORE COMMITING CHANGES!
const mysql_host = 'localhost';
const mysql_user = 'root';
const mysql_pass = 'ourtown1972';

const expect = require('chai').expect;
const {errorHandler,query,mysqlConnect,createTestDB,destroyTestDB,closeConnection} = require('./test-helpers.js');

var config = {
	host: mysql_host || '', 
	user: mysql_user || '', 
	password: mysql_pass || '',
	database: 'mysql-import-test-db-1'
};

mysqlConnect(config);

const MySQLImport = require('../mysql-import.js');
const importer = new MySQLImport(config);

const start_time = new Date();

describe('Running All Tests', ()=>{
	
	before(async ()=>{
		await createTestDB('mysql-import-test-db-1');
		await createTestDB('mysql-import-test-db-2');
		query("USE `mysql-import-test-db-1`");
		await importer.import(__dirname+'/sample_dump_files/test.sql');
		importer.setEncoding('utf8');
	});
	
	after(async ()=>{
		await destroyTestDB('mysql-import-test-db-1');
		await destroyTestDB('mysql-import-test-db-2');
		closeConnection();
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
	
	it('Reuse Importer', async ()=>{
		await importer.import(__dirname+'/sample_dump_files/test2.sql');
		var tables = await query("SHOW TABLES;");
		expect(tables.length).to.equal(3);
	});
	
	it('5 Rows Inserted in 2nd Table', async ()=>{
		var rows = await query("SELECT * FROM `test_table_2`;");
		expect(rows.length).to.equal(5);
	});
	
	it('Import Array, Directory', async ()=>{
		await importer.import(
			__dirname+'/sample_dump_files/test3.sql', 
			__dirname+'/sample_dump_files/more_sample_files/'
		);
		var tables = await query("SHOW TABLES;");
		expect(tables.length).to.equal(6);
	});
	
	it('Change database', async ()=>{
		query("USE `mysql-import-test-db-2`;");
		importer.use('mysql-import-test-db-2');
		await importer.import(__dirname+'/sample_dump_files/');
		var tables = await query("SHOW TABLES;");
		expect(tables.length).to.equal(6);
	});
	
});