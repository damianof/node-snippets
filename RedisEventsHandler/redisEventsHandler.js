/**
	* @module redisEventsHandler
	* @description
	* This files provides a wrapper to RedisNotifier.<br/>
	* Listens to message expired events from redis and publish to AMQP main queue.
	* It provides encapsulation and follows the singleton pattern.<br/>
	* NOTE: Has dependencies on AMQP Client and Database.<br/>
*/
'use strict';

// get dependencies
var time = require('time')
	, RedisNotifier = require('./redisEventNotifier');

// private variables
var instance, db, logger, amqp, nodeID, END_SESSION_TIMEOUT_DELETION_SEC;


/**
	* @method setup
	* @param {Object} dbConfig  the dbConfig object
	* @description
	* Internal function used to performs necessary setup of the eventNotifier.<br/>
	* Requires an instance of amqpClient client<br/>
	* Should be called only once.<br/>
*/
var setup = function(dbConfig) {
	try {

		// Setup Redis event notifier
		var redisEventNotifier = new RedisNotifier(logger, {
			  dbConfig: dbConfig
			, db: 		dbConfig.redis.sessionDB
			, expired: 	true
		});

		// Redis Event notifier error handler.
		redisEventNotifier.subscriber.on('error', function(err) {
			logger.error('redisEventsHandler: Event notifier failed connecting. The error is' + err);
		});

		//listen to message event
		redisEventNotifier.on('message', onMessage);

		// assign eventNotifier to private variable instance
		instance = redisEventNotifier;

	} catch (e) {
		logger.error('redisEventsHandler: Redis notifier connection failure', e);
	}
};

var onMessage = function(pattern, channelPattern, emittedKey) {
	emittedKey = emittedKey.toString('utf8');

	logger.warn('----------------- redisEventsHandler: onMessage ------------- emittedKey', emittedKey);
	
	var channel = this.parseMessageChannel(channelPattern);

	switch (channel.key) {

		case 'expired': {

			var pqKey = emittedKey + 'pq';

			db.get(pqKey, function(err, result) {
	
				// handle error
				if (err){
					logger.error('redisEventsHandler: failed on case expired. The error is' + err);
				}

				if (result) {
		
						db.del(pqKey, function(err1, results) {
						
						if (results != 1){
							return;
						}
						
						var stateData = {
							'state': 2
						};
						
						logger.info('redisEventsHandler: Key has now been expired and End Session to processing. The session ID is ' + emittedKey);

						db.set(emittedKey, stateData, function(err,reply){
							db.expire(emittedKey, END_SESSION_TIMEOUT_DELETION_SEC);
						});

						// Set the expire for 2 hours. After 2 hours this would be finally deleted and there would be no End Session this time

						// Publish an end session message to processing using amqp mechanism.
						var dataToPublish = {
							'sessionId': emittedKey,
							'timestamp': time.time(),
							'msg': {
								'event': 'end',
								'sequence': ((parseInt(result.pq) + 1).toString())
							}
						};

						try {
							// publish to main queue
							amqp.publishToMainQueue('redisEventsHandler', dataToPublish);
							
						} catch (e) {
							logger.error('redisEventsHandler: Error sending session timeout to RabbitMQ Exchange ' + e);
						}

						// log information
						logger.warn({
							'ServoID': nodeID,
							'Module': 'Collection',
							'SessionID': emittedKey,
							'LogTimestamp': time.time(),
							'APITimestamp': time.time(),
							'Sequence': ((parseInt(result.pq) + 1).toString()),
							'Event': 'end',
							'Data': ''
						});
					});
				} else {
					logger.info('redisEventsHandler: Key has now been expired.Dont Send End Session to processing.Its already done when session was expired. The session ID is ' + emittedKey);
				}
			});
			break;
		}
		default: {
			logger.debug('redisEventsHandler: Unrecognized Channel Type:' + channel.type);
		}
	}
};

/**
	* @method init
	* @param {Object} config  the configuration object
	* @param {Logging} loggerClient  an instance of the logger
	* @param {Database} dbClient  an instance of the db client
	* @param {Queueing} amqpClient  an instance of AMQP client
	* @description
	* Init the singleton exposed to consuming code.
*/
var init = function (config, loggerClient, dbClient, amqpClient) {
	if (!instance) {
		var e;
		if (!config || !config.dbConfig){
			e = new Error('redisEventsHandler: init requires an instance of config and config.dbConfig');
			throw e;
		}

		if (!loggerClient){
			e = new Error('redisEventsHandler: init requires an instance of loggerClient');
			throw e;
		}

		if (!dbClient){
			e = new Error('redisEventsHandler: init requires an instance of dbClient');
			throw e;
		}

		if (!amqpClient){
			e = new Error('redisEventsHandler: init requires an instance of AMQP client');
			throw e;
		}
		
		// save what we need in local vars
		nodeID = config.nodeID;
		END_SESSION_TIMEOUT_DELETION_SEC = config.END_SESSION_TIMEOUT_DELETION_SEC,
		logger = loggerClient;
		db = dbClient;
		amqp = amqpClient;

		setup(config.dbConfig);
	}
};

// Using the revealing module pattern, we expose only the init function
// while keeping the 'var instance' private.
module.exports = {
	init: init
};
