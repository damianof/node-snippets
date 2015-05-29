

var conf = require('./config');
var logger = require('./logger');
var session = require('./sessionUtils').getInstance();
var queueing = require('./queueing.js').getInstance(conf, logger);
var eventNames = queueing.eventNames;
var keys = queueing.keys;

conf.numJobQueues = conf.defaults.numJobQueues;
logger.silly('--- TEST JOB QUEUES ---');

var PUBLISH_RATE = 1000 //every 6 seconds
  , count        = 1;


var jobExchange;

var onRabbitError = function(err) {
	logger.error('onRabbitError', err);	
};

var onRabbitConnected = function() {
	//var conn = queueing.connection;
	logger.cyan('onRabbitConnected');

	queueing.initJobQueues(conf.numJobQueues, null, onInitJobQueuesReady);
};

logger.cyan('listening to even: ' + eventNames.connected);
queueing.emitter.on(eventNames.error, onRabbitError);
queueing.emitter.on(eventNames.connected, onRabbitConnected);

var onInitJobQueuesReady = function(result){
	logger.cyan('onInitJobQueuesReady ready', result.jobExchange.name);
	jobExchange = result.jobExchange;
	publishRoutine();
};

function getRandomIntFromMax(max) {
    return Math.floor((Math.random() * max) + 1);
}
var getRandomJobQueueKey = function(){
	var n = Number(conf.numJobQueues);
	var r = getRandomIntFromMax(n);
	return queueing.keys.jobQueueKeyPrefix + r;
};

var publishRoutine = function(){
	//console.log('publishRoutine', getRandomJobQueueKey());

	var sequence = 0;
	var sessionId = session.getNewSessionID();
		
	setInterval(function() {
		//console.log('publishRoutine', getRandomJobQueueKey());
		var payload = {
			sessionId: 		sessionId  
			, count: 		count++
			, sentAt: 		(new Date()).toString()
			, msg: 			{
				sequence:  sequence++
			}
		};
		var encodedPayload =  JSON.stringify(payload);

		var queueKey = getRandomJobQueueKey();
		

		jobExchange.publish(queueKey, new Buffer(encodedPayload), {
			mandatory: true
			, ack: true
			, deliveryMode: 2 // persistent
		}, function publishCallback(hasError){
			if (hasError){
				logger.error('--- jobExchange publish callback hasError:', hasError);
			} else {
				logger.info('published to job queue [' + queueKey + ']', encodedPayload);
			}
		});

	}, PUBLISH_RATE);
};
