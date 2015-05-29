
var conf = require('./config');
var logger = require('./logger');
var keyUtils = require('./keyUtils');

//console.log('conf', conf);

var queueing = require('./queueing.js').getInstance(conf, logger);
var eventNames = queueing.eventNames;
var amqpKeys = queueing.keys;

conf.numJobQueues = conf.defaults.numJobQueues;
logger.silly('--- CONTROLLER ---');

var jobExchange, mainQueue;

var onRabbitError = function(err) {
	logger.error('Error on connection with the RabbitMQ server. Error is ****', err);	
};

var onRabbitConnected = function() {
	logger.cyan('onRabbitConnected');

	queueing.initJobQueues(conf.numJobQueues, null, onInitJobQueuesReady);
};

queueing.emitter.on(eventNames.error, onRabbitError);
queueing.emitter.on(eventNames.connected, onRabbitConnected);

var onInitJobQueuesReady = function(result){
	logger.cyan('onInitJobQueuesReady ready', result.jobExchange.name);
	jobExchange = result.jobExchange;

	// init main queues
	queueing.initMainQueue(onInitMainQueueReady);
};

var onInitMainQueueReady = function(result){
	logger.cyan('onInitMainQueueReady ready: start consuming from', result.mainQueue.name);
	mainQueue = result.mainQueue;

	// subscribe to main queue
	mainQueue.subscribe({
			ack: true
			, prefetchCount: 1
		},
		onConsumeMainQueue);
};

function getRandomIntFromMax(max) {
    return Math.floor((Math.random() * max) + 1);
}
var getRandomJobQueueKey = function(){
	var n = Number(conf.numJobQueues);
	var r = getRandomIntFromMax(n);
	return queueing.keys.jobQueueKeyPrefix + r;
};

var onConsumeMainQueue = function(msg, headers, deliveryInfo, amqpMessageObject) {
	//console.log('onConsumeMainQueue', msg);

	var message = msg.data 
	 	? msg.data.toString('utf8') 
	 	: null;
	
	if (!message){
		throw new Error('message is null');
	}
	//console.log('onConsumeMainQueue', message);


	//var message = msg.content.toString();
	var msgObj = JSON.parse(message);
	var key = (msgObj.sessionId || msgObj._id);
	// var dbKey = 'c_' + key;
	// var msgSequence = Number(msgObj.msg.sequence);
	// var msgCurrentSeq = Number(msgObj.currentSeg) || 0;
	// var msgIteration = Number(msgObj.iteration || 0);
	// var calcSequence = msgCurrentSeq + msgIteration;
	// var nextSequence = 0;
	// var maxIteration = conf.maxIteration || 5;

	//var	queueIndex = keyUtils.getQueueIndex(key, conf.numJobQueues);
	//var queueKey = amqpKeys.jobQueueKeyPrefix + queueIndex;
	var queueKey = getRandomJobQueueKey();
	
	var logData = {
		mainQueueKey: 		amqpKeys.mainQueueKey
		, dateNow: 			(new Date())
		, queueKey: 		queueKey
		, count: 			msgObj.count

		//, message: 			msg
		, key: 		key
		//, dbKey: 			dbKey
		// , msgSequence: 		msgSequence
		// , msgCurrentSeq: 	msgCurrentSeq
		// , msgIteration: 	msgIteration
		// , calcSequence: 	calcSequence
		// , nextSequence: 	nextSequence
	};

	jobExchange.publish(queueKey, new Buffer(JSON.stringify(msgObj)), {
			mandatory: true
			, ack: true
			, deliveryMode: 2 // persistent
	}, function publishCallback(hasError){
		if (hasError){
			logger.error('--- jobExchange publish callback hasError:', hasError);
		} else {
			logger.info('onConsumeMainQueue: sent to job queue [' + queueKey + ']', logData);
		}
		
		amqpMessageObject.acknowledge(false);
	});
};

