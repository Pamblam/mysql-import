
<p align="center">
	<img src='https://i.imgur.com/AOfuTLA.png'>
</p>

*Version 4.0.24* ([NPM](https://www.npmjs.com/package/mysql-import)) ([Github](https://github.com/Pamblam/mysql-import/))

[![Build Status](https://api.travis-ci.org/Pamblam/mysql-import.svg?branch=master)](https://travis-ci.org/Pamblam/mysql-import/) [![Coverage Status](https://coveralls.io/repos/github/Pamblam/mysql-import/badge.svg?branch=master)](https://coveralls.io/github/Pamblam/mysql-import?branch=master)

Import MySQL files with Node!

## Table of Contents

 - [Install](#install)
 - [TLDR (Example)](#tldr)
 - [Methods](#methods)
   - [`constructor`](#new-importerhost-user-password-database)
   - [`importer.getImported()`](#importerprototypegetimported)
   - [`importer.setEncoding(encoding)`](#importerprototypesetencodingencoding)
   - [`importer.use(database)`](#importerprototypeusedatabase)
   - [`importer.import(...input)`](#importerprototypeimportinput)
   - [`importer.disconnect(graceful=true)`](#importerprototypedisconnectgracefultrue)
 - [Contributing](#contributing)

## Install
via  [NPM](https://www.npmjs.com/package/mysql-import):
```
$ npm install --save-dev mysql-import
```
Via [Github](https://github.com/Pamblam/mysql-import/):
```
git clone https://github.com/Pamblam/mysql-import.git
```

## TLDR:

```
const host = 'localhost';
const user = 'root';
const password = 'password';
const database = 'mydb';

const mysql_import = require('mysql-import');
const Importer = require('../mysql-import.js');
const importer = new Importer({host, user, password, database});

importer.import('path/to/dump.sql').then(()=>{
  var files_imported = importer.getImported();
  console.log('${files_imported.length} SQL file(s) imported.');
}).catch(err=>{
  console.error(err);
});
```
## Methods

#### new Importer({host, user, password[, database]})

The constructor requires an object with a `host`, `user`, and `password` parameter. Passing in a database parameter is optional.

#### Importer.prototype.getImported()

Get an array of files imported.

#### Importer.prototype.setEncoding(encoding)

Set the encoding to use when reading import files. Supported arguments are: `utf8`, `ucs2`, `utf16le`, `latin1`, `ascii`, `base64`, or `hex`.

#### Importer.prototype.use(database)

Set or change the database to import to.

#### Importer.prototype.import(...input)

Import an `.sql` file or files into the database. This method will take...

 - Any number of paths to individual `.sql` files.
   ```
   importer.import('path/to/dump1.sql', 'path/to/dum2.sql')
   ```
 - Any number of paths that contain any number of `.sql` files.
   ```
   importer.import('path/to/mysqldumps/')
   ```
 - Any number of arrays containing either of the above.
   ```
   importer.import(['path/to/dump.sql', 'path/to/dumps/'])
   ```
 - Any combination of any of the above.

#### Importer.prototype.disconnect(graceful=true)

Disconnects the connection. If `graceful` is switched to false it will force close any connections. This is called automatically after files are imported so typically *this method should never be required*.

## Contributing

Contributions are more than welcome! Please check out the [Contributing Guidelines](https://github.com/Pamblam/mysql-import/blob/master/CONTRIBUTING.md) for this project. 
