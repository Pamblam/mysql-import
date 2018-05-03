
var config = {host: 'localhost', user: 'root', password: 'bijoux22', database: 'testdb'};

const con = require('mysql').createConnection({host: config.host, user: config.user, password: config.password});
const importer = require('../index.js').config(config);

const query = (sql, p=[]) => new Promise( done=> con.query(sql, p, (err, result)=>{ if (err) throw err; done(result); }));

var startTime = new Date().getTime();

console.log("Creating test DB");
query("create database if not exists testdb").then(()=>query("use testdb")).then(()=>{
	
	console.log("Importing test dump");
	importer.import('test.sql').then(()=>{
		
		query("select * from importtest").then(res=>{
			console.log(`${res.length} rows inputted.`);
			
			query("select * from importtest where doc like \"%;%\"").then(res=>{
				console.log(`There are ${res.length} entries with a semicolon.`);

				query("drop database testdb").then(()=>{
					var time = new Date().getTime() - startTime;
					console.log("test complete in "+time+"ms");					
					process.exit();
				});

			});
			
		});
		
	});
});

