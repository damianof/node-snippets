

var conf = require('./config');
var logger = require('./logger');
var session = require('./sessionUtils').getInstance();

//console.log('conf', conf);

var queueing = require('./queueing.js').getInstance(conf, logger);
var eventNames = queueing.eventNames;
var keys = queueing.keys;

var PUBLISH_RATE = 100 //every 6 seconds
  , count        = 1;


var mainExchange;

var onRabbitError = function(err) {
	logger.error('onRabbitError', err);	
};

var onRabbitConnected = function() {
	//var conn = queueing.connection;
	logger.cyan('onRabbitConnected');

	queueing.initMainQueue(onInitMainQueueReady);
};

logger.cyan('listening to even: ' + eventNames.connected);
queueing.emitter.on(eventNames.error, onRabbitError);
queueing.emitter.on(eventNames.connected, onRabbitConnected);
// queueing.emitter.on(eventNames.assertExchange + '_' + keys.mainExchangeKey, onAssertMainExchange);
// queueing.emitter.on(eventNames.assertQueue + '_' + keys.mainQueueKey, onAssertMainQueue);
// queueing.emitter.on(eventNames.bindQueue + '_' + keys.mainQueueKey + '_' + keys.mainExchangeKey, onBindMainQueue);


var onInitMainQueueReady = function(result){
	logger.cyan('onInitMainQueueReady ready: start publishing to', result.mainQueue.name);
	mainExchange = result.mainExchange;
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
	
		var queueKey = keys.mainQueueKey;
		console.log('publish ', {
			queueKey: queueKey,
			payload: encodedPayload
		});
		mainExchange.publish(queueKey, new Buffer(encodedPayload), {
			mandatory: true
			, ack: true
			, deliveryMode: 2 // persistent
		}, function publishCallback(hasError){
			//if (hasError){
				logger.info('mainExchange publish callback hasError:', hasError);
			//}
		});

	}, PUBLISH_RATE);
};
