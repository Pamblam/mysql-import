
var config = {host: 'localhost', user: 'root', password: 'password', database: 'testdb'};

const con = require('mysql').createConnection({host: config.host, user: config.user, password: config.password});
const importer = require('../index.js').config(config);

const query = (sql, p=[]) => new Promise( done=> con.query(sql, p, (err, result)=>{ if (err) throw err; done(result); }));

query("create database testdb").then(()=>query("use testdb")).then(()=>{
	importer.import('test.sql').then(console.log('farts'));
});

