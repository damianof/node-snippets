

var conf = require('../config/config');
var logger = require('../packages/logger');
var session = require('../packages/sessionUtils').getInstance();
var amqpClient = require('../packages/amqpClient.js').getInstance(conf, logger);
var eventNames = amqpClient.eventNames;
var keys = amqpClient.keys;

logger.silly('--- TEST WAIT QUEUE ---');

var PUBLISH_RATE = 5000 //every 6 seconds
  , count        = 1;

var deadletterExchange;

var onRabbitError = function(err) {
	logger.error('onRabbitError', err);	
};

var onRabbitConnected = function() {
	//var conn = amqpClient.connection;
	logger.cyan('onRabbitConnected');

	// init main queues
	amqpClient.initMainQueue(onInitMainQueueReady);
};

logger.cyan('listening to event: ' + eventNames.connected);
amqpClient.emitter.on(eventNames.error, onRabbitError);
amqpClient.emitter.on(eventNames.connected, onRabbitConnected);

var onInitMainQueueReady = function(result){
	logger.cyan('onInitMainQueueReady ready: start consuming from', result.mainQueue.name);
	mainQueue = result.mainQueue;

	// init wait queues
	amqpClient.initWaitQueue(onInitWaitQueueReady);
};

var onInitWaitQueueReady = function(result){
	logger.cyan('onInitWaitQueueReady ready', result.waitQueue.name);
	deadletterExchange = result.deadletterExchange;

	//logger.warn('deadletterExchange typeof', typeof deadletterExchange);

	if (deadletterExchange == undefined){
		throw new Error('deadletterExchange return undefined');
	}

	// subscribe to main queue
	mainQueue.subscribe({
			ack: true
			, prefetchCount: 1
		},
		onConsumeMainQueue);


	publishRoutine();
};

var onConsumeMainQueue = function(msg, headers, deliveryInfo, amqpMessageObject) {
	var message = msg.data 
	 	? msg.data.toString('utf8') 
	 	: null;
	
	if (!message){
		throw new Error('message is null');
	}
	logger.silly('onConsumeMainQueue', message);
	amqpMessageObject.acknowledge(false);
}

var publishRoutine = function(){
	//console.log('publishRoutine', getRandomJobQueueKey());

	var sequence = 0;
	var sessionId = session.getNewSessionID();
		
	setInterval(function() {
		//console.log('publishRoutine', getRandomJobQueueKey());
		var payload = {
			sessionId: 		sessionId  
			, count: 		count++
			, sentAt: 		(new Date()).toString()
			, msg: 			{
				sequence:  sequence++
			}
		};
		var encodedPayload =  JSON.stringify(payload);

		var queueKey = mainQueue.name;

		deadletterExchange.publish(queueKey, new Buffer(encodedPayload), {
			mandatory: true
			, ack: true
			, deliveryMode: 2 // persistent
		}, function publishCallback(hasError){
			if (hasError){
				logger.error('--- deadletterExchange publish callback hasError:', hasError);
			} else {
				logger.info('published to wait queue [' + queueKey + ']', encodedPayload);
			}
		});

	}, PUBLISH_RATE);
};
