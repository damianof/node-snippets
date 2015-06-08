/*global process*/
'use strict';
var gzipUtils = require('./gzipUtils.js');
var perfUtils = require('./perfUtils');

// test
var howMany = 30;

// helper to log method execution time span
var logMethodEndTime = function(methodName, methodStartTime, k, plain, comp){
	var endTime = perfUtils.getEndTimeMillisecs(methodStartTime);
	var msg = 'TIME DIFFERENCE - ' + methodName + ' [k ' + k + ']:'
		+ ' is ' + endTime + ' milliseconds. [plain, comp]'
		+ ' [' + plain.length + ',' + comp.length + ']';

	console.log(msg);
};

var database = []; // storing it in here to later test gunzipion
var dataPrefix = 'www.nielsen.com/X100zdCIGeIlgZnkYj6UvQ: : /6mPaots2oVnItYHCYzp0Yw: : /5k0Cb0ZUOvGrV-fho5xWJF3k14WNfgdyeyEGwlAyUT242tTY9uiAtkTWdElIMCXTK8QamZdZWWVLfSbZeo9VzSlOiPZQ8RLhGpInjK3qwUaLwUpfXTTN0IgZ4iWBmeRiPpS9X100zdCIGeIlgZnkYj6UvVKyPIZSsjyQPPY: /00000/583';
var i = howMany, data, payload, compressed, startTime;
console.log('______________ BEGIN _______________');
console.log('______________ gzip sync ___________');
// gzip test
for (i > 0; i--; ){
	if (i < 10){
		data = dataPrefix + '0' + i + '0/00';
	} else {
		data = dataPrefix + i + '0/00';
	}
	
	// make data bigger
	data = data+data+data+data+data;
	
	payload = '{"event": "sendId3", "data": "' + data + '", "sequence": "' + i + '"}';

	//console.log(payload);
	startTime = process.hrtime();

	gzipUtils.gzipAsync(payload, function(result){
		logMethodEndTime('gzipAsync', startTime, i, payload, result);
		compressed = result;
		database.push(compressed);
	});
}

// gunzip test
console.log('______________ gunzip sync_________');
i = database.length;
for (i > 0; i--; ){
	startTime = process.hrtime();
	gzipUtils.gunzipAsync(database[i], function(result2){
		payload = result2;
		logMethodEndTime('gunzip', startTime, i, payload, database[i]);
		//console.log(payload);
	});
}
console.log('______________ END ________________');


// console.log('______________ BEGIN FILE ______________');
// console.log('______________ gzipAsync file ___________');
// var fs = require('fs'), path = require('path');
// var filePath = path.join(__dirname, 'json_temp.txt');

// payload = fs.readFileSync(filePath, 'utf8');
// //console.log(payload);
// startTime = process.hrtime();

// gzipUtils.gzipAsync(payload, function(result){
// 	logMethodEndTime('gzipAsync', startTime, 0, payload, result);
// 	compressed = result;

// 	console.log('______________ gunzipAsync file _________');
// 	startTime = process.hrtime();
// 	gzipUtils.gunzipAsync(compressed, function(result2){
// 		payload = result2;
// 		logMethodEndTime('gunzipAsync', startTime, 0, payload, compressed);
// 		console.log('______________ END FILE ______________');
// 		//console.log(payload);
// 	});
// });

