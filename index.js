'use strict';

const mysql = require('mysql');
const fs = require('fs');
const Validator = require('jsonschema').Validator;
const v = new Validator();
var conn;

const query = (sql, p=[]) => new Promise((resolve, reject)=> conn.query(sql, p, (err, result)=>{ if (err) reject(err); else resolve(result); }));

const importer = {
	
	import: filename => {
		var queriesString = fs.readFileSync(filename, 'utf8');
		var queries = parseQueries(queriesString);
		return slowLoop(queries, (q,i,d)=>query(q).then(d)) // 47668ms
		//return Promise.all(queries.map(query)); // 48921ms
	},
	
	config: data => {
		const valid = v.validate(data, {
			'host': {'type': 'string'},
			'user': {'type': 'string'},
			'password': {'type': 'string'},
			'database': {'type': 'string'}
		});
		if(!valid) throw new Error("Invalid host, user, password, or database parameters");
		conn = mysql.createConnection(data);
		return importer;
	}
	
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