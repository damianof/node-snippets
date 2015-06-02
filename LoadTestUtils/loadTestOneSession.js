/*global process, require*/
'use strict';

var config = require('./config.js')
	, logging = require('./logging.js')
	, restify = require('restify')
	, async = require('async');
var logger = logging.getClient(config.logging);

var _intervalBetweenRequests = config.intervalBetweenRequests; // this value is in milliseconds - 6000 equals 6 seconds
var _howManyId3 = config.howManyId3; // how many id3 data points we send every _intervalBetweenRequests
// i.e. 'http://localhost:3000/api/v1/''
var baseUrl = config.apiBaseUrl;
var app_id = config.appId;


var create  = function() {
	
	var apiRoutes = {
		sessions: baseUrl + app_id + '/sessions'
	};
	
	// in case we need authentication:
	// //client.basicAuth('$login', '$password');
	// client.get('/my/machines', function(err, req, res, obj) {
	// 	console.log(JSON.stringify(obj, null, 2));
	// });
	
	// Creates a restify JSON client
	var client = restify.createJsonClient({
		url: baseUrl
	});
	
	var task_StartSession = {
		name: 'StartSession'
		, exec: function(cb){
			
			// initial payload
			var createSessionPayload = {
				sequence: 0,
				apn: 'app name',
				appver: 'v3.1.2',
				osver: 'iOS7.1.2',
				devtype: 'iPad2,4',
				brand: 'apple',
				devcat: 'tablet',
				deviceId: '9ca6ad17-174d-4824-b4b1-aae550fd62b9', //WANDERING-DUCK-GUID-1111-222222220000',
				collection: 'true'
			};
			
			//console.log(apiRoutes.sessions);
			client.post(apiRoutes.sessions, createSessionPayload, function(err, req, res, obj){
				//if (res && res != null){
				// 	logger.debug('client.post response: %d -> %j', res.statusCode, res.headers);
				//}
	
				cb(null, {what:'StartSession: result', err: err, res: res});
			});
		}
	};
	
	var task_LoadMetadata = {
		name: 'LoadMetadata'
		, exec: function(cb){
			/* ----------- Send Load metadata ----------- */
			// load meta data payload
			var loadMetadataPayload = {
				  event: 'loadMetaData'
				, sequence: 1
				, data: {
					type: 'content'
					, assetid: '12345'
					, adModel: 0
					, dataSrc: 'id3'
				}
			};
			client.put(apiRoutes.sessionid, loadMetadataPayload, function(err2, req2, res2, obj2){
				//logger.info('load meta data payload response statusCode', [res2.statusCode]);
				cb(null, {what:'LoadMetadata: result', err: err2, res: res2});
			});
		}	
	};
	
	var dataPrefix = 'www.domain.com/X100zdCIGeIlgZnkYj6UvQ==/6mPaots2oVnItYHCYzp0Yw==/5k0Cb0ZUOvGrV-fho5xWJF3k14WNfgdyeyEGwlAyUT242tTY9uiAtkTWdElIMCXTK8QamZdZWWVLfSbZeo9VzSlOiPZQ8RLhGpInjK3qwUaLwUpfXTTN0IgZ4iWBmeRiPpS9X100zdCIGeIlgZnkYj6UvVKyPIZSsjyQPPY=/00000/583';
	var TaskSendID3 = function(sequence, payload){
		var self = this;
		self.name = 'SendID3';
		self.sequence = sequence;
		self.payload = payload;
		self.exec = function(cb){
			//logger.debug(self.name + ' ' + self.sequence + ' ' + apiRoutes.sessionid);
			client.put(apiRoutes.sessionid, payload, function(err, req, res, obj){
				cb(null, {what:'SendID3 ' + self.sequence + ': result', err: err, res: res});
			});
		};
	};
	
	var task_StopEvent = {
		name: 'StopEvent'
		, sequence: 0
		, exec: function(cb){
			/* ----------- Stop Event ----------- */
			var data = {
				event: 		'stop'
				, data: 	0
				, sequence: this.sequence
			};
			client.put(apiRoutes.sessionid, data, function(err, req, res, obj){
				//logger.debug('StopEvent statusCode', [res.statusCode]);
				cb(null, {what:'StopEvent: result', err: err, res: res});
			});
		}
	};
	
	var task_EndSession = {
		name: 'EndSession'
		, apiUrl : ''
		, exec: function(cb){
			/* ----------- End Session ----------- */
			client.del(apiRoutes.sessionid, function(err, req, res, obj){
				client.close();
				cb(null, {what:'EndSession: result', err: err, res: res});
			});
		}
	};
	
	// helper
	var printTaskResult = function(err, args){										
		if (args.err){
			logger.error('ASYNC: finished processing ' + args.what + ': ERROR:', args.err);
		} else if (args.res && Number(args.res.statusCode) > 202){
			logger.error('ASYNC: finished processing ' + args.what + ': BAD RESPONSE:', args.res.statusCode);
		} else {
			logger.info('ASYNC: finished processing ' + args.what + ':', args.res.statusCode);
		}
	};
	
	var start = function(){
		var queue = async.priorityQueue(function (task, callback) {
			setTimeout(function(){
				logger.info('ASYNC: Start Executing ' + task.name);
				task.exec(callback);
			}, _intervalBetweenRequests);
		}, 1);
		
		// assign a callback 
		queue.drain = function() {
		    logger.debug('ASYNC: all items have been processed');
		};
		
		// add some items to the queue 
		queue.push(task_StartSession, 1, function (err, args) {
			printTaskResult(err, args);
			var spl = args.res.headers.location.split('/sessions/');
			logger.info('spl', spl);
			var sessionId = spl[1];
			apiRoutes.sessionid = apiRoutes.sessions + '/' + sessionId;
			logger.info('SESSIONID: ', sessionId);
		});
		// add some items to the queue 
		queue.push(task_LoadMetadata, 2, printTaskResult);
		
		var sequence = 3;
		for (var i = 0; i < _howManyId3; i++){
			var payload;
			sequence = i + 3;
			if (i < 10){
				payload = {event: 'sendId3', data: dataPrefix + '0' + i + '0/00', sequence: sequence};
			} else {
				payload = {event: 'sendId3', data: dataPrefix + i + '0/00', sequence: sequence};
			}
			var task_SendID3 = new TaskSendID3(sequence, payload);
			queue.push(task_SendID3, sequence, printTaskResult);
		}
		// add some items to the queue
		queue.push(task_StopEvent, ++sequence, printTaskResult);
		// add some items to the queue 
		queue.push(task_EndSession, ++sequence, printTaskResult);
	};
	
	return {
		start: start
	}
};

module.exports = {
	create: create
};
													
