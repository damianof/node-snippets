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
	* @param {String} data the data to encrypt
	* @param {String} password 	the password to be used for encrypting the file
	* @param {Function} cb  a callback function that will be invoked on completion
	* @description
	* Method will encrypt a file with 'aes-256-ctr'.
*/
var encrypt = function(data, password, cb){
	try {
		var algorithm = 'aes-256-ctr';

		var cipher = crypto.createCipher(algorithm, password);
		var result = cipher.update(data, 'utf8', 'hex');
		result += cipher.final('hex');

		console.log('encrypt completed');
		
		var error;
		if (result.length == 0){
			result = undefined;
			error = {error: 1, message: 'EMPTY AFTER ENCRYPT', statusCode: 0};
		}

		cb(error, result);

	} catch(e) {
		cb(e);
	}
};

/**
	* @method decrypt
	* @param {String} data the data to decrypt
	* @param {String} password 	the password to be used for decrypting the file
	* @param {Function} cb  a callback function that will be invoked on completion
	* @description
	* Method will decrypt it a text file previously encrypted with 'aes-256-ctr'.
*/
var decrypt = function(data, password, cb){
	try {
		var algorithm = 'aes-256-ctr';

		var decipher = crypto.createDecipher(algorithm, password);
		var result = decipher.update(data, 'hex', 'utf8');
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

var hashData = function(data, password, cb){
	try {
		var algorithm = 'sha512';

		var hmac = crypto.createHmac(algorithm, password);
		hmac.update(data);
		var result = hmac.digest('hex');

		var error;
		if (result.length == 0){
			result = undefined;
			error = {error: 1, message: 'EMPTY AFTER HASH', statusCode: 0};
		}

		cb(error, result);

	} catch (e){
		cb(e);
	}
};



// export an object to node with only the functionality to be exposed
module.exports = {
	encrypt: encrypt,
	decrypt: decrypt,
	hashData: hashData
};
