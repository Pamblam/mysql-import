/**
 * mysql-import - v1.0.9
 * Import .sql into a MySQL database with Node.
 * @author Rob Parham
 * @website https://github.com/pamblam/mysql-import#readme
 * @license MIT
 */

'use strict';

const mysql = require('mysql');
const fs = require('fs');

class importer{
	constructor(conn, err_handler){
		this.conn = conn;
		this.err_handler = err_handler;
	}
	import(filename){
		var queriesString = fs.readFileSync(filename, 'utf8');
		
		var queries = parseQueries(queriesString);
		
		return slowLoop(queries, (q,i,d)=>{
			try{
				this.conn.query(q, err=>{
					/* istanbul ignore next */
					if (err) this.err_handler(err); 
					else d();
				});
			}catch(e){
				/* istanbul ignore next */
				this.err_handler(e); 
			}
		});
	}
}
importer.version = '1.0.9';
importer.config = function(settings){
	const valid = settings.hasOwnProperty('host') && typeof settings.host === "string" &&
		settings.hasOwnProperty('user') && typeof settings.user === "string" &&
		settings.hasOwnProperty('password') && typeof settings.password === "string" &&
		settings.hasOwnProperty('database') && typeof settings.database === "string";

	/* istanbul ignore next */
	if(!settings.hasOwnProperty("onerror") || typeof settings.onerror !== "function"){
		settings.onerror = err=>{ throw err };
	}

	var err_handler = settings.onerror;

	/* istanbul ignore next */
	if(!valid) return settings.onerror(new Error("Invalid host, user, password, or database parameters"));

	var conn = mysql.createConnection(settings);

	return new importer(conn, err_handler);
};

module.exports = importer;

/**
 * Execute the loopBody function once for each item in the items array, 
 * waiting for the done function (which is passed into the loopBody function)
 * to be called before proceeding to the next item in the array.
 * @param {Array} items - The array of items to iterate through
 * @param {Function} loopBody - A function to execute on each item in the array.
 *		This function is passed 3 arguments - 
 *			1. The item in the current iteration,
 *			2. The index of the item in the array,
 *			3. A function to be called when the iteration may continue.
 * @returns {Promise} - A promise that is resolved when all the items in the 
 *		in the array have been iterated through.
 */
function slowLoop(items, loopBody) {
	return new Promise(f => {
		let done = arguments[2] || f;
		let idx = arguments[3] || 0;
		let cb = items[idx + 1] ? () => slowLoop(items, loopBody, done, idx + 1) : done;
		loopBody(items[idx], idx, cb);
	});
}

/**
 * Split up the dump file into a bunch of seperate queries
 * @param {type} queriesString
 * @returns {Array|parseQueries.queries|nm$_index.parseQueries.queries}
 */
function parseQueries(queriesString) {
	queriesString=queriesString.trim();
	var quoteType = false;
	var queries = [];
	var buffer = [];
	var escaped = false;
	var lastQuoteIndex;
	var bufferIndex = 0;
	for (let i = 0; i < queriesString.length; i++) {
		var char = queriesString[i];
		var last_char = buffer.length ? buffer[buffer.length - 1] : "";
		buffer.push(char);
		if (last_char == "\\") escaped = !escaped;
		else escaped = false;
		var isQuote = (char == '"' || char == "'") && !escaped;
		if (isQuote && quoteType == char) quoteType = false;
		else if (isQuote && !quoteType) quoteType = char;
		if (isQuote) lastQuoteIndex = lastQuoteIndex || bufferIndex;
		bufferIndex++;
		var isNewLine = char == "\n" || char == "\r";
		if (last_char == ";" && isNewLine && false == quoteType) {
			queries.push(buffer.join(''));
			buffer = [];
			bufferIndex = 0;
			lastQuoteIndex = 0;
		}
	}
	/* istanbul ignore next */
	if (!!quoteType) {
		buffer_str = buffer.join('');
		var re_parse = buffer_str.substr(lastQuoteIndex + 1);
		buffer = buffer_str.substr(0, lastQuoteIndex + 1).split('');
		var newParts = parseQueries(re_parse);
		if (newParts.length) {
			var contd = newParts.pop().split('');
			buffer = [...buffer, ...contd];
			queries.push(buffer.join(''));
			buffer = [];
			queries = [...queries, ...newParts];
		}
	}
	if (buffer.length) queries.push(buffer.join(''));
	return queries;
}
