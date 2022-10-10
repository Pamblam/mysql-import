// SET THESE FOR LOCAL TESTING ONLY!
// RESET THEM TO '' BEFORE COMMITING CHANGES!
const mysql_host = '127.0.0.1';
const mysql_user = 'root';
const mysql_pass = 'bijoux22';

const expect = require('chai').expect;
const {errorHandler,query,mysqlConnect,createTestDB,destroyTestDB,closeConnection} = require('./test-helpers.js');

var config = {
	host: mysql_host || '127.0.0.1', 
	user: mysql_user || 'root', 
	password: mysql_pass || '',
	database: 'mysql-import-test-db-1'
};

var fs, MySQLImport, importer, start_time;

describe('Running All Tests', ()=>{

	before(async function(){
		
		start_time = new Date();
		
		await mysqlConnect(config);

		fs = require('fs');
		MySQLImport = require('../mysql-import.js');
		importer = new MySQLImport(config);

		// For coverage
		importer.onProgress('Not a function');
		importer.onDumpCompleted('Not a function');

		importer.onProgress(progress=>{
			var percent = Math.floor(progress.bytes_processed / progress.total_bytes * 10000) / 100;
			var filename = progress.file_path.split("/").pop();
			var message = `\tFile ${progress.file_no} of ${progress.total_files}: `+
					`processing ${filename} - ${percent}% Complete`;
			if(process.stdout.isTTY){
				process.stdout.clearLine();
				process.stdout.cursorTo(0);
				process.stdout.write(message);
			}else{
				console.log(message);
			}

		});

		importer.onDumpCompleted(status=>{
			var filename = status.file_path.split("/").pop();
			var message;
			if(status.error){
				message = `\tFile ${status.file_no} of ${status.total_files}: `+
					`Was not processed.\n`;
			}else{
				message = `\tFile ${status.file_no} of ${status.total_files}: `+
					`Completed processing ${filename}\n`;
			}
			if(process.stdout.isTTY){
				process.stdout.clearLine();
				process.stdout.cursorTo(0);
				process.stdout.write(message);
			}else{
				console.log(message);
			}
		});

		importer.setEncoding('utf8');
		
		await createTestDB('mysql-import-test-db-1');
		await createTestDB('mysql-import-test-db-2');		
		query("USE `mysql-import-test-db-1`");
		await importer.import(__dirname+'/sample_dump_files/test.sql');
	});

	after(async ()=>{
		await destroyTestDB('mysql-import-test-db-1');
		await destroyTestDB('mysql-import-test-db-2');
		await closeConnection();
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

	it('Test imported', async ()=>{
		var files = importer.getImported();
		expect(files.length).to.equal(11);
	});

	it('Test imported function', async ()=>{
		var funcs = await query("SHOW FUNCTION STATUS LIKE 'testfunc';");
		expect(funcs.length).to.equal(1);
	});

	it('Test unsupported encoding', ()=>{
		var error;
		try{
			importer.setEncoding("#we&%");
		}catch(e){
			error = e;
		}
		expect(typeof error).to.equal("object");
	});

	it('Test manually connecting', async ()=>{
		var host = config.host;
		var error = null;
		try{
			importer._connection_settings.host = "#$%^";
			await importer._connect();
		}catch(e){
			error = e;
			importer._connection_settings.host = host;
		}
		expect(typeof error).to.equal("object");
	});

	it('Test live DB change', async ()=>{
		await importer._connect();
		await importer._connect(); // a second time time, intentionally
		await importer.use('mysql-import-test-db-1'); // should work with no problems
		var error;
		try{
			await importer.use('mysql-import-test-#$%');
		}catch(e){
			error = e;
		}
		try{ await importer.disconnect(true); }catch(e){}
		expect(typeof error).to.equal("object");
	});

	it('Single file error handling', async ()=>{
		var error;
		try{
			await importer.importSingleFile("@#$");
		}catch(e){
			error = e;
		}
		expect(typeof error).to.equal("object");
	});

	it('Test fake sql file.', async ()=>{
		var fake_sql_file = __dirname+"/sample_dump_files/more_sample_files/not_sql.txt";
		var error;
		try{
			await importer.importSingleFile(fake_sql_file);
		}catch(e){
			error = e;
		}
		expect(typeof error).to.equal("object");
	});

	it('Test importing broken file.', async ()=>{
		var fake_sql_file = __dirname+"/broken_dump_files/dump.sql";
		var fake_sql_file2 = __dirname+"/broken_dump_files/dump_1.sql";
		var error;
		try{
			await importer.import(fake_sql_file, fake_sql_file2);
		}catch(e){
			error = e;
		}
		expect(typeof error).to.equal("object");
	});

	it('Test diconnect function.', async ()=>{
		try{
			importer._conn = false;
			await importer.disconnect();
			await importer._connect();
			await importer.disconnect(false);
		}catch(e){}
	});

	it('Test fileExist method.', async ()=>{
		var error;
		try{
			await importer._fileExists('!@#$');
		}catch(e){
			error = e;
		}
		expect(typeof error).to.equal("object");
	});

	it('Test statFile method.', async ()=>{
		var error;
		try{
			await importer._statFile('!@#$');
		}catch(e){
			error = e;
		}
		expect(typeof error).to.equal("object");
	});

	it('Test readDir method.', async ()=>{
		var error;
		try{
			await importer._readDir('!@#$');
		}catch(e){
			error = e;
		}
		expect(typeof error).to.equal("object");
	});

	it('Testing path parser.', async ()=>{
		var error;
		try{
			await importer._getSQLFilePaths('!@#$', '$%^#^', __dirname+"/broken_dump_files");
		}catch(e){
			error = e;
		}
		expect(typeof error).to.equal("object");
	});

});

