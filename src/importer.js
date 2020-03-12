
/**
 * mysql-import - Importer class
 * @version {{ VERSION }}
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

Importer.version = '{{ VERSION }}';
module.exports = Importer;
