'use strict';

// get dependencies
var path = require('path')
	, fs = require('fs')
	, crypto = require('crypto')
	, zlib = require('zlib')
	, http = require('http');

/**
* @method downloadFileFromHttp
* @param {Object} httpOptions  the http options (host, port, path to file to be downloaded)
* @param {String} destPath  the full path to the destination file
* @param {Function} cb  a callback function that will be invoked on completion
* @description
* Method will download a file from a url through htttp and save to destination path.
*/
var downloadFileFromHttp = function (httpOptions, destPath, cb) {
	var writeStream;

	// issue get request
	http.get(httpOptions, function fetchFileFromUrl(res, err) {
		//console.log('downloadFileFromHttp: res.statusCode', [res.statusCode, err]);

		if (res.statusCode == 200) {
			// create a write stream for the destination
			writeStream = fs.createWriteStream(destPath);

			res.on('error', function (e) {
                console.log('downloadFileFromHttp: on error', e);
                if (cb) {
					cb(e);
				}
            });

			res.on('data', function (chunk) {
				//console.log('downloadFileFromHttp: downloading...');
				writeStream.write(chunk);
			});

			res.on('end', function () {
				console.log('downloadFileFromHttp: completed. Invoking callback.');
				writeStream.end();
				writeStream.close();

				if (cb) {
					cb();
				}
			});

		} else {

			// close stream
			if (writeStream) {
				writeStream.end();
			}

			// Delete the file async.
			fs.exists(destPath, function (exists) {
				if (exists) {
					fs.unlink(destPath);
				}
			});

			// invoke callback passing error result
			if (cb) {
				cb({ error: 1, statusCode: res.statusCode, message: 'Invalid statusCode received' });
			}

		}

	}).on('error', function (err) { // Handle errors
		//console.log('downloadFileFromHttp: error');

		// close stream
		if (writeStream) {
			writeStream.end();
		}

		// Delete the file async.
		fs.exists(destPath, function (exists) {
			if (exists) {
				fs.unlink(destPath);
			}
		});

		// invoke callback passing error result
		if (cb) {
			cb(err ? err : undefined);
		}
	});
};

/**
* @method readFileFromHttp
* @param {Object} httpOptions  the http options (host, port, path to file to be downloaded)
* @param {Function} cb  a callback function that will be invoked on completion with the buffer passed into it
* @description
* Method will read a file from a url through htttp and return buffer to callback.
*/
var readFileFromHttp = function (httpOptions, cb) {

	// issue get request
	http.get(httpOptions, function fetchFileFromUrl(res, err) {
		//console.log('readFileFromHttp: res.statusCode', [res.statusCode, err]);
		var bufArray = [];

		if (res.statusCode == 200) {

			res.on('data', function (chunk) {
				//console.log('readFileFromHttp: downloading...');
				bufArray.push(chunk);
			});

			res.on('end', function () {
				//console.log('readFileFromHttp: completed. Invoking callback.');

				var buffer, error;
				if (bufArray.length > 0) {
					// if not empty, concat buffer
					buffer = Buffer.concat(bufArray);
				} else {
					error = { error: 1, message: 'EMPTY BUFFER', statusCode: 0 };
				}

				if (cb) {
					cb(error, buffer);
				}
			});

		} else {

			// clear buffer
			bufArray = [];

			// invoke callback passing error result
			if (cb) {
				cb({ error: 1, statusCode: res.statusCode, message: 'http.get returned bad statusCode' });
			}

		}

	}).on('error', function (err) { // Handle errors
		console.log('readFileFromHttp: error', err);

		// invoke callback passing error result
		if (cb) {
			cb(err ? err : undefined);
		}
	});
};

/**
* @method compress
* @param {String} sourcePath  the full path to the file to compressed
* @param {String} destPath  the full path to the destination output file
* @param {Function} cb  a callback function that will be invoked on completion
* @description
* Method will compress a file using GZip and save the output to destPath.
*/
var compress = function (sourcePath, destPath, cb) {
	var readStream = fs.createReadStream(sourcePath) // file to unzip
		, writeStream = fs.createWriteStream(destPath) // dest file
		, gzip = zlib.createGzip();

	readStream  // reads current file
		.pipe(gzip) // compress
		.pipe(writeStream)   // writes to out file
		.on('finish', function () {  // finished
		//console.log('compress: done');
		if (cb) {
			cb();
		}
	})
		.on('error', function (err) {
		//console.log('compress: error');
		// close stream
		writeStream.end();

		// Delete the file async.
		fs.exists(destPath, function (exists) {
			if (exists) {
				fs.unlink(destPath);
			}
		});

		if (cb) {
			cb(err);
		}
	});
};

/**
* @method extract
* @param {String} sourcePath  the full path to the file to be extracted
* @param {String} destPath  the full path to the destination output file
* @param {Function} cb  a callback function that will be invoked on completion
* @description
* Method will extract a GZipped file and save the output to destPath
*/
var extract = function (sourcePath, destPath, cb) {
	var readStream = fs.createReadStream(sourcePath) // source file to zip
		, writeStream = fs.createWriteStream(destPath) // dest file
		, gzip = zlib.createGunzip();

	readStream
		.pipe(gzip)  // extracts
		.pipe(writeStream)  // writes to out file
		.on('finish', function () {  // all done
		//console.log('extract: done');
		if (cb) {
			cb();
		}
	})
		.on('error', function (err) {
		//console.log('extract: error');
		// close stream
		writeStream.end();

		// Delete the file async.
		fs.exists(destPath, function (exists) {
			if (exists) {
				fs.unlink(destPath);
			}
		});

		if (cb) {
			cb(err);
		}
	});
};

/**
* @method encrypt
* @param {String} sourcePath  the full path to the file to be encrypted
* @param {String} destPath  the full path to the destination output file
* @param {String} password the password to be used for encrypting the file
* @param {Function} cb  a callback function that will be invoked on completion
* @description
* Method will encrypt a file with 'aes-256-ctr'.
*/
var encrypt = function (sourcePath, destPath, password, cb) {
	try {
		var algorithm = 'aes-256-ctr';

		fs.readFile(sourcePath, function (err, data) {
			if (err) {
				cb(err);
			}

			var cipher = crypto.createCipher(algorithm, password);
			var crypted = cipher.update(data, 'ascii', 'utf8');
			crypted += cipher.final('utf8');

			fs.writeFile(destPath, crypted, function (err2) {
				console.log('encrypt write file completed');
				cb(err2 ? err2 : undefined);
			});
		});

	} catch (e) {
		cb(e);
	}
};

/**
* @method decryptBuffer
* @param {String} buffer  the content to decrypt
* @param {String} password the password to be used for decrypting the buffer
* @param {Function} cb  a callback function that will be invoked on completion
* @description
* Method will decrypt a buffer previously encrypted with 'aes-256-ctr'.
*/
var decryptBuffer = function (buffer, password, cb) {
	try {
		var algorithm = 'aes-256-ctr';
		var decipher = crypto.createDecipher(algorithm, password);
		var result = decipher.update(buffer, 'utf8', 'ascii');
		result += decipher.final('ascii');

		var error;
		if (result.length == 0) {
			result = undefined;
			error = { error: 1, message: 'EMPTY AFTER DECRYPT', statusCode: 0 };
		}

		cb(error, result);
	} catch (err) {
		cb(err ? err : undefined);
	}
};

/**
* @method decrypt
* @param {String} sourcePath  the full path to the file to be decrypted
* @param {String} destPath  the full path to the destination output file
* @param {String} password the password to be used for decrypting the file
* @param {Function} cb  a callback function that will be invoked on completion
* @description
* Method will decrypt it a text file previously encrypted with 'aes-256-ctr'.
*/
var decrypt = function (sourcePath, destPath, password, cb) {
	try {
		fs.readFile(sourcePath, function (err, buffer) {
			if (err) {
				cb(err);
			}

			decryptBuffer(buffer, password, function (errDecrypt, decrypted) {
				if (errDecrypt) {
					cb(errDecrypt);
				} else {
					fs.writeFile(destPath, decrypted, function (errWriteFile) {
						console.log('decrypt write file completed');
						cb(errWriteFile ? errWriteFile : undefined);
					});
				}
			});
		});

	} catch (e) {
		cb(e);
	}
};

// export an object to node with only the functionality to be exposed
module.exports = {
	downloadFileFromHttp: downloadFileFromHttp,
	readFileFromHttp: readFileFromHttp,
	compress: compress,
	extract: extract,
	encrypt: encrypt,
	decrypt: decrypt,
	decryptBuffer: decryptBuffer
};