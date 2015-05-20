var EventEmitter = require('events').EventEmitter;
var emitter = new EventEmitter();

emitter.setMaxListeners(255);


var lastHeartbeatAt = Date.now(), waitTime = 3000;


var lastRunAt = Date.now();
var doSomethingIfTime = function(time){
	var timePassed = time - lastRunAt;

	if (timePassed >= waitTime){
	lastRunAt = Date.now();
	console.log('doSomethingIfTime: it is time');
    }
};

emitter.on('heartbeat', function () {
    console.log('heartbeat: check', lastHeartbeatAt);

    doSomethingIfTime(lastHeartbeatAt);
    lastHeartbeatAt = Date.now();
});


setInterval(function(){
	emitter.emit('heartbeat');
}, 1000);

