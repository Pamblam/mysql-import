


<p align="center">
	<img src='https://i.imgur.com/AOfuTLA.png'>
</p>

*Version 2.0.2* 

[![Build Status](https://api.travis-ci.org/Pamblam/mysql-import.svg?branch=master)](https://travis-ci.org/Pamblam/mysql-import/) [![Coverage Status](https://coveralls.io/repos/github/Pamblam/mysql-import/badge.svg?branch=master)](https://coveralls.io/github/Pamblam/mysql-import?branch=master)

Import MySQL files with Node!

## Install
```
$ npm install --save mysql-import
```

## Usage

Include the package.

    const mysql_import = require('mysql-import');

`mysql-import` exposes one methods and `version` property. `mysql_import.version` is a string showing the current version of the package.

#### `mysql-import.config(Object settings)`

Prepare the package to communicate with your database and handle any errors. This method **must** be called before importing anything.

The `settings` object has 4 mandatory parameters and 1 optional parameter.

 - `host` - (**mandatory**) The MySQL host to connect to.
 - `user` - (**mandatory**) The MySQL user to connect with.
 - `password` - (**mandatory**) The password for the user.
 - `database` - (**mandatory**) The database to connect to.
 - `onerror` - (**optional**) Function to handle errors.  The function will receive the Error. If not provided the error will be thrown.

The `config` method returns a new `importer` instance.

#### `importer.import(String filename)`

Import an `.sql` file to the database.

The `import` method returns a Promise which is resolved when (and if) the file has completely imported. This promise is never rejected, if there is an error, the `onerror` function passed to the `config` method is called with the error object passed into it.

*Note that each query in the text file must terminate with an unquoted semicolon (;) followed by a newline or the end of the file.*

#### Examples

Do it in a single call if you only need to import a single file to a single DB:

    require('mysql-import').config({
    	host: 'localhost',
    	user: 'testuser',
    	password: 'testpwd',
    	database: 'mydb',
		onerror: err=>console.log(err.message)
    }).import('mydb.sql').then(()=> {
    	console.log('all statements have been executed')
    });

If you need to import to more than one database:

    const mysql_import = require('mysql-import');
	var importer1 = mysql_import.config({
    	host: 'localhost',
    	user: 'testuser',
    	password: 'testpwd',
    	database: 'mydb',
		onerror: err=>console.log(err.message)
    });
	var importer2 = mysql_import.config({
    	host: 'localhost',
    	user: 'testuser',
    	password: 'testpwd',
    	database: 'mydb2',
		onerror: err=>console.log(err.message)
    });
	importer.import('mydb.sql').then(()=> {
    	console.log('DB1 has finished importing')
    });
	importer2.import('mydb2.sql').then(()=> {
    	console.log('DB2 has finished importing')
    });

## Credit where credit is due

This is a fork of the node package [node-mysql-importer](https://www.npmjs.com/package/node-mysql-importer) originally created by [some European dude](https://github.com/marktyers/). I was using this as a dependency in another project and had a few issues (namely, semicolons in the import data causing errors). I left an issue on his repo and he promptly deleted (or hid) the repo, so I fixed it myself and will maintain my own copy. This one has a much more robust pre-parser, and is ~~almost~~ entirely re-written.

Thanks for your work, Mark.
