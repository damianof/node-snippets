/*global process, require*/

var conf = require('../config/config');
var logger = require('../packages/logger');
var amqpClient = require('../packages/amqpClient.js').getInstance(conf, logger);
var session = require('../packages/sessionUtils').getInstance();
//console.log('conf', conf);

var amqpTopicExchange;

// Handle for amqpClient error event
var onAmqpClientError = function(err) {
	logger.error('Error on connection with the RabbitMQ server. Error is ****', err);	
};

// handler for amqpClient connected event
var onAmqpClientConnected = function() {
	logger.cyan('onAmqpClientConnected');

	// assert exchange
	amqpClient.assertExchange('TOPIC_TEST', {
		type: 'topic'
		, durable: true
		, autoDelete: false
		, confirm: true
	}, onAssertExchange);
};

// start listening to amqpClient events
logger.cyan('listening to even: ' + amqpClient.eventNames.connected);
amqpClient.emitter.on(amqpClient.eventNames.error, onAmqpClientError);
amqpClient.emitter.on(amqpClient.eventNames.connected, onAmqpClientConnected);


var onAssertExchange = function(result){
	logger.cyan('onAssertExchange ready', result.name);
	amqpTopicExchange = result;
	publishRoutine();
};

var amqpRoutingKeys = [
	'painting'
	, 'painting.oil'
	, 'painting.oil.abstract'
	, 'painting.acrylics'
	, 'painting.acrylics.abstract'
	, 'coding'
	, 'coding.javascript'
	, 'coding.csharp'
];

// helper functions:
function getRandomIntFromMax(max) {
    return Math.floor((Math.random() * max) + 1);
}
var getRandomRoutingKey = function(){
	var n = Number(amqpRoutingKeys.length-1);
	var r = getRandomIntFromMax(n);
	return amqpRoutingKeys[r];
};

var PUBLISH_RATE = 1000 //every 6 seconds
// just a simple publish routine to simulate messages published to the queue
var publishRoutine = function(){
	//console.log('publishRoutine');

	var sequence = -1;
	var sessionId = session.getNewSessionID();
		
	setInterval(function() {
		
		var amqpRoutingKey = getRandomRoutingKey();
		
		var payload = {
			sessionId: 	 sessionId  
			, sentAt: 	 (new Date()).toString()
			, sequence:  ++sequence
			, message:   amqpRoutingKey + ': Some update about this'
		};
		var encodedPayload =  JSON.stringify(payload);
	
		logger.info('publish ', {
			amqpRoutingKey: amqpRoutingKey,
			payload: encodedPayload
		});

		amqpTopicExchange.publish(amqpRoutingKey, new Buffer(encodedPayload), {
			mandatory: true
			, ack: true
			, deliveryMode: 2 // persistent
		}, function publishCallback(hasError){
			if (hasError){
				logger.error('amqpMainExchange publish callback hasError:', hasError);
			} else {
				logger.info('amqpMainExchange publish callback: completed');
			}
		});

	}, PUBLISH_RATE);
};
