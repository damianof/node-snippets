var amqp = require('amqp')
	keyUtils = require('./keyUtils');

var amqpOptions = {
	connectionTimeout: 4000
	, ssl: { enabled: false }
	, reconnect: true
	, reconnectBackoffStrategy: 'linear'
	, reconnectExponentialLimit: 120000
	, reconnectBackoffTime: 4000 //rabbitConfig.connectRetryTimeout
};

// amqpOptions.host = rabbitConfig.rabbit.host;
// amqpOptions.port = rabbitConfig.rabbit.port;
// amqpOptions.login = rabbitConfig.rabbit.login;
// amqpOptions.password = rabbitConfig.rabbit.password;
amqpOptions.host = '127.0.0.1';
amqpOptions.port = 5672;
amqpOptions.login = 'test';
amqpOptions.password = 'test';

var conn = amqp.createConnection(amqpOptions);

var prefix = 'local_';
var mainExchangeKey = prefix + 'exchange';
var deadletterExchangeKey = prefix + 'deadletter_exchange';
var mainQueueKey = ''; //prefix + 'main_queue';
var waitQueueKey = prefix + 'wait_queue';
var jobQueueKeyPrefix = prefix + 'job_queue';
var deadletterTTL = 500;

var conf = {
	numJobQueues: 8
};

var amqpMainExchange
	, amqpMainQueue
	, amqpDeadletterExchange
	, amqpWaitQueue;

conn.on('error', function(err) {
	// Setting the rabbit connected flag to false since the connection terminated
	console.log('Error on connection with the RabbitMQ server. Error is ****', err);	
});
conn.on('ready', function() {
	console.log('rabbit conn ready');

	conn.exchange(mainExchangeKey, {
		type: 'fanout',
		durable: true,
		autoDelete: false
	}, onAssertMainExchange);

	// deadletter
	conn.exchange(deadletterExchangeKey, {
		type: 'fanout',
		durable: true,
		autoDelete: false
	}, onAssertDeadletterExchange);
});

var setupJobQueues = function(){
	console.log('setupJobQueues: conf.numJobQueues:', conf.numJobQueues);

	var onAssertJobQueue = function(result) {
		console.log('onAssertJobQueue: result:  Attaching to  -- ', result.name);
		return;
	};

	for (var i = 0; i < conf.numJobQueues; i++) {
		// The queue name is the combination of prefix (develop, stage or production),
		// 'job_queue' fixed string and the number of job queues.
		var jobQueueKey = jobQueueKeyPrefix + i;
		var assertJobQueue = conn.queue(jobQueueKey, options={
			durable: true,
			autoDelete: false
		}, onAssertJobQueue);
	}

};

var onAssertMainExchange = function(result) {
	console.log('onAssertMainExchange ready');
	amqpMainExchange = result;

	setupJobQueues();

	conn.queue(mainQueueKey
		, options={
			durable: true,
			exclusive: false,
			autoDelete: false
		}
		, onAssertMainQueue);
};
var onAssertMainQueue = function(result) {
	console.log('onAssertMainQueue ' + mainQueueKey);
	amqpMainQueue = result;
	amqpMainQueue.bind(mainExchangeKey, mainQueueKey, onBindMainQueue);
};
var onBindMainQueue = function(result) {
	console.log('onBindMainQueue ready', mainQueueKey);
	amqpMainQueue.subscribe(
		{
			ack: false
			//prefetchCount: 1
		},
		onConsumeMainQueue);
	//amqpMainQueue.subscribe({}, onConsumeMainQueue);
};


var onAssertDeadletterExchange = function(result) {
	console.log('onAssertDeadletterExchange', deadletterExchangeKey);
	amqpDeadletterExchange = result;
	conn.queue(waitQueueKey
		, {
			durable: true
			, exclusive: false
			, autoDelete: false
			, arguments: {
			 	"x-dead-letter-exchange": mainExchangeKey // exchange to which the message will be re-published
			 	, "x-message-ttl": deadletterTTL  // delay 5000 milliseconds
			 	////, "x-expires": 10000     // expire the whole queue after 10 seconds
			 	, "x-dead-letter-key": mainQueueKey // queue to which the message will be re-published
			}
		}
		, onAssertWaitQueue);
};
var onAssertWaitQueue = function(result){
	console.log('onAssertWaitQueue ready');
	amqpWaitQueue = result;
	amqpWaitQueue.bind(deadletterExchangeKey, waitQueueKey, onBindWaitQueue);
};
var onBindWaitQueue = function(){
	console.log('onBindWaitQueue ready', waitQueueKey);
	//publishRoutine();
};




var onConsumeMainQueue = function(msg, headers, deliveryInfo, amqpMessageObject) {
	//console.log('onConsumeMainQueue', msg);

	msg = msg.data 
	 	? JSON.parse(msg.data.toString('utf8')) 
	 	: null;
	//console.log('onConsumeMainQueue', msg);

	// console.log('onConsumeMainQueue', {
	// 	mainQueueKey: mainQueueKey
	// 	, msg: msg
	// 	, redelivered: deliveryInfo.redelivered
	// 	, dateNow: (new Date())
	// });
	//console.log('onConsumeMainQueue headers:', headers);
	//console.log('onConsumeMainQueue deliveryInfo:', deliveryInfo);

	if (!msg){
		throw new Error('msg is null');
	} else {
		var msgObj = msg;
		var messageId = (msgObj.sessionId || msgObj._id);
		var dbKey = 'c_' + messageId;
		var msgSequence = Number(msgObj.msg.sequence);
		var msgCurrentSeq = Number(msgObj.currentSeg) || 0;
		var msgIteration = Number(msgObj.iteration || 0);
		var calcSequence = msgCurrentSeq + msgIteration;
		var nextSequence = 0;

		var	queueIndex = keyUtils.getQueueIndex(messageId, conf.numJobQueues);
		var jobQueueKey = jobQueueKeyPrefix + queueIndex;
		
		var logData = {
			mainQueueKey: 		mainQueueKey
			, dateNow: 			(new Date())
			, jobQueueKey: 		jobQueueKey

			, message: 			msg
			, messageId: 		messageId
			, dbKey: 			dbKey
			, msgSequence: 		msgSequence
			, msgCurrentSeq: 	msgCurrentSeq
			, msgIteration: 	msgIteration
			, calcSequence: 	calcSequence
			, nextSequence: 	nextSequence
		};

		if (msgSequence === nextSequence
			|| calcSequence === msgSequence 
			|| (msgIteration > nextSequence && msgObj.msg.event === 'end')) {
			console.log('onConsumeMainQueue condition A: Send to job queue: [' + jobQueueKey + ']. Iteration is ', msgObj.iteration);

			conn.publish(jobQueueKey, new Buffer(JSON.stringify(msgObj)), {
				durable: true
			}, function(){
				console.log('publish callback');
				amqpMessageObject.acknowledge(false);
			});

			// if (msgObj.msg.event === 'init') {
			// 	//maybeAnswer(msg, dbKey, 0);
			// } else {
			// 	amqpMessageObject.acknowledge(false);
			// }

		} else if (msgSequence > nextSequence
			&& msgIteration <= msgSequence) {
			console.log('onConsumeMainQueue condition B: Send to WaitQueue: [' + waitQueueKey + ']');

			// If the message sequence received is greater than the exptected, 
			// or if the no of iterations is less than received sequence,
			// then the message needs to be put on wait_queue.
			if (!isNaN(msgObj.iteration) &&
				nextSequence === msgCurrentSeq) {
				msgObj.iteration += 1;
			} else {
				msgObj.iteration = 1;
			}
			msgObj.currentSeg = nextSequence;
			
			amqpDeadletterExchange.publish(waitQueueKey, new Buffer(JSON.stringify(msgObj)), {
				durable: true
			}, function(){
				console.log('deadletter publish callback');
				amqpMessageObject.acknowledge(false);
			});

		} else {
			console.log('onConsumeMainQueue condition C: ******* dropping --' + messageId + '-- from job queue [' + jobQueueKey + ']');

			amqpMessageObject.acknowledge(false);// use true if you want to acknowledge all previous messages of the queue
		}
	}
	
};















