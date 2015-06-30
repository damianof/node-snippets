/**
	* @module cryptoUtils
	* @description
	* File contains utils for handling files.
*/
'use strict';

// get dependencies
var crypto = require('crypto');

/**
	* @method encrypt
	* @param {String} data  the data to encrypt
	* @param {String} key  the password to be used for encrypting the file
	* @param {Function} cb  a callback function that will be invoked on completion
	* @description
	* Method will encrypt a file with 'aes-256-ctr'.
*/
var encrypt = function(data, key, iv, cb){
	try {
		var algorithm = 'aes-256-gcm'; //aes-256-ctr';

		var cipher = crypto.createCipheriv(algorithm, key, iv);
		var result = cipher.update(data, 'utf8', 'hex');
		result += cipher.final('hex');
		var tag = cipher.getAuthTag();

		console.log('encrypt completed');
		
		var error;
		if (result.length == 0){
			result = undefined;
			error = {error: 1, message: 'EMPTY AFTER ENCRYPT', statusCode: 0};
		}

		cb(error, {
			content: result,
			tag: tag
		});

	} catch(e) {
		cb(e);
	}
};

/**
	* @method decrypt
	* @param {String} data  the data to decrypt
	* @param {String} key  the password to be used for decrypting the file
	* @param {Function} cb  a callback function that will be invoked on completion
	* @description
	* Method will decrypt it a text file previously encrypted with 'aes-256-ctr'.
*/
var decrypt = function(encrypted, key, iv, cb){
	try {
		var algorithm = 'aes-256-gcm'; //aes-256-ctr';

		var decipher = crypto.createDecipheriv(algorithm, key, iv);
		decipher.setAuthTag(encrypted.tag);
  		var result = decipher.update(encrypted.content, 'hex', 'utf8');
		result += decipher.final('utf8');

		var error;
		if (result.length == 0){
			result = undefined;
			error = {error: 1, message: 'EMPTY AFTER DECRYPT', statusCode: 0};
		}

		cb(error, result);

	} catch (e){
		cb(e);
	}
};

var hashData = function(data, salt, cb){
	try {
		var algorithm = 'sha512';

		var hmac = crypto.createHmac(algorithm, salt);
		hmac.update(data);
		var result = hmac.digest('hex');

		var error;
		if (result.length == 0){
			result = undefined;
			error = {error: 1, message: 'EMPTY AFTER HASHDATA', statusCode: 0};
		}

		cb(error, result);

	} catch (e){
		cb(e);
	}
};

var hashData2 = function(data, salt, cb){
	var iterations = 5000;
	var keylen = 128; // bytes
	var digest = 'sha512';

	var callback = function(err, result){
		var error;
		
		if (err){
			error = err;
		} else {
			var hexHash = Buffer(data, 'utf8').toString('hex');

			if (result.length == 0){
				result = undefined;
				error = {error: 1, message: 'EMPTY AFTER HASHDATA2', statusCode: 0};
			}
		}

		cb(error, result);
	};

	crypto.pbkdf2(data, salt, iterations, keylen, digest, callback);
}



// export an object to node with only the functionality to be exposed
module.exports = {
	encrypt: encrypt,
	decrypt: decrypt,
	hashData: hashData,
	hashData2: hashData2
};
