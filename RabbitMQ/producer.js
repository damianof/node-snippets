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
	logger.cyan('onInitMainQueueReady ready: start publishing to', result.mainQueue.name);
	amqpMainExchange = result.mainExchange;
	amqpMainQueueKey = result.mainQueue.name;
	publishRoutine();
};


var PUBLISH_RATE = 1 //every 6 seconds
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
		}, function publishCallback(hasError){
			if (hasError){
				logger.info('amqpMainExchange publish callback hasError:', hasError);
			}
		});

	}, PUBLISH_RATE);
};
