/*global process, require*/

var conf = require('./config/config');
var logger = require('./packages/logger');
var amqpClient = require('./packages/amqpClient.js').getInstance(conf, logger);
var session = require('./packages/sessionUtils').getInstance();
//console.log('conf', conf);

var amqpMainExchange, amqpMainQueueKey;

// Handle for amqpClient error event
var onAmqpClientError = function(err) {
	logger.error('AMQP Client Error', err);	
};

// handler for amqpClient connected event
var onAmqpClientConnected = function() {
	logger.cyan('onAmqpClientConnected');

	// on amqpClient connected,
	// initialize main queue
	amqpClient.initMainQueue(onInitMainQueueReady);
};

// start listening to amqpClient events
logger.cyan('listening to even: ' + amqpClient.eventNames.connected);
amqpClient.emitter.on(amqpClient.eventNames.error, onAmqpClientError);
amqpClient.emitter.on(amqpClient.eventNames.connected, onAmqpClientConnected);
// amqpClient.emitter.on(amqpClient.eventNames.assertExchange + '_' + amqpClient.keys.mainExchangeKey, onAssertMainExchange);
// amqpClient.emitter.on(amqpClient.eventNames.assertQueue + '_' + amqpClient.keys.mainQueueKey, onAssertMainQueue);
// amqpClient.emitter.on(amqpClient.eventNames.bindQueue + '_' + amqpClient.keys.mainQueueKey + '_' + amqpClient.keys.mainExchangeKey, onBindMainQueue);

// callback called by amqpCLient once the main queue is ready
var onInitMainQueueReady = function(result){
	logger.cyan('onInitMainQueueReady ready: start publishing to', result.mainQueue.name);
	amqpMainExchange = result.mainExchange;
	amqpMainQueueKey = result.mainQueue.name;

	amqpClient.initReplyQueue(onInitReplyQueueReady);

};

// callback called by amqpCLient once the main queue is ready
var onInitReplyQueueReady = function(result){
	logger.cyan('onInitReplyQueueReady ready: start listening to', result.replyQueue.name);
	amqpMainQueueKey = result.replyQueue.name;

	// subscribe to main queue
	result.replyQueue.subscribe({
			ack: true
			, prefetchCount: 1
		},
		onConsumeReplyQueue);

	publishRoutine();
};

// handler for queue subscribe. It will consume the queue messages as they come through.
var onConsumeReplyQueue = function(msg, headers, deliveryInfo, amqpMessageObject) {
	//console.log('onConsumeReplyQueue', msg);

	// convert message to string
	var message = msg.data 
	 	? msg.data.toString('utf8') 
	 	: null;
	
	if (!message){
		throw new Error('message is null');
	}
	logger.silly('onConsumeReplyQueue received reply', message);

	amqpMessageObject.acknowledge(false);
};


var PUBLISH_RATE = 1000 //every 6 seconds
  , count        = 1;
// just a simple publish routine to simulate messages published to the queue
var publishRoutine = function(){
	//console.log('publishRoutine');

	var sequence = -1;
	var sessionId = session.getNewSessionID();
		
	setInterval(function() {
		var payload = {
			sessionId: 	 sessionId  
			, sentAt: 	 (new Date()).toString()
			, sequence:  ++sequence
		};
		var encodedPayload =  JSON.stringify(payload);
	
		logger.info('publish ', {
			queueKey: amqpMainQueueKey,
			payload: encodedPayload
		});

		amqpMainExchange.publish(amqpMainQueueKey, new Buffer(encodedPayload), {
			mandatory: true
			, ack: true
			, deliveryMode: 2 // persistent
			, replyTo: 'reply_queue'
		}, function publishCallback(hasError){
			if (hasError){
				logger.info('amqpMainExchange publish callback hasError:', hasError);
			}
		});

	}, PUBLISH_RATE);
};
