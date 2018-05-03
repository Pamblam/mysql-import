'use strict';

const mysql = require('mysql');
const fs = require('fs-promise');
const Validator = require('jsonschema').Validator;
const v = new Validator();
var conn;

const importer = {
	
	import: filename => {
		return new Promise( (resolve, reject) => {
			fs.readFile(filename, 'utf8').then(arraySplit).then(runQueries).then(()=>{
				resolve('all tables created')
			}).catch( err => {
				reject(`error: ${err}`)
			});
		});
	},
	
	config: data => {
		const valid = v.validate(data, {
			'host': {'type': 'string'},
			'user': {'type': 'string'},
			'password': {'type': 'string'},
			'database': {'type': 'string'}
		});
		if(!valid) throw new Error("Invalid host, user, password, or database parameters");
		conn = data;
		return importer;
	}
	
};

module.exports = importer;

function arraySplit(str) { return new Promise(resolve=>resolve(parseQueries(str))); }

function runQueries(arr) {
	let db = mysql.createConnection(conn);
	Promise.all( arr.map( item => {
		db.query(item, (err, rows) => {
			if (err) {
				throw 'ERROR: '+err
			}
			return 'ROWS: '+rows
		})
	})).then( () => {
		console.log('DONE!')
	}, (e) => {
		console.log(`error: ${e}`)
	})
}

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