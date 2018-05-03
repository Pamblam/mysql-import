

# mysql-import

This is a fork of the node package [node-mysql-importer](https://www.npmjs.com/package/node-mysql-importer) originally created by [some European dude](https://github.com/marktyers/). I was using this as a dependency in another project and had a few issues. I left an issue on his repo and he promptly deleted (or hid) the repo, so I fixed it myself and will maintain my own copy. This one has a much more robust pre-parser, and is almost entirely re-written.

Thanks for your work, Mark.

## Install
```
$ npm install --save mysql-import
```

## Introduction

This is a node module that allows you to load sql queries from a text file and run them against your MySQL database. It supports ECMA6 promises and requires a recent version of NodeJS 5+ to work.

Here is an example of usage. Note that each query in the text file must terminate with an unquoted semicolon (;) followed by a newline or the end of the file.

```
const importer = require('mysql-import').config({
	'host': 'localhost',
	'user': 'testuser',
	'password': 'testpwd',
	'database': 'mydb'
});

importer.import('mydb.sql').then(()=> {
	console.log('all statements have been executed')
});
```