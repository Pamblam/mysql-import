




<p align="center">
	<img src='https://i.imgur.com/AOfuTLA.png'>
</p>

*Version 4.0.23* - [Github](https://github.com/Pamblam/mysql-import/) - [NPM](https://www.npmjs.com/package/mysql-import)

[![Build Status](https://api.travis-ci.org/Pamblam/mysql-import.svg?branch=master)](https://travis-ci.org/Pamblam/mysql-import/) [![Coverage Status](https://coveralls.io/repos/github/Pamblam/mysql-import/badge.svg?branch=master)](https://coveralls.io/github/Pamblam/mysql-import?branch=master)

Import MySQL files with Node!

## Install
```
$ npm install --save-dev mysql-import
```

## Usage

Include the package.

    const mysql_import = require('mysql-import');

`mysql-import` exposes one method and a `version` property. `mysql_import.version` is a string showing the current version of the package.

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

The `import` method returns a Promise which is resolved when the import has completed. This promise is never rejected, if there is an error, the `onerror` function passed to the `config` method is called with the error object passed into it.

#### Example

```js
const mysql_import = require('mysql-import');

const mydb_importer = mysql_import.config({
	host: 'localhost',
	user: 'testuser',
	password: 'testpwd',
	database: 'mydb',
	onerror: err=>console.log(err.message)
});
await mydb_importer.import('mydb.sql');
await mydb_importer.import('mydb2.sql');

// Each database requires it's own importer.
const yourdb_importer = mysql_import.config({
	host: 'localhost',
	user: 'testuser',
	password: 'testpwd',
	database: 'yourdb',
	onerror: err=>console.log(err.message)
});

// You can use an array to import more than one file at once
await yourdb_importer.import(['yourdb.sql', 'yourdb2.sql']);

// Or you can give the path to a directory and import every sql file in that path
await yourdb_importer.import('/path/to/my/sql');
```

## Contributing

Contributions are more than welcome! Please check out the [Contributing Guidelines](https://github.com/Pamblam/mysql-import/blob/master/CONTRIBUTING.md) for this project. 
