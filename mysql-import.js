/**
 * mysql-import - v5.0.26
 * Import .sql into a MySQL database with Node.
 * @author Rob Parham
 * @website https://github.com/pamblam/mysql-import#readme
 * @license MIT
 */

'use strict';

const mysql = require('mysql2');
const fs = require('fs');
const path = require("path");
const stream = require('stream');


/**
 * mysql-import - Importer class
 * @version 5.0.26
 * https://github.com/Pamblam/mysql-import
 */

class Importer{
	
	/**
	 * new Importer(settings)
	 * @param {host, user, password[, database]} settings - login credentials
	 */
	constructor(settings){
		this._connection_settings = settings;
		this._conn = null;
		this._encoding = 'utf8';
		this._imported = [];
		this._progressCB = ()=>{};
		this._dumpCompletedCB = ()=>{};
		this._total_files = 0;
		this._current_file_no = 0;
	}
	
	/**
	 * Get an array of the imported files
	 * @returns {Array}
	 */
	getImported(){
		return this._imported.slice(0);
	}
	
	/**
	 * Set the encoding to be used for reading the dump files.
	 * @param string - encoding type to be used.
	 * @throws {Error} - if unsupported encoding type. 
	 * @returns {undefined}
	 */
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
		this._encoding = encoding;
	}
	
	/**
	 * Set or change the database to be used
	 * @param string - database name
	 * @returns {Promise}
	 */
	use(database){
		return new Promise((resolve, reject)=>{
			if(!this._conn){
				this._connection_settings.database = database;
				resolve();
				return;
			}
			this._conn.changeUser({database}, err=>{
				if (err){
					reject(err);	
				}else{
					resolve();
				}
			});
		});
	}
	
	/**
	 * Set a progress callback
	 * @param {Function} cb - Callback function is called whenever a chunk of
	 *		the stream is read. It is provided an object with the folling properties:
	 *			- total_files: The total files in the queue. 
	 *			- file_no: The number of the current dump file in the queue. 
	 *			- bytes_processed: The number of bytes of the file processed.
	 *			- total_bytes: The size of the dump file.
	 *			- file_path: The full path to the dump file.
	 * @returns {undefined}
	 */
	onProgress(cb){
		if(typeof cb !== 'function') return;
		this._progressCB = cb;
	}
	
	/**
	 * Set a progress callback
	 * @param {Function} cb - Callback function is called whenever a dump
	 *		file has finished processing.
	 *			- total_files: The total files in the queue. 
	 *			- file_no: The number of the current dump file in the queue. 
	 *			- file_path: The full path to the dump file.
	 * @returns {undefined}
	 */
	onDumpCompleted(cb){
		if(typeof cb !== 'function') return;
		this._dumpCompletedCB = cb;
	}
	
	/**
	 * Import (an) .sql file(s).
	 * @param string|array input - files or paths to scan for .sql files
	 * @returns {Promise}
	 */
	import(...input){
		return new Promise(async (resolve, reject)=>{
			try{
				await this._connect();
				var files = await this._getSQLFilePaths(...input);
				this._total_files = files.length;
				this._current_file_no = 0;
				
				var error = null;
				await slowLoop(files, (file, index, next)=>{
					this._current_file_no++;
					if(error){
						next();
						return;
					}
					this._importSingleFile(file).then(()=>{
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
	
	/**
	 * Disconnect mysql. This is done automatically, so shouldn't need to be manually called.
	 * @param bool graceful - force close?
	 * @returns {Promise}
	 */
	disconnect(graceful=true){
		return new Promise((resolve, reject)=>{
			if(!this._conn){
				resolve();
				return;
			}
			if(graceful){
				this._conn.end(err=>{
					if(err){
						reject(err);
						return;
					}
					this._conn = null;
					resolve();
				});
			}else{
				this._conn.destroy();
				resolve();
			}				
		});
	}
	
	////////////////////////////////////////////////////////////////////////////
	// Private methods /////////////////////////////////////////////////////////
	////////////////////////////////////////////////////////////////////////////
	
	/**
	 * Import a single .sql file into the database
	 * @param {object} fileObj - Object containing the following properties:
	 *		- file: The full path to the file
	 *		- size: The size of the file in bytes
	 * @returns {Promise}
	 */
	_importSingleFile(fileObj){
		return new Promise((resolve, reject)=>{
			
			var parser = new queryParser({
				db_connection: this._conn,
				encoding: this._encoding,
				onProgress: (progress) => {
					this._progressCB({
						total_files: this._total_files, 
						file_no: this._current_file_no, 
						bytes_processed: progress, 
						total_bytes: fileObj.size,
						file_path: fileObj.file
					});
				}
			});
			
			const dumpCompletedCB = (err) => this._dumpCompletedCB({
				total_files: this._total_files, 
				file_no: this._current_file_no, 
				file_path: fileObj.file,
				error: err
			});
			
			parser.on('finish', ()=>{
				this._imported.push(fileObj.file);
				dumpCompletedCB(null);
				resolve();
			});
			
			
			parser.on('error', (err)=>{
				dumpCompletedCB(err);
				reject(err);
			});
			
			var readerStream = fs.createReadStream(fileObj.file);
			readerStream.setEncoding(this._encoding);
			
			/* istanbul ignore next */
			readerStream.on('error', (err)=>{
				dumpCompletedCB(err);
				reject(err);
			});
			
			readerStream.pipe(parser);
		});
	}
	
	/**
	 * Connect to the mysql server
	 * @returns {Promise}
	 */
	_connect(){
		return new Promise((resolve, reject)=>{
			if(this._conn){
				resolve(this._conn);
				return;
			}
			var connection = mysql.createConnection(this._connection_settings);
			connection.connect(err=>{
				if (err){
					reject(err);	
				}else{
					this._conn = connection;
					resolve();
				}
			});
		});
	}
	
	/**
	 * Check if a file exists
	 * @param string filepath
	 * @returns {Promise}
	 */
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

	/**
	 * Get filetype information
	 * @param string filepath
	 * @returns {Promise}
	 */
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
	
	/**
	 * Read contents of a directory
	 * @param string filepath
	 * @returns {Promise}
	 */
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

	/**
	 * Parses the input argument(s) for Importer.import into an array sql files.
	 * @param strings|array paths
	 * @returns {Promise}
	 */
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
							full_paths.push({
								file: path.resolve(filepath),
								size: stat.size
							});
						}
						next();
					}else if(stat.isDirectory()){
						var more_paths = await this._readDir(filepath);
						more_paths = more_paths.map(p=>path.join(filepath, p));
						var sql_files = await this._getSQLFilePaths(...more_paths);
						full_paths.push(...sql_files);
						next();
					}else{
						/* istanbul ignore next */
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

/**
 * Build version number
 */
Importer.version = '5.0.26';

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
		/* istanbul ignore next */
		if(!items.length) return f();
		let done = arguments[2] || f;
		let idx = arguments[3] || 0;
		let cb = items[idx + 1] ? () => slowLoop(items, loopBody, done, idx + 1) : done;
		loopBody(items[idx], idx, cb);
	});
}


class queryParser extends stream.Writable{
	
	constructor(options){
		/* istanbul ignore next */
		options = options || {};
		super(options);
		
		// The number of bytes processed so far
		this.processed_size = 0;
		
		// The progress callback
		this.onProgress = options.onProgress || (() => {});
		
		// the encoding of the file being read
		this.encoding = options.encoding || 'utf8';
		
		// the encoding of the database connection
		this.db_connection = options.db_connection;
		
		// The quote type (' or ") if the parser 
		// is currently inside of a quote, else false
		this.quoteType = false;
		
		// An array of chars representing the substring
		// the is currently being parsed
		this.buffer = [];
		
		// Is the current char escaped
		this.escaped = false;
		
		// The string that denotes the end of a query
		this.delimiter = ';';
		
		// Are we currently seeking new delimiter
		this.seekingDelimiter = false;
		
	}
	
	////////////////////////////////////////////////////////////////////////////
	// "Private" methods" //////////////////////////////////////////////////////
	////////////////////////////////////////////////////////////////////////////
	
	// handle piped data
	async _write(chunk, enc, next) {
		var query;
		chunk = chunk.toString(this.encoding);
		var error = null;
		for (let i = 0; i < chunk.length; i++) {
			let char = chunk[i];
			query = this.parseChar(char);
			try{
				if(query) await this.executeQuery(query);
			}catch(e){
				error = e;
				break;
			}
		}
		this.processed_size += chunk.length;
		this.onProgress(this.processed_size);
		next(error);
	}
	
	// Execute a query, return a Promise
	executeQuery(query){
		return new Promise((resolve, reject)=>{
			this.db_connection.query(query, err=>{
				if (err){
					reject(err);
				}else{
					resolve();
				}
			});
		});
	}
	
	// Parse the next char in the string
	// return a full query if one is detected after parsing this char
	// else return false.
	parseChar(char){
		this.checkEscapeChar();
		this.buffer.push(char);
		this.checkNewDelimiter(char);
		this.checkQuote(char);
		return this.checkEndOfQuery();
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
	// return the query if so, else return false;
	checkEndOfQuery(){
		if(this.seekingDelimiter){
			return false;
		}

		var query = false;
		var demiliterFound = false;
		if(!this.quoteType && this.buffer.length >= this.delimiter.length){
			demiliterFound = this.buffer.slice(-this.delimiter.length).join('') === this.delimiter;
		}

		if (demiliterFound) {
			// trim the delimiter off the end
			this.buffer.splice(-this.delimiter.length, this.delimiter.length);
			query = this.buffer.join('').trim();
			this.buffer = [];
		}
		
		return query;
	}
}
