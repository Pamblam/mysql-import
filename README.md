
## Install
```
$ npm install --save node-mysql-importer
```

## Introduction

This is a node module that allows you to load sql queries from a text file and run them against your MySQL database. It supports ECMA6 promises and requires a recent version of NodeJS 5+ to work.

Here is an example of usage. Note that each query in the text file must terminate with a semicolon (;).
```
'use strict'

const importer = require('node-mysql-importer')

importer.config({
	'host': 'localhost',
	'user': 'testuser',
	'password': 'testpwd',
	'database': 'mydb'
})

importer.importSQL('mydb.sql').then( () => {
	console.log('all statements have been executed')
}).catch( err => {
	console.log(`error: ${err}`)
})
```