

// var conf = require('../config/config');
// var logger = require('../packages/logger');
// var session = require('../packages/sessionUtils').getInstance();
// var amqpClient = require('../packages/amqpClient.js').getInstance(conf, logger);
// var eventNames = amqpClient.eventNames;
// var keys = amqpClient.keys;

// conf.numJobQueues = conf.defaults.numJobQueues;
// logger.silly('--- TEST JOB QUEUES ---');

// var PUBLISH_RATE = 1000 //every 6 seconds
//   , count        = 1;


// var jobExchange;

// var onRabbitError = function(err) {
// 	logger.error('onRabbitError', err);	
// };

// var onRabbitConnected = function() {
// 	//var conn = amqpClient.connection;
// 	logger.cyan('onRabbitConnected');

// 	amqpClient.initJobQueues(conf.numJobQueues, onInitJobQueuesReady);
// };

// logger.cyan('listening to even: ' + eventNames.connected);
// amqpClient.emitter.on(eventNames.error, onRabbitError);
// amqpClient.emitter.on(eventNames.connected, onRabbitConnected);

// var onInitJobQueuesReady = function(result){
// 	logger.cyan('onInitJobQueuesReady ready', result.jobExchange.name);
// 	jobExchange = result.jobExchange;
// 	publishRoutine();
// };

// function getRandomIntFromMax(max) {
//     return Math.floor((Math.random() * max) + 1);
// }
// var getRandomJobQueueKey = function(){
// 	var n = Number(conf.numJobQueues);
// 	var r = getRandomIntFromMax(n);
// 	return amqpClient.keys.jobQueueKeyPrefix + r;
// };

// var publishRoutine = function(){
// 	//console.log('publishRoutine', getRandomJobQueueKey());

// 	var sequence = 0;
// 	var sessionId = session.getNewSessionID();
		
// 	setInterval(function() {
// 		//console.log('publishRoutine', getRandomJobQueueKey());
// 		var payload = {
// 			sessionId: 		sessionId  
// 			, count: 		count++
// 			, sentAt: 		(new Date()).toString()
// 			, msg: 			{
// 				sequence:  sequence++
// 			}
// 		};
// 		var encodedPayload =  JSON.stringify(payload);

// 		var queueKey = getRandomJobQueueKey();
		

// 		jobExchange.publish(queueKey, new Buffer(encodedPayload), {
// 			mandatory: true
// 			, ack: true
// 			, deliveryMode: 2 // persistent
// 		}, function publishCallback(hasError){
// 			if (hasError){
// 				logger.error('--- jobExchange publish callback hasError:', hasError);
// 			} else {
// 				logger.info('published to job queue [' + queueKey + ']', encodedPayload);
// 			}
// 		});

// 	}, PUBLISH_RATE);
// };
