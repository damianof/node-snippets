/**
	* @module cryptoUtils
	* @description
	* File contains utils for handling files.
*/
'use strict';

// get dependencies
var crypto = require('crypto');
var encryptAlgorithm = 'aes-256-gcm'
	, hashAlgorithm = 'sha512'
	, instance;

/**
	* @method encrypt
	* @param {String} data  the data to encrypt
	* @param {String} key  the password to be used for encrypting the file
	* @param {String} iv  the initialization vector to be used for encrypting the file
	* @param {Function} cb  a callback function that will be invoked on completion
	* @description
	* Method will encrypt a file with 'aes-256-gcm'.
*/
var encrypt = function(data, key, iv, cb){
	try {
		var cipher = crypto.createCipheriv(encryptAlgorithm, key, iv);
		var result = cipher.update(data, 'utf8', 'hex');
		result += cipher.final('hex');
		
		var tag = cipher.getAuthTag();
		
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
		var decipher = crypto.createDecipheriv(encryptAlgorithm, key, iv);
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
		var hmac = crypto.createHmac(hashAlgorithm, salt);
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

	var callback = function(err, result){
		var error;
		
		if (err){
			error = err;
		} else {
			if (result.length == 0){
				result = undefined;
				error = {error: 1, message: 'EMPTY AFTER HASHDATA2', statusCode: 0};
			}
		}

		cb(error, result);
	};

	crypto.pbkdf2(data, salt, iterations, keylen, hashAlgorithm, callback);
};


var getInstance = function(){
	if (!instance){
		instance = {
			encrypt: encrypt,
			decrypt: decrypt,
			hashData: hashData,
			hashData2: hashData2
		};
	}
	
	return instance;
};

module.exports = {
	getInstance: getInstance
};
