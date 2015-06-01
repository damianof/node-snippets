/*global require, module*/
//node
var EventEmitter = require('events').EventEmitter
//npm
	, extend = require('extend')
// private
	, logger;

/**
 * Redis Event Notifier
 * Subscribe to Redis Keyspace Notifications(v2.8.x)
 * DON'T Use this directly. This is used by redisEventHandler.js
 * @param redis
 * @param options
 * @constructor
 */
function RedisNotifier(loggerClient, options) {
	logger = loggerClient;

	this.settings = extend(true, {
//		redis: {
//			host: '',
//			port: 0,
//			db: 0,
//			options: {
//				family: null //IPv4/IPv6
//			}
//		},
		dbConfig: {
// need to pass this
		},
		//db:		 undefined, // need to pass this
		expired: true,
		evicted: true
	}, options || {});
	
	//Require loggerClient if its not injected
	if (!loggerClient || typeof loggerClient !== 'object') {
		throw new Error("redisEventNotifier.js: You must provide an instance of Logging");
	}
	
	//The Redis Subscriber Instance
	logger.info("redisEventNotifier.js: Initializing");

	// Call the super EventEmitter constructor.
	EventEmitter.call(this);
	
	var dbConfig = this.settings.dbConfig;
	if (!this.settings.db) {
		throw new Error("redisEventNotifier.js: You must provide db number");
	}
	
	//logger.warn('redisEventNotifier.js dbConfig.useRedisSentinel', dbConfig.useRedisSentinel);
	
	if (!dbConfig.useRedisSentinel) {

		if (!dbConfig.redis || !dbConfig.redis.host || !dbConfig.redis.port
			|| dbConfig.redis.host.length == 0 || dbConfig.redis.port == 0) {
			throw new Error("redisEventNotifier.js: You must provide redis configuration settings");
		}

		//Create Redis Subscriber Client
		logger.warn('--- redisEventNotifier.js using redis. Redis config is ---', dbConfig.redis);
		var redis =  require('redis');
		//redis.debug_mode = true;
		this.subscriber = redis
			.createClient(dbConfig.redis.port, dbConfig.redis.host, {
				auth_pass: dbConfig.redis.auth
				, return_buffers: true // required if storing binary data
				, retry_max_delay: 1000
			});
	} else {
		// instantiate sentinel client
		logger.warn('-------- redisEventNotifier.js using redis SENTINEL -------- Sentinel config is', dbConfig.redisSentinel);
		var sentinel =  require('redis-sentinel');
		sentinel.debug_mode = true;
		this.subscriber = sentinel
			.createClient(dbConfig.redisSentinel.endPoints, dbConfig.redisSentinel.masterName,  {
				auth_pass: dbConfig.redis.auth
				, return_buffers: true // required if storing binary data
				, connect_timeout: 10000
				, retry_max_delay: 1000
			});
	}
	
	// If not authenticated yet, perform authentication.
	if (dbConfig.redis.auth) {
		this.subscriber.auth(dbConfig.redis.auth, function(err) {
			if (!err) {
				logger.info('-------- redisEventNotifier.js Redis Authenticated -----------');
			} else {
				// TODO: need to handle error
				logger.error('-------- redisEventNotifier.js Error authenticating redis -----------', err);
			}
		});
	}

	//Select Appropriate Database
	this.subscriber.select(this.settings.db);

	//Redis Ready To Subscribe
	this.subscriber.on('ready', function () {
		logger.info('redisEventNotifier.js: Redis Subscriber Ready');
		//Subscribe To Expired/Evicted Events
		this._subscribeToEvents.call(this);
	}.bind(this));

	//Bind To Redis Store Message Handler
	this.subscriber.on('pmessage', function (pattern, channel, key) {
		logger.warn('redisEventNotifier.js: Received Message ' +  key ? key.toString('utf8') : 'undefined');
		this.emit('message', pattern, channel, key);
	}.bind(this));
}

//Inherit From The EventEmitter Prototype
RedisNotifier.prototype = Object.create(EventEmitter.prototype);

/**
 * Subscribe to Expired/Evicted Events
 * Emitted From Redis
 * @private
 */
RedisNotifier.prototype._subscribeToEvents = function () {
	logger.info('redisEventNotifier.js: Subscribing To Events');
	//events generated every time a key expires
	if (this.settings.expired) {
		this._subscribeKeyevent('expired');
	}
	//events generated when a key is evicted for max-memory
	if (this.settings.evicted) {
		this._subscribeKeyevent('evicted');
	}

	//Let user know its ready to handle subscriptions
	this.emit('ready');
};


/**
 * De-init the subscriptions
 */
RedisNotifier.prototype.deinit = function () {
	if (this.settings.expired) {
		this._unsubscribeKeyevent('expired');
	}
	if (this.settings.evicted) {
		this._unsubscribeKeyevent('evicted');
	}
};

/**
 * Parse The Type/Key From ChannelKey
 * @param channel
 * @returns {{type: *, key: *}}
 */
RedisNotifier.prototype.parseMessageChannel = function (channel) {
	//__keyevent@0__:expired
	var re = /__([a-z]*)+@([0-9])+__:([a-z]*)/i;
	var parts = channel.match(re);

	return {
		type: parts[1],
		key: parts[3]
	};
};

/**
 * Subscribe To Specific Redis Keyspace Event
 * @param key
 * @private
 */
RedisNotifier.prototype._subscribeKeyspace = function (key) {
	var subscriptionKey = '__keyspace@' + this.settings.db + '__:' + key;
	logger.debug('redisEventNotifier.js: Subscribing To Event: ' + subscriptionKey);
	this.subscriber.psubscribe(subscriptionKey);
};

/**
 * UnSubscribe To Specific Redis Keyspace Event
 * @param key
 * @private
 */
RedisNotifier.prototype._unsubscribeKeyspace = function (key) {
	var subscriptionKey = '__keyspace@' + this.settings.db + '__:' + key;
	logger.debug('redisEventNotifier.js: UnSubscribing From Event: ' + subscriptionKey);
	this.subscriber.punsubscribe(subscriptionKey);
};

/**
 * Subscribe To KeyEvent (Expired/Evicted)
 * @param key
 * @private
 */
RedisNotifier.prototype._subscribeKeyevent = function (key) {
	var subscriptionKey = '__keyevent@' + this.settings.db + '__:' + key;
	logger.debug('redisEventNotifier.js: Subscribing To Event: ' + subscriptionKey);
	this.subscriber.psubscribe(subscriptionKey);
};


/**
 * UnSubscribe To KeyEvent (Expired/Evicted)
 * @param key
 * @private
 */
RedisNotifier.prototype._unsubscribeKeyevent = function (key) {
	var subscriptionKey = '__keyevent@' + this.settings.db + '__:' + key;
	logger.debug('redisEventNotifier.js: UnSubscribing From Event: ' + subscriptionKey);
	this.subscriber.punsubscribe(subscriptionKey);
};


module.exports = RedisNotifier;