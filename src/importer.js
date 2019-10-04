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

importer.version = '{{ VERSION }}';
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
