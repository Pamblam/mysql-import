/**
 * mysql-import - v3.0.6
 * Import .sql into a MySQL database with Node.
 * @author Rob Parham
 * @website https://github.com/pamblam/mysql-import#readme
 * @license MIT
 */

'use strict';

const mysql = require('mysql');
const fs = require('fs');
const path = require("path");

class importer{
	constructor(settings, err_handler){
		this.settings = settings;
		this.conn = null;
		this.err_handler = (e)=>{
			err_handler(e);
			this.disconnect();
		}
	}
	
	connect(){
		this.conn = this.conn || mysql.createConnection(this.settings);
	}
	
	disconnect(){
		if(!this.conn) return;
		try{ 
			this.conn.end(); 
		}catch(e){}
		this.conn = null;
	}
	
	getSQLFilePaths(paths){
		if(!Array.isArray(paths)) paths = [paths];
		var full_paths = [];
		for(var i=paths.length; i--;){
			let exists = fs.existsSync(paths[i]);
			if(!exists) continue;
			let stat = fs.lstatSync(paths[i]);
			let isFile = stat.isFile();
			let isDir = stat.isDirectory();
			if(!isFile && !isDir) continue;
			if(isFile){
				if(paths[i].toLowerCase().substring(paths[i].length-4) === '.sql'){
					full_paths.push(path.resolve(paths[i]));
				}
			}else{
				var more_paths = fs.readdirSync(paths[i]).map(p=>path.join(paths[i], p));
				full_paths.push(...this.getSQLFilePaths(more_paths));
			}
		}
		return full_paths;
	}
	
	importSingleFile(filename){
		return new Promise(done=>{
			var queriesString = fs.readFileSync(filename, 'utf8');
			var queries = new queryParser(queriesString).queries;
			slowLoop(queries, (q,i,d)=>{
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
			}).then(()=>{
				done();
			});
		});
	}
	
	import(input){
		return new Promise(done=>{
			this.connect();
			var files = this.getSQLFilePaths(input);
			slowLoop(files, (f,i,d)=>{
				this.importSingleFile(f).then(d);
			}).then(()=>{
				this.disconnect();
				done();
			});
		});
	};
	
}

importer.version = '3.0.6';
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

	return new importer(settings, err_handler);
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
		if(!items.length) return f();
		let done = arguments[2] || f;
		let idx = arguments[3] || 0;
		let cb = items[idx + 1] ? () => slowLoop(items, loopBody, done, idx + 1) : done;
		loopBody(items[idx], idx, cb);
	});
}


class queryParser{
	
	constructor(queriesString){
		
		// Input string containing SQL queries
		this.queriesString = queriesString.trim();
		
		// The quote type (' or ") if the parser 
		// is currently inside of a quote, else false
		this.quoteType = false;
		
		// An array of complete queries
		this.queries = [];
		
		// An array of chars representing the substring
		// the is currently being parsed
		this.buffer = [];
		
		// Is the current char escaped
		this.escaped = false;
		
		// The string that denotes the end of a query
		this.delimiter = ';';
		
		// Are we currently seeking new delimiter
		this.seekingDelimiter = false;

		// Does the sql set change delimiter?
		this.hasDelimiter = queriesString.toLowerCase().includes('delimiter ');

		// Iterate over each char in the string
		for (let i = 0; i < this.queriesString.length; i++) {
			let char = this.queriesString[i];
			this.parseChar(char);
		}
	}
	
	// Parse the next char in the string
	parseChar(char){
		this.checkEscapeChar();
		this.buffer.push(char);

		if (this.hasDelimiter) {
			this.checkNewDelimiter(char);
		}

		this.checkQuote(char);
		this.checkEndOfQuery();
	}
	
	// Check if the current char has been escaped
	// and update this.escaped
	checkEscapeChar(){
		if(!this.buffer.length) return;
		if(this.buffer[this.buffer.length - 1] === "\\"){
			this.escaped = !this.escaped;
		}else{
			this.escaped = false;
		}
	}
	
	// Check to see if a new delimiter is being assigned
	checkNewDelimiter(char){
		var buffer_str = this.buffer.join('').toLowerCase().trim();
		if(buffer_str === 'delimiter' && !this.quoteType){
			this.seekingDelimiter = true;
			this.buffer = [];
		}else{
			var isNewLine = char === "\n" || char === "\r";
			if(isNewLine && this.seekingDelimiter){
				this.seekingDelimiter = false;
				this.delimiter = this.buffer.join('').trim();
				this.buffer = [];
			}
		}
	}
	
	// Check if the current char is a quote
	checkQuote(char){
		var isQuote = (char === '"' || char === "'") && !this.escaped;
		if (isQuote && this.quoteType === char){
			this.quoteType = false;
		}else if(isQuote && !this.quoteType){
			this.quoteType = char;
		}
	}
	
	// Check if we're at the end of the query
	checkEndOfQuery(){
		var demiliterFound = false;
		if(!this.quoteType && this.buffer.length >= this.delimiter.length){
			demiliterFound = this.buffer.slice(-this.delimiter.length).join('') === this.delimiter;
		}

		if (demiliterFound) {
			// trim the delimiter off the end
			this.buffer.splice(-this.delimiter.length, this.delimiter.length);
			this.queries.push(this.buffer.join('').trim());
			this.buffer = [];
		}
	}
}
