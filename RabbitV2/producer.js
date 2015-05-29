var amqp = require('amqp')
	, session = require('./sessionUtils').getInstance();

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

var conn         = amqp.createConnection(amqpOptions)
  , PUBLISH_RATE = 6000 //every 6 seconds
  , count        = 1;

var prefix = 'local_';
var mainExchangeKey = prefix + 'exchange';
var mainQueueKey = prefix + 'main_queue';

var mainExchange;
var amqpMainQueue;

conn.on('ready', function() {
	console.log('rabbit conn ready');

	conn.exchange(mainExchangeKey, {
		type: 'fanout',
		durable: true,
		autoDelete: false
	}, onAssertMainExchange);

});

var onAssertMainExchange = function(result) {
	console.log('onAssertMainExchange ready');
	mainExchange = result;
	conn.queue(mainQueueKey
		, {
			durable: true
			, exclusive: false
		}
		, onAssertMainQueue);
};

var onAssertMainQueue = function(result){
	console.log('onAssertMainQueue ready');
	amqpMainQueue = result;
	amqpMainQueue.bind(mainExchangeKey, mainQueueKey, onBindMainQueue);
};

var onBindMainQueue = function(){
	console.log('onBindMainQueue ready: start publishing');
	publishRoutine();
};

var publishRoutine = function(){
	console.log('publishRoutine');

	var sequence = 0;
	var sessionId = session.getNewSessionID();
		
	setInterval(function() {
		var payload = {
			sessionId: 		sessionId  
			, count: 		count++
			, sentAt: 		(new Date()).toString()
			, msg: 			{
				sequence:  sequence++
			}
		};
		var encodedPayload =  JSON.stringify(payload);
	
		var queueKey = mainQueueKey;
		console.log('publish ', {
			queueKey: queueKey,
			payload: encodedPayload
		});
		mainExchange.publish(queueKey, new Buffer(encodedPayload), {
			durable: true
		});

	}, PUBLISH_RATE);
};