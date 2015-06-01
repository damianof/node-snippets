/*global process*/
'use strict';

/**
 	* @method getQueueIndex
	* @param {String} sessionId  the sessionId
	* @param {Number} numOfJobQueues  the total number of job queues available 
	* @description
	* Below is the logic to calculate the queue index.
	* It finds last 2 digits of sessionID and then does a remainder with the
	* total no of job queues. 
*/
var getQueueIndex = function(sessionId, numOfJobQueues){
	// validate parameters passed into this function
	if (!sessionId || sessionId.length < 2){
		throw new Error('keyUtils.getQueueIndex ERROR: sessionId parameter must contain a valid string value');
	}
	
	if (!numOfJobQueues || isNaN(numOfJobQueues) || numOfJobQueues < 1){
		console.log('numOfJobQueues', numOfJobQueues);
		throw new Error('keyUtils.getQueueIndex ERROR: numOfJobQueues parameter must contain a valid numeric value');
	}
	
	// parameters are good, now try to convert last 2 chars of sessionId from hex to int
	var jobParse = parseInt(sessionId.substr(sessionId.length - 2), 16);
	
	// do a reminder of the int value with numOfJobQueues
	var queueIndex = jobParse % numOfJobQueues;
	
	// the queueIndex value obtained should never be greater than the total number of queues
	if (queueIndex > numOfJobQueues){
		throw new Error('keyUtils.getQueueIndex ERROR: queueIndex obtained from sessionId is greater than total number of queues available');
	}
	
	return queueIndex;
};



module.exports = {
	getQueueIndex: getQueueIndex	
};
