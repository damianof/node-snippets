/**
	* @description
	* Unit tests against the cryptoUtils.js file.
*/
/*global require, describe, it*/
'use strict';

/* eslint no-undef:0 */
var chai = require('chai');
var expect = chai.expect;
var cryptoUtils = require('../lib/cryptoUtils.js');


describe('cryptoUtils tests', function(){

	describe('encrypt and decrypt tests', function(){

		// it('should successfully encrypt data', function(done){

		// 	var data = 'here is my data to encrypt'
		// 		, password = 'pwd1$';

		// 	cryptoUtils.encrypt(data, password, function(encryptError, encryptResult){
		// 		console.log('encrypt encryptError', encryptError);
		// 		console.log('encrypt encryptResult', encryptResult);

		// 		expect(encryptError).to.be.undefined;
		// 		expect(encryptResult).to.not.be.undefined;

		// 		done();
		// 	});

		// });

		it('should successfully decrypt data', function(done){

			var data = 'here is my data to encrypt asd asd asd asd asd asdasdasdas'
				, password = 'pwd1$';

			cryptoUtils.encrypt(data, password, function(encryptError, encryptResult){
				console.log('encrypt encryptError', encryptError);
				console.log('encrypt encryptResult', encryptResult.length, encryptResult);

				expect(encryptError).to.be.undefined;
				expect(encryptResult).to.not.be.undefined;


				cryptoUtils.decrypt(encryptResult, password, function(decryptError, decryptResult){
					console.log('decrypt decryptError', decryptError);
					console.log('decrypt decryptResult', decryptResult);

					expect(decryptError).to.be.undefined;
					expect(decryptResult).to.not.be.undefined;

					done();
				});
			});
		});

		it('should successfully hash data', function(done){

			var data = 'here is my data to hash asd asd asd asd asd asdasdasdas'
				, password = 'pwd1$';

			cryptoUtils.hashData(data, password, function(hashError, hashResult){
				console.log('hashData hashError', hashError);
				console.log('hashData hashResult', hashResult.length, hashResult);

				expect(hashError).to.be.undefined;
				expect(hashResult).to.not.be.undefined;

				done();
			});
		});
	});
});

