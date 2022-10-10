const mysql = require('mysql2');

var con;
var log_bin_trust_function_creators;

/**
 * Handle Errors and kill the test script.
 * @param {Error} err
 * @returns {undefined}
 */
function errorHandler(err){
	console.log("\n\nsomething went wrong: ", err.message);
	console.error(err);
	process.exit(1);
}

/**
 * Run a query
 * @param {type} sql
 * @returns {Promise}
 */
function query(sql){ 
	return new Promise(done=>{
		con.query(sql, (err, result)=>{
			if(err) errorHandler(err);
			else done(result);
		});
	});
}

/**
 * Create a fresh MySQL connection
 * @param {config object} config
 * @returns {Connection}
 */
async function mysqlConnect(config){
	con = mysql.createConnection({
		host: config.host, 
		user: config.user, 
		password: config.password
	});
	var res = await query("SHOW GLOBAL VARIABLES LIKE 'log_bin_trust_function_creators';");
	log_bin_trust_function_creators = res[0].Value
	await query("SET GLOBAL log_bin_trust_function_creators = 1;");
}

/**
 * Create a database to test with
 * @returns {undefined}
 */
async function createTestDB(db){
	await query("DROP DATABASE IF EXISTS `"+db+"`;");
	await query("CREATE DATABASE `"+db+"`;");
}

/**
 * Destroy the testing DB
 * @returns {undefined}
 */
async function destroyTestDB(db){
	await query("DROP DATABASE IF EXISTS `"+db+"`;");
}

async function closeConnection(){
	await query("SET GLOBAL log_bin_trust_function_creators = '"+log_bin_trust_function_creators+"';");
	con.end();
}

module.exports = {
	errorHandler, 
	query, 
	mysqlConnect,
	createTestDB, 
	destroyTestDB,
	closeConnection
};