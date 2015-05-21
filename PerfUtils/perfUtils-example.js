var perfUtils = require('./perfUtils');

// helper to log method execution time span
var logMethodEndTime = function(methodName, methodStartTime){
	var endTime = perfUtils.getEndTimeMillisecs(methodStartTime);
	console.log(methodName + ' time difference between request and response is ' + endTime + ' milliseconds');
};


var max = 5e7; // 1e9 takes about 1050 milliseconds on this machine doing just an empty loop
var i = max, avg;
var startTime = process.hrtime();
for (i = max; i--; ){
	//console.log(i);
}
logMethodEndTime('empty loop ' + max + ' iterations', startTime);

