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

	var conn = mysql.createConnection(settings);

	return new importer(conn, err_handler);
};

module.exports = importer;
