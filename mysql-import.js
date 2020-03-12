/**
 * mysql-import - v4.0.23
 * Import .sql into a MySQL database with Node.
 * @author Rob Parham
 * @website https://github.com/pamblam/mysql-import#readme
 * @license MIT
 */

'use strict';

const mysql = require('mysql');
const fs = require('fs');
const path = require("path");


/**
 * mysql-import - Importer class
 * @version 4.0.23
 * https://github.com/Pamblam/mysql-import
 */

class Importer{
	
	constructor(settings){
		this.connection_settings = settings;
		this.conn = null;
		this.encoding = 'utf8';
	}
	
	setEncoding(encoding){
		var supported_encodings = [
			'utf8',
			'ucs2',
			'utf16le',
			'latin1',
			'ascii',
			'base64',
			'hex'
		];
		if(!supported_encodings.includes(encoding)){
			throw new Error("Unsupported encoding: "+encoding);
		}
		this.encoding = encoding;
	}
	
	use(database){
		return new Promise((resolve, reject)=>{
			if(!this.conn){
				this.connection_settings.database = database;
				return;
			}
			this.conn.changeUser({database}, err=>{
				if (err){
					reject(err);	
				}else{
					resolve();
				}
			});
		});
	}
	
	importSingleFile(filepath){
		return new Promise((resolve, reject)=>{
			fs.readFile(filepath, this.encoding, (err, queriesString) => {
				if(err){
					reject(err);
					return;
				}
				var queries = new queryParser(queriesString).queries;
				var error = null;
				slowLoop(queries, (query, index, next)=>{
					if(error){
						next();
						return;
					}
					this.conn.query(query, err=>{
						if (err) error = err;
						next();
					});
				}).then(()=>{
					if(error){
						reject(error);
					}else{
						resolve();
					}
				});
				
			});
		});
	}
	
	import(...input){
		return new Promise(async (resolve, reject)=>{
			try{
				await this._connect();
				var files = await this._getSQLFilePaths(...input);
				var error = null;
				await slowLoop(files, (file, index, next)=>{
					if(error){
						next();
						return;
					}
					this.importSingleFile(file).then(()=>{
						next();
					}).catch(err=>{
						error = err;
						next();
					});
				});
				if(error) throw error;
				await this.disconnect();
				resolve();
			}catch(err){
				reject(err);
			}
		});
	};
	
	disconnect(graceful=true){
		return new Promise((resolve, reject)=>{
			if(!this.conn){
				resolve();
				return;
			}
			if(graceful){
				this.conn.end(err=>{
					if(err){
						reject(err);
						return;
					}
					this.conn = null;
					resolve();
				});
			}else{
				this.conn.destroy();
				resolve();
			}				
		});
	}
	
	_connect(){
		return new Promise((resolve, reject)=>{
			if(this.conn){
				resolve(this.conn);
				return;
			}
			var connection = mysql.createConnection(this.connection_settings);
			connection.connect(err=>{
				if (err){
					reject(err);	
				}else{
					this.conn = connection;
					resolve(this.conn);
				}
			});
		});
	}
	
	_fileExists(filepath){
		return new Promise((resolve, reject)=>{
			fs.access(filepath, fs.F_OK, err=>{
				if(err){
					reject(err);
				}else{
					resolve();
				}
			});
		});
	}

	_statFile(filepath){
		return new Promise((resolve, reject)=>{
			fs.lstat(filepath, (err, stat)=>{
				if(err){
					reject(err);
				}else{
					resolve(stat);
				}
			});
		});
	}

	_readDir(filepath){
		return new Promise((resolve, reject)=>{
			fs.readdir(filepath, (err, files)=>{
				if(err){
					reject(err);
				}else{
					resolve(files);
				}
			});
		});
	}

	_getSQLFilePaths(...paths){
		return new Promise(async (resolve, reject)=>{
			var full_paths = [];
			var error = null;
			paths = [].concat.apply([], paths); // flatten array of paths
			await slowLoop(paths, async (filepath, index, next)=>{
				if(error){
					next();
					return;
				}
				try{
					await this._fileExists(filepath);
					var stat = await this._statFile(filepath);
					if(stat.isFile()){
						if(filepath.toLowerCase().substring(filepath.length-4) === '.sql'){
							full_paths.push(path.resolve(filepath));
						}
						next();
					}else if(stat.isDirectory()){
						var more_paths = await this._readDir(filepath);
						more_paths = more_paths.map(p=>path.join(filepath, p));
						var sql_files = await this._getSQLFilePaths(...more_paths);
						full_paths.push(...sql_files);
						next();
					}else{
						next();
					}
				}catch(err){
					error = err;
					next();
				}
			});
			if(error){
				reject(error);
			}else{
				resolve(full_paths);
			}
		});
	}
	
}

Importer.version = '4.0.23';
module.exports = Importer;

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
