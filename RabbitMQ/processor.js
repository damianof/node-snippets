/*global process, require*/

var conf = require('./config/config');
var logger = require('./packages/logger');
var amqpClient = require('./packages/amqpClient.js').getInstance(conf, logger);
//console.log('conf', conf);

conf.numJobQueues = conf.defaults.numJobQueues;
logger.silly('--- PROCESSOR ---');

var amqpJobExchange, amqpDeadletterExchange, amqpWaitQueueKey;


// Handle for amqpClient error event
var onAmqpClientError = function(err) {
	logger.error('Error on connection with the RabbitMQ server. Error is ****', err);	
};

// handler for amqpClient connected event
var onAmqpClientConnected = function() {
	logger.cyan('onAmqpClientConnected');

	// on amqpClient connected,
	// initialize wait queue
	amqpClient.initWaitQueue(onInitWaitQueueReady);
};

// start listening to amqpClient events
amqpClient.emitter.on(amqpClient.eventNames.error, onAmqpClientError);
amqpClient.emitter.on(amqpClient.eventNames.connected, onAmqpClientConnected);

// callback called by amqpCLient once the wait queue is ready
var onInitWaitQueueReady = function(result){
	logger.cyan('onInitWaitQueueReady ready', result.waitQueue.name);
	amqpDeadletterExchange = result.deadletterExchange;
	amqpWaitQueueKey = result.waitQueue.name;

	//logger.warn('amqpDeadletterExchange typeof', typeof amqpDeadletterExchange);

	if (amqpDeadletterExchange == undefined){
		var errMsg = 'onInitWaitQueueReady: amqpDeadletterExchange is undefined';
		logger.error(errMsg);
		throw new Error(errMsg);
	}

	amqpClient.consumeJobQueues(conf.numJobQueues, onConsumeJobQueues, onJobQueuesReady);
};

// callback called by amqpClient once all the job queues are ready
var onJobQueuesReady = function(result){
	logger.cyan('onJobQueuesReady');
	amqpJobExchange = result.jobExchange;

	if (amqpJobExchange == undefined){
		var errMsg = 'onJobQueuesReady: amqpJobExchange is undefined';
		logger.error(errMsg);
		throw new Error(errMsg);
	}
};


// handler for queue subscribe. It will consume the queue messages as they come through.
var onConsumeJobQueues = function(msg, headers, deliveryInfo, amqpMessageObject) {
	var msgStr = msg.data 
	 	? msg.data.toString('utf8') 
	 	: null;
	
	if (!msgStr){
		logger.error('onConsumeMainQueue ERROR: message is null', msg.data);
		throw new Error('message is null');
	} else {
		logger.info('onConsumeMainQueue msgStr', msgStr);

		var msgObj = JSON.parse(msgStr);
		// dont delete this, we might use routingKey for other logic
		//var jobQueueKey = amqpMessageObject.routingKey; // message routing key

		// randomly either pseudo-process message by just aknowledging it
		// or sent back to dead letter excahnge
		if (Math.random() > 0.5){
			// pseudo-process message (just ackn for now)
			amqpMessageObject.acknowledge(false);
		}
		else {
			// send to dead letter exchange
			msgObj.DEADLETTER_ROUTED = true;

			amqpDeadletterExchange.publish(amqpWaitQueueKey, new Buffer(JSON.stringify(msgObj)), {
				durable: true
			}, function(hasError){
				if (hasError){
					logger.error('-------- deadletter publish callback -------- hasError:', hasError);
				}
				amqpMessageObject.acknowledge(false);
			});
		}
	}
};

