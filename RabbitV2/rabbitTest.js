var amqp = require('amqp');

var amqpOptions = {
	host: 				'127.0.0.1'
	, port: 			5672
	, login:			'test'
	, password: 		'test'
	//, connectionTimeout: 4000
	//, ssl: { enabled: false }
	//, reconnect: false
	//, reconnectBackoffStrategy: 'linear'
	//, reconnectExponentialLimit: 120000
	//, reconnectBackoffTime: 4000
};

var conn = amqp.createConnection(amqpOptions);

var prefix = 'local_';
var mainExchangeKey = prefix + 'exchange';
var mainQueueKey = prefix + 'main_queue';
var mainExchange, mainQueue;

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
	mainQueue = result;
	mainQueue.bind(mainExchangeKey, mainQueueKey, onBindMainQueue);
};

var onBindMainQueue = function(){
	console.log('onBindMainQueue ready: start publishing');
	mainQueue.subscribe({
		ack: false
	},onConsumeMainQueue);

	publishRoutine();
};

var onConsumeMainQueue = function(msg, headers, deliveryInfo) {
	console.log('onConsumeMainQueue', {
		mainQueueKey: mainQueueKey
		, msg: msg
		, dateNow: (new Date())
	});
	//console.log('onConsumeMainQueue headers:', headers);
	//console.log('onConsumeMainQueue deliveryInfo:', deliveryInfo);
};

var publishRoutine = function(){

	var sequence = 0;

	setInterval(function() {
		var payload = {
			sessionId: 	'WESTDdev-WEST-devv-WEST-WESTDdevWEST'  
			, sentAt: 	(new Date()).toString()
			, msg: 		{
				sequence:  sequence++
			}
		};

		var encodedPayload =  JSON.stringify(payload);

		var queueKey = mainQueueKey;
		// console.log('publishRoutine payload:', {
		// 	queueKey: queueKey,
		// 	payload: encodedPayload
		// });

		//mainExchange.publish(queueKey, new Buffer(encodedPayload), {
		mainExchange.publish(queueKey, encodedPayload, {
			durable: true
		});
	}, 3000);
};