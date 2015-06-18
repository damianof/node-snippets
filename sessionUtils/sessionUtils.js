/**
	* @module sessionUtils
	* @description
	* File contains code related to session (i.e. getNewSessionID etc);
*/
/*global process, require*/
'use strict';

// get dependencies
var time = require('time')
	, config = require('../conf/index.js').get(process.env.NODE_ENV)
	, base62 = require('./base62');


// internal variables
var instance, counter = 0;

/**
	* @method setup
	* @description
	* Performs necessary setup and initialization
*/
var setup = function(){

	var newInstance = {};

	// store a reference to the nodeID (ServoID) locally
	newInstance.nodeID = config.nodeID;

	/**
		* @method lpad
		* @param {Object} args contains the arguments necessary
		* @description
		* Function to pad a value with leading char
		* We wanted to avoid using a 3rd party library and so far this function.
		* It seems to perform very fast.
	*/
	newInstance.lpad = function(args){
		//console.log('lpad', args);

		// convert val to string and cache its length in local variable
		var strVal = args.val.toString()
			, strValLen = strVal.length;

		if (strValLen < args.fixedLen){
			/** *Calculate length of padding */
			var padLen = args.fixedLen - strValLen;

			// create an array filled with padVal of length padLen
			var array = [], i = 0;
			while (i < padLen) {
				array[i++] = args.padVal;
			}
			//return array;
			return array.join('') + strVal;
		} else {
			return strVal;
		}
	};

	/**
		* @method getCounter
		* @description
		* Function will return the correct counter value.
		* Counter is increased on each call, but will reset when
		* reaching 65536
	*/
	newInstance.getCounter = function(){
		var result = ++counter;
		if (result < 65536){
			return result;
		} else {
			counter = 0;
			return counter;
		}
	};

	/**
		* @method getNewSessionID
		* @description
		* Function will return a new session id following a k-ordered standard structured this way:<br/>
		*	[ServoID] + [Counter] + [TimeStamp]<br/>
		* The valued returned is base-62 (0-9 a-z A-Z) encoded<br/>
	*/
	newInstance.getNewSessionID = function(){

		// replace counter with actual value padded to a fixed length of 256
		var currentCounter = newInstance.getCounter();
		//console.log('currentCounter', counter);
		var hexCounter = currentCounter.toString(16);
		//console.log('HEX currentCounter', hexCounter);

		var padCounter = newInstance.lpad({fixedLen: 4, padVal: '0', val: hexCounter});
		//console.log('padCounter', padCounter);

		// replace timestamp with actual value
		var timestamp = Date.now(); // i.e. 1428428348576
		//console.log('timestamp plain **** ', timestamp);
		var hexTimestamp = timestamp.toString(16);

		// vuild the sessionId from the three parts above and also removes any dashes
		//console.log('parts ', [newInstance.nodeID, padCounter, hexTimestamp])
		var sessionID = (config.nodeID + padCounter + hexTimestamp).replace(/-/gi, '');

		// return final value
		//console.log('sessionID plain **** ', sessionID);
		sessionID = base62.encode(sessionID);
		//console.log('sessionID base62 **** ', sessionID);
		return sessionID;
	};

	// assign to private variable instance
	instance = newInstance;
};


// Using the revealing module pattern, we expose only the getInstance function
// while keeping the 'var instance' private.
// export to node js
module.exports = {
	/**
		* @method getInstance
		* @description
		* Function that will be exposed to consuming code<br/>
		* Returns the singleton instance of sessionUtls
	*/
	getInstance: function () {
		if (!instance) {
			setup();
		}

		return instance;
	}
};
