/*global process, require*/

var conf = require('./config/config');
var logger = require('./packages/logger');
var amqpClient = require('./packages/amqpClient.js').getInstance(conf, logger);
var keyUtils = require('./packages/keyUtils');
//console.log('conf', conf);

conf.numJobQueues = conf.defaults.numJobQueues;
logger.silly('--- BALANCER ---');

var amqpJobExchange, amqpMainQueue;

// Handle for amqpClient error event
var onAmqpClientError = function(err) {
	logger.error('Error on connection with the RabbitMQ server. Error is ****', err);	
};

// handler for amqpClient connected event
var onAmqpClientConnected = function() {
	logger.cyan('onAmqpClientConnected');

	// on amqpClient connected,
	// initialize job queues
	amqpClient.initJobQueues(conf.numJobQueues, onInitJobQueuesReady);
};

// start listening to amqpClient events
amqpClient.emitter.on(amqpClient.eventNames.error, onAmqpClientError);
amqpClient.emitter.on(amqpClient.eventNames.connected, onAmqpClientConnected);

// callback called by amqpClient once all the job queues are ready
var onInitJobQueuesReady = function(result){
	logger.cyan('onInitJobQueuesReady ready', result.jobExchange.name);
	amqpJobExchange = result.jobExchange;

	// init main queue
	amqpClient.initMainQueue(onInitMainQueueReady);
};

// callback called by amqpCLient once the main queue is ready
var onInitMainQueueReady = function(result){
	logger.cyan('onInitMainQueueReady ready: start consuming from', result.mainQueue.name);
	amqpMainQueue = result.mainQueue;

	// subscribe to main queue
	amqpMainQueue.subscribe({
			//ack: true,
			prefetchCount: 5000
		},
		onConsumeMainQueue);
};

// helper functions:
function getRandomIntFromMax(max) {
    return Math.floor((Math.random() * max) + 1);
}
var getRandomJobQueueKey = function(){
	var n = Number(conf.numJobQueues);
	var r = getRandomIntFromMax(n);
	return amqpClient.keys.jobQueueKeyPrefix + r;
};

// handler for queue subscribe. It will consume the queue messages as they come through.
var onConsumeMainQueue = function(msg, headers, deliveryInfo, amqpMessageObject) {
	//	console.log('onConsumeMainQueue');

	// convert message to string
	var message = msg.data 
	 	? msg.data.toString('utf8') 
	 	: null;
	
	if (!message){
		throw new Error('message is null');
	}
	//console.log('onConsumeMainQueue', message);

	// aknowledge message
	//amqpMessageObject.acknowledge(false);

	// get random job queue
	var msgObj = JSON.parse(message);
	var jobQueueKey = getRandomJobQueueKey();

	// publish to job queue
	amqpJobExchange.publish(jobQueueKey, new Buffer(JSON.stringify(msgObj)), {
			mandatory: true
			, ack: true
			, deliveryMode: 2 // persistent
	}, function publishCallback(hasError){
		// if (hasError){
		// 	logger.error('--- amqpJobExchange publish callback hasError:', hasError);
		// }
		//logger.info('onConsumeMainQueue: sent to job queue [' + jobQueueKey + ']', message);
	});
};

