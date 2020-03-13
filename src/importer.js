
/**
 * mysql-import - Importer class
 * @version {{ VERSION }}
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
	 * Import (an) .sql file(s).
	 * @param string|array input - files or paths to scan for .sql files
	 * @returns {Promise}
	 */
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
	 * @param {type} filepath
	 * @returns {Promise}
	 */
	_importSingleFile(filepath){
		return new Promise((resolve, reject)=>{
			fs.readFile(filepath, this._encoding, (err, queriesString) => {
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
					this._conn.query(query, err=>{
						if (err) error = err;
						next();
					});
				}).then(()=>{
					if(error){
						reject(error);
					}else{
						this._imported.push(filepath);
						resolve();
					}
				});
				
			});
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

/**
 * Build version number
 */
Importer.version = '{{ VERSION }}';

module.exports = Importer;
