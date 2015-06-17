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
	setupQueues();
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


var onConsumeQueue = function(msg, headers, deliveryInfo, amqpMessageObject) {
	logger.silly('onConsumeQueue deliveryInfo', deliveryInfo.queue);

	var msgStr = msg.data 
	 	? msg.data.toString('utf8') 
	 	: null;
	
	if (!msgStr){
		logger.error('onConsumeQueue ERROR: message is null', msg.data);
		throw new Error('message is null');
	} else {
		logger.silly('onConsumeQueue msgStr', msgStr);
	}

	amqpMessageObject.acknowledge(false);
}

var setupQueues = function(){
	logger.info('setupQueues');
	var numOfQueues = amqpRoutingKeys.length;

	var queuesCount = 0;
	var onBindQueue = function (queue){
		logger.info('onBindQueue:', queue.name);
		queuesCount++;

		logger.info('onBindQueue: consume Queues: subscribe to:', queue.name);
		queue.subscribe({
				ack: true
				, prefetchCount: 1
			},
			onConsumeQueue);

		if (queuesCount != numOfQueues){
			return;
		} else {
			// when all job queues are ready, callback
			logger.info('onBindQueue: all ' + queuesCount + ' queues ready.', typeof callback);

		}
	};

	var onAssertQueue = function(queue) {
		logger.info('onAssertQueue', queue.name);
		// bind to queue
		amqpClient.bindQueueToExchange(queue, amqpTopicExchange, onBindQueue);				
	};

	for (var i = 0; i < numOfQueues; i++) {
		var queueKey = amqpRoutingKeys[i];
		amqpClient.assertQueue(queueKey, 
			{
				durable: true
				, exclusive: false
				, autoDelete: false
			},
			onAssertQueue);
	}
};
