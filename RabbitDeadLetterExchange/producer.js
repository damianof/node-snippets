var amqp = require('amqp');

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

var conn         = amqp.createConnection()
  , PUBLISH_RATE = 3000 //every second
  , count        = 1;

var prefix = 'local1_';
var mainExchangeKey = prefix + 'exchange';
var deadletterExchangeKey = prefix + 'deadletter_exchange';
var mainQueueKey = prefix + 'main_queue';
var waitQueueKey = prefix + 'wait_queue';

var amqpDeadletterExchange;
var amqpWaitQueue;

conn.on('ready', function() {
	console.log('rabbit conn ready');

	conn.exchange(mainExchangeKey, {
		type: 'fanout',
		durable: true,
		autoDelete: false
	}, onAssertMainExchange);

});

var onAssertMainExchange = function(result){
	conn.exchange(deadletterExchangeKey, {
		type: 'fanout',
		durable: true,
		autoDelete: false
	}, onAssertDeadletterExchange);
};

var onAssertDeadletterExchange = function(result) {
	console.log('onAssertDeadletterExchange ready');
	amqpDeadletterExchange = result;
	conn.queue(waitQueueKey
		, {
			durable: true
			, exclusive: true
			, arguments: {
			 	"x-dead-letter-exchange": mainExchangeKey // exchange to which the message will be re-published
			 	, "x-message-ttl": 5000  // delay 5000 milliseconds
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
	console.log('onBindWaitQueue ready');
	publishRoutine();
};

var publishRoutine = function(){
	console.log('publishRoutine');

	setInterval(function() {
		var payload = {
			id: count++,
			sentAt: (new Date()).toString()
		};
		var encodedPayload =  JSON.stringify(payload);
	
		var queueKey = waitQueueKey;
		console.log('publish ', {
			queueKey: queueKey,
			payload: encodedPayload
		});
		amqpDeadletterExchange.publish(queueKey, encodedPayload, {
			contentType: 'application/json'
			, 'x-message-ttl': 5000
		});

	}, PUBLISH_RATE);
};