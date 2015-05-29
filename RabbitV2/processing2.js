
var conf = require('./config');
var logger = require('./logger');
var keyUtils = require('./keyUtils');

//console.log('conf', conf);

var queueing = require('./queueing.js').getInstance(conf, logger);
var eventNames = queueing.eventNames;
var amqpKeys = queueing.keys;

conf.numJobQueues = conf.defaults.numJobQueues;
logger.silly('--- PROCESSING ---');

var jobExchange, deadletterExchange, areJobQueuesReady = false;

var onRabbitError = function(err) {
	logger.error('Error on connection with the RabbitMQ server. Error is ****', err);	
};

var onRabbitConnected = function() {
	logger.cyan('onRabbitConnected');

	// first thing init wait queue
	queueing.initWaitQueue(onInitWaitQueueReady);
};

queueing.emitter.on(eventNames.error, onRabbitError);
queueing.emitter.on(eventNames.connected, onRabbitConnected);

var onInitWaitQueueReady = function(result){
	logger.cyan('onInitWaitQueueReady ready', result.waitQueue.name);
	deadletterExchange = result.deadletterExchange;

	queueing.initJobQueues(conf.numJobQueues, onConsumeJobQueues, onInitJobQueuesReady);
};

var onInitJobQueuesReady = function(result){
	logger.cyan('onInitJobQueuesReady');
	jobExchange = result.jobExchange;
	areJobQueuesReady = true;
};

var onConsumeJobQueues = function(msg, headers, deliveryInfo, amqpMessageObject) {
	console.log('onConsumeJobQueues', msg);

	// var message = msg.data 
	//  	? msg.data.toString('utf8') 
	//  	: null;
	
	// if (!message){
	// 	throw new Error('message is null');
	// }
	// //console.log('onConsumeMainQueue', message);


	// //var message = msg.content.toString();
	// var msgObj = JSON.parse(message);
	// var key = (msgObj.sessionId || msgObj._id);
	// // var dbKey = 'c_' + key;
	// // var msgSequence = Number(msgObj.msg.sequence);
	// // var msgCurrentSeq = Number(msgObj.currentSeg) || 0;
	// // var msgIteration = Number(msgObj.iteration || 0);
	// // var calcSequence = msgCurrentSeq + msgIteration;
	// // var nextSequence = 0;
	// // var maxIteration = conf.maxIteration || 5;

	// var	queueIndex = keyUtils.getQueueIndex(key, conf.numJobQueues);
	// var jobQueueKey = amqpKeys.jobQueueKeyPrefix + queueIndex;
	
	// var logData = {
	// 	mainQueueKey: 		amqpKeys.mainQueueKey
	// 	, dateNow: 			(new Date())
	// 	, jobQueueKey: 		jobQueueKey

	// 	//, message: 			msg
	// 	, key: 		key
	// 	//, dbKey: 			dbKey
	// 	// , msgSequence: 		msgSequence
	// 	// , msgCurrentSeq: 	msgCurrentSeq
	// 	// , msgIteration: 	msgIteration
	// 	// , calcSequence: 	calcSequence
	// 	// , nextSequence: 	nextSequence
	// };

	// logger.cyan('onConsumeMainQueue Send to job queue: [' + jobQueueKey + ']', logData);

	// jobExchange.publish(jobQueueKey, new Buffer(JSON.stringify(msgObj)), {
	// 	durable: true
	// }, function publishCallback(hasError){
	// 	if (hasError){
	// 		logger.info('jobExchange publish callback hasError:', hasError);
	// 	}
		
	// 	if (msgObj.msg.event === 'init') {
	// 		//maybeAnswer(msg, dbKey, 0);
	// 	} else {
	// 		amqpMessageObject.acknowledge(false);
	// 	}
	// });
};

