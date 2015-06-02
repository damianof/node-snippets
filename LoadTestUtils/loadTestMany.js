/*global process, require*/
'use strict';

var  async = require('async')
	, loadTest = require('./loadTestOneSession');
	
// to set only one session, run: loadTest.start();

// to set many parallels session, run the following code
var howManySessions = 1000;

var MyTask = function(name, index){
	var self = this;
	self.name = name;
	self.index = index;
	
	this.exec = function(){
	   loadTest.create().start();
	};
};

var cargo = async.cargo(function (tasks, callback) {
    for (var i = 0; i < tasks.length; i++){
		var task = tasks[i];
		console.info('CARGO ASYNC: Start Executing ' + task.name + ' ' + task.index);
		task.exec();
    }
	
}, howManySessions);


for (var i = 0; i < howManySessions; i++){
	var task = new MyTask('LoadTest', i);
	cargo.push(task);
}