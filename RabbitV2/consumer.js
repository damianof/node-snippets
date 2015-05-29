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

var conn = amqp.createConnection(amqpOptions);

var prefix = 'local1_';
var mainExchangeKey = prefix + 'exchange';
var mainQueueKey = prefix + 'main_queue';
var waitQueueKey = prefix + 'wait_queue';

var amqpMainExchange;

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
});

var onAssertMainExchange = function(result) {
	console.log('onAssertMainExchange ready');
	amqpMainExchange = result;
	conn.queue(mainQueueKey
		, options={
			durable: true,
			exclusive: true
		}
		, onAssertMainQueue);
};

var onAssertMainQueue = function(result) {
	console.log('onAssertMainQueue ' + mainQueueKey);
	amqpMainQueue = result;
	amqpMainQueue.bind(mainExchangeKey, mainQueueKey, onBindMainQueue);
};

var onBindMainQueue = function(result) {
	console.log('onBindMainQueue ' + mainQueueKey);
	// amqpMainQueue.subscribe({
	// 		ack: true, 
	// 		prefetchCount: 1
	// 	},
	// 	onConsumeMainQueue);
	amqpMainQueue.subscribe({},
		onConsumeMainQueue);
};

var onConsumeMainQueue = function(msg, headers, deliveryInfo) {
	console.log('onConsumeMainQueue', {
		mainQueueKey: mainQueueKey
		, msg: msg
		, redelivered: deliveryInfo.redelivered
		, dateNow: (new Date())
	});
	//console.log('onConsumeMainQueue headers:', headers);
	//console.log('onConsumeMainQueue deliveryInfo:', deliveryInfo);
};

