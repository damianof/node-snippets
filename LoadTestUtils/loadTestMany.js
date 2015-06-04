/*global process, require*/
'use strict';

var  async = require('async')
	, config = require('./config.js')
	, logging = require('./logging.js')
	, loadTest = require('./loadTestOneSession')
	, prompt = require('prompt')
	, sharedData = require('./sharedData');
var logger = logging.getClient(config.logging);
	
// to set only one session, run: loadTest.start();

// to set many parallels session, run the following code
var howManySessions = config.howManySessions || 1000;

console.log('NMAPI base url is ', config.apiBaseUrl);
console.log('Number of session to run (NUM_SESSION): ' + howManySessions);
console.log('howManyId3 (HOW_MANY_ID3): ' + config.howManyId3);
console.log('intervalBetweenRequests (INTERVAL_BETWEEN_REQUESTS): ' + config.intervalBetweenRequests + ' milliseconds');
console.log('rampUpTime (RAMP_UP): ' + config.rampUpTime + ' minutes');

// prompt the user to confirm to give chance to change ENV variables
var property = {
	name: 'YN',
	message: 'Do you want to continue with these settings? If not say N and change environment variables. (Y/N)',
	validator: /y[es]*|n[o]?/,
	warning: 'Must respond Y or N'
};

prompt.get(property, function (err, result) {           
//console.log('result', result);    
	if (result.YN == 'y'){
		console.log('Starting');
		doWork();
	} else {
		console.log('Aborted!');
		process.exit(0);
	}
});


var doWork = function(){

	// calculate interval between each session (ramp up time)
	var intervalBetweenSessions = (config.rampUpTime * 60 * 1000) / howManySessions;
	console.log('intervalBetweenSessions (ramp-up time / num of sessions) is ' + intervalBetweenSessions + ' milliseconds');


	var MyTask = function(name, index){
		var self = this;
		self.name = name;
		self.index = index;
		
		this.exec = function(){
			setTimeout(function(){
				loadTest.create().start();
			}, index * intervalBetweenSessions);
		};
	};

	var cargo = async.cargo(function (tasks, callback) {
		for (var i = 0; i < tasks.length; i++){
			var task = tasks[i];
			console.log('CARGO ASYNC: Start Executing ' + task.name + ' ' + task.index);
			task.exec();
		}
		
	}, howManySessions);


	for (var i = 0; i < howManySessions; i++){
		var task = new MyTask('LoadTest', i);
		cargo.push(task);
	}

}