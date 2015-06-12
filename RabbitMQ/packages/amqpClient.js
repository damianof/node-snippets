'use strict';

// get dependencis
var amqp = require('amqp')
	, amqpConfig;

// Export code to node.js using singleton pattern and revealing module pattern.
module.exports = (function(){
	var instance, amqpConnected, connection, logger, emitter
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
				, replyQueueKey: ''
				, deadletterExchangeKey: ''
				, waitQueueKey: ''
				, jobExchangeKey: ''
				, jobQueueKeyPrefix: ''
				, feederControlQueueKey: ''
				, feederControlReplyQueueKey: ''
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
			, feederControlQueue: undefined
			, feederControlReplyQueue: undefined
		};

	/**
		* @method setup
		* @param {Object} config
		* @description
		* Performs necessary setup and initialization.
		* Should be called only once.
	*/
	var setup = function(config) {

		try {
			logger.info('Queueing getInstance: setup');
			
			amqpConfig = config.amqpConfig;
			var prefix = amqpConfig.prefix;

			// create keys used for exchanges/queues etc
			keys.mainExchangeKey = prefix + 'exchange';
			keys.mainQueueKey = prefix + 'main_queue';
			keys.replyQueueKey = prefix + 'reply_queue';
			keys.deadletterExchangeKey = prefix + 'deadletter_exchange';
			keys.waitQueueKey = prefix + 'wait_queue';
			keys.jobExchangeKey = prefix + 'job_exchange';
			keys.jobQueueKeyPrefix = prefix + 'job_queue';
			
			keys.feederControlQueueKey = prefix + 'feeder_control';
			keys.feederControlReplyQueueKey = prefix + 'feeder_control_reply';
			

			// Setup amqp connection.
			var initing = false;
			var initConnection = function(){
				initing = true;
				
				var amqpOptions = {
					connectionTimeout: 4000
					, ssl: { enabled: false }
					, reconnect: true
					, reconnectBackoffStrategy: 'linear'
					, reconnectExponentialLimit: 120000
					, reconnectBackoffTime: amqpConfig.connectRetryTimeout
				};

				if (amqpConfig.useCluster){
					// use AMQP cluster
					amqpOptions.host = amqpConfig.cluster.endPoints.map(function(o){
						return o.proto + '://' + o.host + ':' + o.port;
					});
					amqpOptions.login = amqpConfig.cluster.login;
					amqpOptions.password = amqpConfig.cluster.password;
					logger.info('amqpClient: setup: Using AMQP [Cluster]', amqpOptions.hosts);
				} else {
					// use AMQP instance
					amqpOptions.host = amqpConfig.instance.host;
					amqpOptions.port = amqpConfig.instance.port;
					amqpOptions.login = amqpConfig.instance.login;
					amqpOptions.password = amqpConfig.instance.password;	
					logger.info('amqpClient: setup: Using AMQP Instance at ' + amqpConfig.instance.host + ':' + amqpConfig.instance.port + ' ---');
				}
				
				logger.info('amqpClient: setup: amqpOptions', JSON.stringify(amqpOptions));
				
				// connect
				connection = amqp.createConnection(amqpOptions);

				// AMQP on connection ready handler.
				connection.on('ready', function() {
					logger.info('amqpClient: setup: AMQP ready');
					amqpConnected = true;
					emitter.emit(eventNames.connected);
				});
	
				// AMQP on connection error handler.
				connection.on('error', function(err) {
					// Setting the amqp connected flag to false since the connection terminated
					amqpConnected = false;
					var errMsg = err && err.stack ? err.stack.split('\n') : err;
					logger.error('amqpClient: setup: AMQP ERROR', errMsg);	
					emitter.emit(eventNames.error, err);
				});
				
				initing = false;
			};

			// init connection
			initConnection();
			
		} catch (e) {
			logger.error('amqpClient: setup: EXCEPTION', e);
		}
	};
	
	var checkConnection = function(methodName){
		if (!amqpConnected){
			var e = new Error('amqpClient: ' + methodName + ': AMQP not connected');
			logger.error(e);
			throw e;
		}
	};
	
	/**
		* @method assertExchange
	*/
	var assertExchange = function(exchangeKey, exchangeOptions, callback) {
		logger.info('amqpClient: assertExchange [' + exchangeKey + ']', exchangeOptions);
		checkConnection('assertExchange');

		try {
			connection.exchange(exchangeKey
			 	, exchangeOptions
			 	, function(result) {
			 		emitter.emit(eventNames.assertExchange + '_' + exchangeKey, result);
			 		if (callback){
			 			logger.info('amqpClient: assertExchange [' + exchangeKey + ']');
			 			callback(result);
			 		}
			});
		} catch(e){
			logger.error('amqpClient: assertExchange [' + exchangeKey + '] ERROR', e);
			throw e;
		}
	};
	
	var assertQueue = function(queueKey, queueOptions, callback) {
		//logger.info('amqpClient: assertQueue [' + queueKey + ']', queueOptions);
		checkConnection('assertQueue');
		
		try {
			connection.queue(queueKey
				, queueOptions
				, function(result) {
					//logger.info('amqpClient: assertQueue [' + queueKey + ']');
					emitter.emit(eventNames.assertQueue + '_' + queueKey, result);
					if (callback){
						callback(result);
					}
				});
		} catch(e){
			logger.error('amqpClient: ERROR assertQueue [' + queueKey + '] ERROR', e);
			throw e;
		}
	};
	
	var bindQueueToExchange = function(queue, exchangeKey, callback) {
		//logger.info('amqpClient: bindQueueToExchange [' + queue.name + '] to exchange [' + exchangeKey + ']');
		checkConnection('bindQueue');
		
		try {
			queue.bind(exchangeKey
				, queue.name
				, function() {
					//logger.info('amqpClient: bindQueueToExchange [' + queue.name + '] to exchange [' + exchangeKey + ']');
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
			logger.error('amqpClient: ERROR bindQueueToExchange [' + queue.name + '] ERROR', e);
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
			var errMsg = 'amqpClient: publishToMainQueue: ' + callerName + ': main exchange or main queue are undefined.';
			errMsg += ' You first need to call initMainQueue and make sure the exchange and queue have been successfully instantiated before you can publish to it.';
			throw new Error(errMsg);
		}
		
		// Convert the payload to a JSON string using JSON.stringify.
		var encodedPayload = encodePayload(callerName, payload);
		
		// publish to main exchange/main queue
		exchanges.mainExchange.publish(queues.mainQueue.name, new Buffer(encodedPayload), {
			mandatory: true
			//, ack: true
			, deliveryMode: 2 // persistent
		}, function publishCallback(hasError){
			if (hasError){
				logger.error(callerName + ': mainExchange publish callback hasError:', hasError);
				// TODO: ANything else to do when there is an error?
			}
		});
	};

	var initMainQueue = function(callback){
		logger.info('amqpClient: initMainQueue [' + keys.mainQueueKey + '] on exchange [' + keys.mainExchangeKey + ']');
		checkConnection('initMainQueue');

		var onBindMainQueue = function(result) {
			logger.info('amqpClient: initMainQueue: onBindMainQueue [' + queues.mainQueue.name + '] ready');
			// return exchange and queue to callback
			if (callback){
				callback({
					mainExchange: exchanges.mainExchange,
					mainQueue: queues.mainQueue
				});
			}
		};

		var onAssertMainQueue = function(result) {
			logger.info('amqpClient: initMainQueue: onAssertMainQueue [' + result.name + '] ready');
			queues.mainQueue = result;
			// bind to queue
			bindQueueToExchange(queues.mainQueue, keys.mainExchangeKey, onBindMainQueue);
		};

		var onAssertMainExchange = function(result) {
			logger.info('amqpClient: initMainQueue: onAssertMainExchange [' + result.name + '] ready');
			exchanges.mainExchange = result;

			// assert queue
			assertQueue(keys.mainQueueKey
				, {
					durable: true
					, exclusive: false
					, autoDelete: false
					, confirm: true
				}
				, onAssertMainQueue);
		};

		// assert exchange
		assertExchange(keys.mainExchangeKey, {
			type: 'fanout'
			, durable: true
			, autoDelete: false
			, confirm: true
		}, onAssertMainExchange);
	};

	var initReplyQueue = function(callback){
		logger.info('amqpClient: initReplyQueue [' + keys.replyQueueKey + '] on exchange [' + keys.mainExchangeKey + ']');
		checkConnection('initReplyQueue');

		var onBindReplyQueue = function(result) {
			logger.info('amqpClient: initReplyQueue: onBindReplyQueue [' + queues.replyQueue.name + '] ready');
			// return exchange and queue to callback
			if (callback){
				callback({
					mainExchange: exchanges.mainExchange,
					replyQueue: queues.replyQueue
				});
			}
		};

		var onAssertReplyQueue = function(result) {
			logger.info('amqpClient: initReplyQueue: onAssertReplyQueue [' + result.name + '] ready');
			queues.replyQueue = result;
			// bind to queue
			bindQueueToExchange(queues.replyQueue, keys.mainExchangeKey, onBindReplyQueue);
		};

		var onAssertMainExchange = function(result) {
			logger.info('amqpClient: initReplyQueue: onAssertMainExchange [' + result.name + '] ready');
			exchanges.mainExchange = result;

			// assert queue
			assertQueue(keys.replyQueueKey
				, {
					durable: true
					, exclusive: false
					, autoDelete: false
					, confirm: true
				}
				, onAssertReplyQueue);
		};

		// assert exchange
		assertExchange(keys.mainExchangeKey, {
			type: 'fanout'
			, durable: true
			, autoDelete: false
			, confirm: true
		}, onAssertMainExchange);
	};

	var initWaitQueue = function(callback){
		logger.info('amqpClient: initWaitQueue [' + keys.waitQueueKey + '] on exchange [' + keys.deadletterExchangeKey + ']');
		checkConnection('initWaitQueue');

		var onBindWaitQueue = function(){
			logger.info('amqpClient: initWaitQueue: onBindWaitQueue [' + queues.waitQueue.name + '] ready');
			// return exchange and queue to callback
			if (callback){
				callback({
					deadletterExchange: exchanges.deadletterExchange,
					waitQueue: queues.waitQueue
				});
			}
		};

		var onAssertWaitQueue = function(result){
			logger.info('amqpClient: initWaitQueue: onAssertWaitQueue [' + result.name + ']: ready');
			queues.waitQueue = result;
			bindQueueToExchange(queues.waitQueue, keys.deadletterExchangeKey, onBindWaitQueue);
		};

		var onAssertDeadletterExchange = function(result) {
			logger.info('amqpClient: initWaitQueue: onAssertDeadletterExchange [' + result.name + ']');
			exchanges.deadletterExchange = result;
			
			if (!amqpConfig.deadletterTTL || isNaN(amqpConfig.deadletterTTL)){
				throw new Error('amqpClient: ERROR. Please add deadletterTTL value to amqpConfig section');
			}

			// assert queue
			assertQueue(keys.waitQueueKey
				, {
					durable: true
					, exclusive: false
					, autoDelete: false
					, arguments: {
					 	"x-dead-letter-exchange": keys.mainExchangeKey // exchange to which the message will be re-published
					 	, "x-message-ttl": amqpConfig.deadletterTTL  // message delay
					 	////, "x-expires": 10000     // expire the whole queue after 10 seconds
					 	, "x-dead-letter-key": keys.mainQueueKey // queue to which the message will be re-published
					}
				}
				, onAssertWaitQueue);
		};

		// assert exchange
		assertExchange(keys.deadletterExchangeKey, {
			type: 'fanout'
			, durable: true
			, autoDelete: false
			, confirm: true
		}, onAssertDeadletterExchange);
	};

	var initJobQueues = function(numJobQueues, callback){
		logger.info('amqpClient: initJobQueues on exchange [' + keys.jobExchangeKey + '] numJobQueues ' + numJobQueues);
		checkConnection('initJobQueues');

		var setupJobQueues = function(){
			logger.info('amqpClient: initJobQueues: numJobQueues:', numJobQueues);

			var queuesCount = 0;
			var onBindJobQueue = function (jobQueue){
				//logger.info('amqpClient: onBindJobQueue: result:', jobQueue.name);
				queuesCount++;

				if (queuesCount != numJobQueues){
					return;
				} else {
					// when all job queues are ready, callback
					logger.info('amqpClient: onBindJobQueue: all ' + queuesCount + ' job queues ready.', typeof callback);
					callback({
						jobExchange: exchanges.jobExchange
					});
				}
			};

			var onAssertJobQueue = function(jobQueue) {
				//logger.info('amqpClient: onAssertJobQueue:', jobQueue.name);
				queues.jobQueues.push(jobQueue);
				// bind to queue
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
			logger.info('amqpClient: initJobQueues: onAssertJobExchange [' + result.name + ']');
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
	};

	var consumeJobQueues = function(numJobQueues, jobQueuesConsumeCallback, callback){
		logger.info('amqpClient: consumeJobQueues on exchange [' + keys.jobExchangeKey + '] numJobQueues ' + numJobQueues);
		checkConnection('consumeJobQueues');

		var setupJobQueues = function(){
			logger.info('amqpClient: consumeJobQueues: numJobQueues:', numJobQueues);

			var queuesCount = 0;
			var onJobQueueReady = function (jobQueue){
				//logger.info('amqpClient: onJobQueueReady: result:', jobQueue.name);
				queuesCount++;

				// if a function to consume the job queue has been passed
				// subscribe to the queue with that
				if (typeof jobQueuesConsumeCallback == 'function'){
					// subscribe to queue
					logger.info('amqpClient: consumeJobQueues: onJobQueueReady: subscribe to:', jobQueue.name);
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
					logger.info('amqpClient: onJobQueueReady: all ' + queuesCount + ' job queues ready.', typeof callback);
					callback({
						jobExchange: exchanges.jobExchange
					});
				}
			};

			var onAssertJobQueue = function(jobQueue) {
				//logger.info('amqpClient: onAssertJobQueue:', jobQueue.name);
				queues.jobQueues.push(jobQueue);
				// bind to queue
				bindQueueToExchange(jobQueue, keys.jobExchangeKey, onJobQueueReady);				
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
			logger.info('amqpClient: initJobQueues: onAssertJobExchange [' + result.name + ']');
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
	};
	
	var initFeederControlQueue = function(callback){
		logger.info('amqpClient: initFeederControlQueue [' + keys.feederControlQueueKey + '] on exchange [' + keys.mainExchangeKey + ']');
		checkConnection('initFeederControlQueue');

		var onBindFeederControlQueue = function(result) {
			logger.info('amqpClient: initFeederControlQueue: onBindFeederControlQueue [' + queues.feederControlQueue.name + '] ready');
			// return exchange and queue to callback
			if (callback){
				callback({
					mainExchange: exchanges.mainExchange,
					feederControlQueue: queues.feederControlQueue
				});
			}
		};

		var onAssertFeederControlQueue = function(result) {
			logger.info('amqpClient: initFeederControlQueue: onAssertFeederControlQueue [' + result.name + '] ready');
			queues.feederControlQueue = result;
			// bind to queue
			bindQueueToExchange(queues.feederControlQueue, keys.mainExchangeKey, onBindFeederControlQueue);
		};

		var onAssertMainExchange = function(result) {
			logger.info('amqpClient: initFeederControlQueue: onAssertMainExchange [' + result.name + '] ready');
			exchanges.mainExchange = result;

			// assert queue
			assertQueue(keys.feederControlQueueKey
				, {
					durable: true
					, exclusive: false
					, autoDelete: false
					, confirm: true
				}
				, onAssertFeederControlQueue);
		};

		// assert exchange
		assertExchange(keys.mainExchangeKey, {
			type: 'fanout'
			, durable: true
			, autoDelete: false
			, confirm: true
		}, onAssertMainExchange);
	};
	
	var initFeederControlReplyQueue = function(callback){
		logger.info('amqpClient: initFeederControlReplyQueue [' + keys.feederControlReplyQueueKey + '] on exchange [' + keys.mainExchangeKey + ']');
		checkConnection('initFeederControlReplyQueue');

		var onBindFeederControlReplyQueue = function(result) {
			logger.info('amqpClient: initFeederControlReplyQueue: onBindFeederControlReplyQueue [' + queues.feederControlReplyQueue.name + '] ready');
			// return exchange and queue to callback
			if (callback){
				callback({
					mainExchange: exchanges.mainExchange,
					feederControlReplyQueue: queues.feederControlReplyQueue
				});
			}
		};

		var onAssertFeederControlReplyQueue = function(result) {
			logger.info('amqpClient: initFeederControlReplyQueue: onAssertFeederControlReplyQueue [' + result.name + '] ready');
			queues.feederControlReplyQueue = result;
			// bind to queue
			bindQueueToExchange(queues.feederControlReplyQueue, keys.mainExchangeKey, onBindFeederControlReplyQueue);
		};

		var onAssertMainExchange = function(result) {
			logger.info('amqpClient: initFeederControlReplyQueue: onAssertMainExchange [' + result.name + '] ready');
			exchanges.mainExchange = result;

			// assert queue
			assertQueue(keys.feederControlReplyQueueKey
				, {
					durable: true
					, exclusive: false
					, autoDelete: false
					, confirm: true
				}
				, onAssertFeederControlReplyQueue);
		};

		// assert exchange
		assertExchange(keys.mainExchangeKey, {
			type: 'fanout'
			, durable: true
			, autoDelete: false
			, confirm: true
		}, onAssertMainExchange);
	};

	/**
		* @method getInstance
		* @param {Object} config  the configuration object
		* @param {loggingClient} loggerClient  an instance of the logger
		* @description
		* Init the singleton exposed to consuming code.
	*/
	var getInstance = function(config, loggerClient){
		if (!instance) {
			var e;
			if (!config){
				e = new Error('amqpClient: getInstance requires an instance of config');
				throw e;
			}
			if (!loggerClient){
				e = new Error('amqpClient: getInstance requires an instance of loggerClient');
				throw e;
			}

			logger = loggerClient;
			
			var EventEmitter = require('events').EventEmitter;
			emitter = new EventEmitter();
			emitter.setMaxListeners(1024);

			setup(config, logger);

			// init singletone instance that will expose publish function
			instance = {
				assertExchange:	assertExchange,
				assertQueue: 	assertQueue,
				bindQueueToExchange: 		bindQueueToExchange,
				keys: 			keys,
				eventNames: 	eventNames,
				emitter:		emitter,
				initMainQueue: 	initMainQueue,
				initReplyQueue: initReplyQueue,
				initWaitQueue: 	initWaitQueue,
				initJobQueues:  initJobQueues,
				consumeJobQueues: 	consumeJobQueues,
				publishToMainQueue: 	publishToMainQueue,
				initFeederControlQueue: initFeederControlQueue,
				initFeederControlReplyQueue: initFeederControlReplyQueue
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
