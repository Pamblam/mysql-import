

<p align="center">
	<img src='https://i.imgur.com/AOfuTLA.png'>
</p>

*Version 5.0.26* ([NPM](https://www.npmjs.com/package/mysql-import)) ([Github](https://github.com/Pamblam/mysql-import/))

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
   - [`importer.onProgress(callback)`](#importerprototypeonprogresscallback)
   - [`importer.onDumpCompleted(callback)`](#importerprototypeondumpcompletedcallback)
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

```js
const host = 'localhost';
const user = 'root';
const password = 'password';
const database = 'mydb';

const Importer = require('mysql-import');
const importer = new Importer({host, user, password, database});

importer.onProgress(progress=>{
  var percent = Math.floor(progress.bytes_processed / progress.total_bytes * 10000) / 100;
  console.log(`${percent}% Completed`);
});

importer.import('path/to/dump.sql').then(()=>{
  var files_imported = importer.getImported();
  console.log(`${files_imported.length} SQL file(s) imported.`);
}).catch(err=>{
  console.error(err);
});
```
## Methods

### `new Importer({host, user, password[, database, port, ssl]})`

The constructor requires an object with a `host`, `user`, and `password` parameter. Passing in a database parameter is optional. Any of the parameters [listed here](https://github.com/mysqljs/mysql#connection-options) will work as well.

### `Importer.prototype.getImported()`

Get an array of files imported.

### `Importer.prototype.setEncoding(encoding)`

Set the encoding to use when reading import files. Supported arguments are: `utf8`, `ucs2`, `utf16le`, `latin1`, `ascii`, `base64`, or `hex`.

### `Importer.prototype.use(database)`

Set or change the database to import to.

### `Importer.prototype.onProgress(callback)`

Set a callback to be called as the importer processes chunks of the dump file. Callback is provided an object with the following properties:

 - `total_files`: The total files in the queue. 
 - `file_no`: The number of the current dump file in the queue. 
 - `bytes_processed`: The number of bytes of the file processed.
 - `total_bytes`: The size of the dump file.
 - `file_path`: The full path to the dump file.

### `Importer.prototype.onDumpCompleted(callback)`

Set a callback to be called after each dump file has completed processing. Callback is provided an object with the following properties:

 - `total_files`: The total files in the queue. 
 - `file_no`: The number of the current dump file in the queue. 
 - `file_path`: The full path to the dump file.
 - `error`: If there was an error, the error object; if no errors, this will be `null`.

### `Importer.prototype.import(...input)`

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

### `Importer.prototype.disconnect(graceful=true)`

Disconnects the connection. If `graceful` is switched to false it will force close any connections. This is called automatically after files are imported so typically *this method should never be required*.

## Contributing

Contributions are more than welcome! Please check out the [Contributing Guidelines](https://github.com/Pamblam/mysql-import/blob/master/CONTRIBUTING.md) for this project. 
