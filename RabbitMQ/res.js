/*global process, require*/

var conf = require('./config/config');
var logger = require('./packages/logger');
var amqpClient = require('./packages/amqpClient.js').getInstance(conf, logger);
var session = require('./packages/sessionUtils').getInstance();
//console.log('conf', conf);

var amqpMainExchange, amqpMainQueueKey;

// Handle for amqpClient error event
var onAmqpClientError = function(err) {
	logger.error('Error on connection with the RabbitMQ server. Error is ****', err);	
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
	logger.cyan('onInitMainQueueReady ready: start listening to', result.mainQueue.name);
	amqpMainExchange = result.mainExchange;
	amqpMainQueueKey = result.mainQueue.name;

	// subscribe to main queue
	result.mainQueue.subscribe({
			ack: true
			, prefetchCount: 1
		},
		onConsumeMainQueue);
};

// handler for queue subscribe. It will consume the queue messages as they come through.
var onConsumeMainQueue = function(msg, headers, deliveryInfo, amqpMessageObject) {
	//console.log('onConsumeMainQueue', msg);

	// convert message to string
	var message = msg.data 
	 	? msg.data.toString('utf8') 
	 	: null;
	
	if (!message){
		throw new Error('message is null');
	}
	logger.cyan('onConsumeMainQueue', message);

	amqpMessageObject.acknowledge(false);
};

