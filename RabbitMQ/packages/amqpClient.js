'use strict';

// get dependencis
var amqp = require('amqp')
	, rabbitConfig;

// Export code to node.js using singleton pattern and revealing module pattern.
module.exports = (function(){
	var instance, rabbitConnected, connection, logger, emitter
		, eventNames = {
				connected: 'queueing-connected'
				, error: 'queueing-error'
				, assertExchange: 'queueing-assertExchange'
				, assertQueue: 'queueing-assertQueue'
				, bindQueue: 'queueing-bindQueue'
			}
		, keys = {
				mainExchangeKey: ''
				, mainQueueKey: ''
				, deadletterExchangeKey: ''
				, waitQueueKey: ''
				, jobExchangeKey: ''
				, jobQueueKeyPrefix: ''
			}
		, exchanges = {
			mainExchange: undefined
			, deadletterExchange: undefined
			, jobExchange: undefined
		}
		, queues = {
			mainQueue: undefined
			, waitQueue: undefined
			, jobQueues: []
		};

	/**
		* @method setupRabbitMQ
		* @param {Object} config  configuration about database
		*   and queueing service (redis and rabbitmq in our case)
		* @description
		* Performs necessary setup and initialization.
		* Should be called only once.
	*/
	var setupRabbitMQ = function(config) {

		try {
			logger.info('Queueing getInstance: setupRabbitMQ');
			
			rabbitConfig = config.rabbitConfig;
			var prefix = rabbitConfig.prefix;

			// create keys used for exchanges/queues etc
			keys.mainExchangeKey = prefix + 'exchange';
			keys.mainQueueKey = prefix + 'main_queue';
			keys.deadletterExchangeKey = prefix + 'deadletter_exchange';
			keys.waitQueueKey = prefix + 'wait_queue';
			keys.jobExchangeKey = prefix + 'job_exchange';
			keys.jobQueueKeyPrefix = prefix + 'job_queue';

			// Setup rabbit connection.
			var initing = false;
			var initConnection = function(){
				initing = true;
				
				var amqpOptions = {
					connectionTimeout: 4000
					, ssl: { enabled: false }
					, reconnect: true
					, reconnectBackoffStrategy: 'linear'
					, reconnectExponentialLimit: 120000
					, reconnectBackoffTime: rabbitConfig.connectRetryTimeout
				};

				if (rabbitConfig.useCluster){
					// use RabbitMQ cluster
					amqpOptions.host = rabbitConfig.rabbitCluster.endPoints.map(function(o){
						return o.proto + '://' + o.host + ':' + o.port;
					});
					amqpOptions.login = rabbitConfig.rabbitCluster.login;
					amqpOptions.password = rabbitConfig.rabbitCluster.password;
					logger.info('--- Using RabbitMQ [Cluster] ---', amqpOptions.hosts);
				} else {
					// use RabbitMQ instance
					amqpOptions.host = rabbitConfig.rabbit.host;
					amqpOptions.port = rabbitConfig.rabbit.port;
					amqpOptions.login = rabbitConfig.rabbit.login;
					amqpOptions.password = rabbitConfig.rabbit.password;	
					logger.info('--- Using RabbitMQ Instance at ' + rabbitConfig.rabbit.host + ':' + rabbitConfig.rabbit.port + ' ---');
				}
				
				logger.info('--- NMAPI-Queueing: setupRabbitMQ: amqpOptions', JSON.stringify(amqpOptions));
				
				// connect
				connection = amqp.createConnection(amqpOptions);

				// RabbitMQ on connection ready handler.
				connection.on('ready', function() {
					logger.info('--- Connection with the RabbitMQ server established ---');
					rabbitConnected = true;
					emitter.emit(eventNames.connected);
				});
	
				// RabbitMQ on connection error handler.
				connection.on('error', function(err) {
					// Setting the rabbit connected flag to false since the connection terminated
					rabbitConnected = false;
					logger.error('--- Error on connection with the RabbitMQ server. Error is ****', err);	
					emitter.emit(eventNames.error, err);
				});
				
				initing = false;
			};

			// init connection
			initConnection();
			
		} catch (e) {
			logger.error('RabbitMQ connection failure', e);
		}
	};
	
	var checkConnection = function(methodName){
		if (!rabbitConnected){
			var e = new Error('NMAPI-Queueing: ' + methodName + ': RabbitMQ not connected');
			logger.error(e);
			throw e;
		}
	};
	
	/**
		* @method assertExchange
	*/
	var assertExchange = function(exchangeKey, exchangeOptions, callback) {
		logger.info('MAPI-Queueing: assertExchange [' + exchangeKey + ']', exchangeOptions);
		checkConnection('assertExchange');

		try {
			connection.exchange(exchangeKey
			 	, exchangeOptions
			 	, function(result) {
			 		emitter.emit(eventNames.assertExchange + '_' + exchangeKey, result);
			 		if (callback){
			 			logger.info('NMAPI-Queueing: assertExchange [' + exchangeKey + ']');
			 			callback(result);
			 		}
			});
		} catch(e){
			logger.error('NMAPI-Queueing: assertExchange [' + exchangeKey + '] ERROR', e);
			throw e;
		}
	};
	
	var assertQueue = function(queueKey, queueOptions, callback) {
		//logger.info('MAPI-Queueing: assertQueue [' + queueKey + ']', queueOptions);
		checkConnection('assertQueue');
		
		try {
			connection.queue(queueKey
				, queueOptions
				, function(result) {
					//logger.info('NMAPI-Queueing: assertQueue [' + queueKey + ']');
					emitter.emit(eventNames.assertQueue + '_' + queueKey, result);
					if (callback){
						callback(result);
					}
				});
		} catch(e){
			logger.error('NMAPI-Queueing: ERROR assertQueue [' + queueKey + '] ERROR', e);
			throw e;
		}
	};
	
	var bindQueueToExchange = function(queue, exchangeKey, callback) {
		//logger.info('NMAPI-Queueing: bindQueueToExchange [' + queue.name + '] to exchange [' + exchangeKey + ']');
		checkConnection('bindQueue');
		
		try {
			queue.bind(exchangeKey
				, queue.name
				, function() {
					//logger.info('NMAPI-Queueing: bindQueueToExchange [' + queue.name + '] to exchange [' + exchangeKey + ']');
					emitter.emit(eventNames.bindQueue + '_' + queue.name + '_' + exchangeKey);
				})

				queue.on('queueBindOk', function(){
					//logger.info('queueBindOk for queue: ' + queue.name);
					//queue.bind will emit 'queueBindOk' when complete
					if (callback){
						callback(queue);
					}
				});
		} catch(e){
			logger.error('NMAPI-Queueing: ERROR bindQueueToExchange [' + queue.name + '] ERROR', e);
			throw e;
		}
	};
	
	/**
	* @method encodePayload
	* @description
	* Helper to convert a javascript object to JSON and catch any errors.
	*/
	var encodePayload = function(callerName, payload){
		// Convert the payload to a JSON string using JSON.stringify.
		try {
			// return encoded payload
			return JSON.stringify(payload);
		} catch (e) {
			var errMsg = callerName + ': converting payload to json unsuccessful';
			logger.error(errMsg, e);
			throw e;
		}
	};
	
	var publishToMainQueue = function(callerName, payload){
		checkConnection('initMainQueue');
		
		if (!exchanges.mainExchange || !queues.mainQueue){
			var errMsg = 'NMAPI-Queueing: publishToMainQueue: ' + callerName + ': main exchange or main queue are undefined.';
			errMsg += ' You first need to call initMainQueue and make sure the exchange and queue have been successfully instantiated before you can publish to it.';
			throw new Error(errMsg);
		}
		
		// Convert the payload to a JSON string using JSON.stringify.
		var encodedPayload = encodePayload(callerName, payload);
		
		// publish to main exchange/main queue
		exchanges.mainExchange.publish(queues.mainQueue.name, new Buffer(encodedPayload), {
			mandatory: true
			, ack: true
			, deliveryMode: 2 // persistent
		}, function publishCallback(hasError){
			if (hasError){
				logger.error(callerName + ': mainExchange publish callback hasError:', hasError);
				// TODO: ANything else to do when there is an error?
			}
		});
	};

	var initMainQueue = function(callback){
		logger.info('MAPI-Queueing: initMainQueue [' + keys.mainQueueKey + '] on exchange [' + keys.mainExchangeKey + ']');
		checkConnection('initMainQueue');

		if (!exchanges.mainExchange && !queues.mainQueue){

			var onBindMainQueue = function(result) {
				logger.info('MAPI-Queueing: initMainQueue: onBindMainQueue [' + queues.mainQueue.name + '] ready');
				// return exchange and queue to callback
				if (callback){
					callback({
						mainExchange: exchanges.mainExchange,
						mainQueue: queues.mainQueue
					});
				}
			};

			var onAssertMainQueue = function(result) {
				logger.info('MAPI-Queueing: initMainQueue: onAssertMainQueue [' + result.name + '] ready');
				queues.mainQueue = result;
				// bind to main queue
				bindQueueToExchange(queues.mainQueue, keys.mainExchangeKey, onBindMainQueue);
			};

			var onAssertMainExchange = function(result) {
				logger.info('MAPI-Queueing: initMainQueue: onAssertMainExchange [' + result.name + '] ready');
				exchanges.mainExchange = result;

				// assert main queue
				assertQueue(keys.mainQueueKey
					, {
						durable: true
						, exclusive: false
						, autoDelete: false
						, confirm: true
					}
					, onAssertMainQueue);
			};

			// assert main exchange
			assertExchange(keys.mainExchangeKey, {
				type: 'fanout'
				, durable: true
				, autoDelete: false
				, confirm: true
			}, onAssertMainExchange);
		} else {
			logger.info('--- initMainQueue [' + keys.mainQueueKey + '] exists ---');
			callback(queues.mainQueue);
		}
	};

	var initWaitQueue = function(callback){
		logger.info('MAPI-Queueing: initWaitQueue [' + keys.waitQueueKey + '] on exchange [' + keys.deadletterExchangeKey + ']');
		checkConnection('initWaitQueue');

		if (!exchanges.deadletterExchange && !queues.waitQueue){

			var onBindWaitQueue = function(){
				logger.info('MAPI-Queueing: initWaitQueue: onBindWaitQueue [' + queues.waitQueue.name + '] ready');
				// return exchange and queue to callback
				if (callback){
					callback({
						deadletterExchange: exchanges.deadletterExchange,
						waitQueue: queues.waitQueue
					});
				}
			};

			var onAssertWaitQueue = function(result){
				logger.info('MAPI-Queueing: initWaitQueue: onAssertWaitQueue [' + result.name + ']: ready');
				queues.waitQueue = result;
				bindQueueToExchange(queues.waitQueue, keys.deadletterExchangeKey, onBindWaitQueue);
			};

			var onAssertDeadletterExchange = function(result) {
				logger.info('MAPI-Queueing: initWaitQueue: onAssertDeadletterExchange [' + result.name + ']');
				exchanges.deadletterExchange = result;
				
				if (!rabbitConfig.deadletterTTL || isNaN(rabbitConfig.deadletterTTL)){
					throw new Error('NMAPI-Queueing: ERROR. Please add deadletterTTL value to rabbitConfig section');
				}

				// assert wait queue
				assertQueue(keys.waitQueueKey
					, {
						durable: true
						, exclusive: false
						, autoDelete: false
						, arguments: {
						 	"x-dead-letter-exchange": keys.mainExchangeKey // exchange to which the message will be re-published
						 	, "x-message-ttl": rabbitConfig.deadletterTTL  // message delay
						 	////, "x-expires": 10000     // expire the whole queue after 10 seconds
						 	, "x-dead-letter-key": keys.mainQueueKey // queue to which the message will be re-published
						}
					}
					, onAssertWaitQueue);
			};

			// assert deadletter exchange
			assertExchange(keys.deadletterExchangeKey, {
				type: 'fanout'
				, durable: true
				, autoDelete: false
				, confirm: true
			}, onAssertDeadletterExchange);
		}
	};

	var initJobQueues = function(numJobQueues, jobQueuesConsumeCallback, callback){
		logger.info('MAPI-Queueing: initJobQueues on exchange [' + keys.jobExchangeKey + '] numJobQueues ' + numJobQueues);
		checkConnection('initJobQueues');

		if (!exchanges.jobExchange){

			var setupJobQueues = function(){
				logger.info('MAPI-Queueing: initJobQueues: numJobQueues:', numJobQueues);

				var queuesCount = 0;
				var onBindJobQueue = function (jobQueue){
					//logger.info('MAPI-Queueing: onBindJobQueue: result:', jobQueue.name);
					queuesCount++;

					// if a function to consume the job queue has been passed
					// subscribe to the queue with that
					if (jobQueuesConsumeCallback){
						// subscribe to main queue
						//logger.info('MAPI-Queueing: onBindJobQueue: subscribe to: ', jobQueue.name);
						jobQueue.subscribe({
								ack: true
								, prefetchCount: 1
							},
							jobQueuesConsumeCallback);
					}

					if (queuesCount != numJobQueues){
						return;
					} else {
						// when all job queues are ready, callback
						logger.info('MAPI-Queueing: onBindJobQueue: all ' + queuesCount + ' job queues ready.', typeof callback);
						callback({
							jobExchange: exchanges.jobExchange
						});
					}
				};

				var onAssertJobQueue = function(jobQueue) {
					//logger.info('MAPI-Queueing: onAssertJobQueue:', jobQueue.name);
					queues.jobQueues.push(jobQueue);
					// bind to main queue
					bindQueueToExchange(jobQueue, keys.jobExchangeKey, onBindJobQueue);				
				};

				for (var i = 0; i < numJobQueues; i++) {
					// The queue name is the combination of prefix (develop, stage or production),
					// 'job_queue' fixed string and the number of job queues.
					var jobQueueKey = keys.jobQueueKeyPrefix + i;
					assertQueue(jobQueueKey, 
						{
							durable: true
							, exclusive: false
							, autoDelete: false
						},
						onAssertJobQueue);
				}
			};

			var onAssertJobExchange = function(result) {
				logger.info('MAPI-Queueing: initJobQueues: onAssertJobExchange [' + result.name + ']');
				exchanges.jobExchange = result;
				setupJobQueues();
			};

			// assert job exchange
			assertExchange(keys.jobExchangeKey, {
				type: 'topic'
				, durable: true
				, autoDelete: false
				, confirm: true
			}, onAssertJobExchange);
		}
	};

	/**
		* @method getInstance
		* @param {Object} config  the configuration object
		* @param {NMAPI-Logging} loggerClient  an instance of the logger
		* @description
		* Init the singleton exposed to consuming code.
	*/
	var getInstance = function(config, loggerClient){
		if (!instance) {
			var e;
			if (!config){
				e = new Error('Queueing getInstance requires an instance of config');
				throw e;
			}
			if (!loggerClient){
				e = new Error('Queueing getInstance requires an instance of loggerClient');
				throw e;
			}

			logger = loggerClient;
			
			var EventEmitter = require('events').EventEmitter;
			emitter = new EventEmitter();
			emitter.setMaxListeners(1024);

			setupRabbitMQ(config, logger);

			// init singletone instance that will expose publish function
			instance = {
				assertExchange:	assertExchange,
				assertQueue: 	assertQueue,
				bindQueueToExchange: 		bindQueueToExchange,
				keys: 			keys,
				eventNames: 	eventNames,
				emitter:		emitter,
				initMainQueue: 	initMainQueue,
				initWaitQueue: 	initWaitQueue,
				initJobQueues:  initJobQueues,
				publishToMainQueue: 	publishToMainQueue
			};
		}

		return instance;
	};

	// Using the revealing module pattern, we expose only the geInstance
	// while keeping the 'var instance' private.
	return {
		getInstance: getInstance
	};
}());
