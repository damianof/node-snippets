var util = require('util');

var timestamp = function() {
	return new Date();
};

var transportsWrite = function(level, msg, data){
	// safeConsoleLog(level, msg, data);
	// safeOtherTransport(level, msg, data);
	//console.log('transportsWrite', level, msg);

	for (var t in config.transports){
		var trans = config.transports[t];
		//console.log('transportsWrite', trans);
		//if (canProceed(trans.level, trans.levelOnly, level)){
			trans.write(timestamp(), level, msg, data);
		//}
	}
};

var init = function(transports){
	config = {}
	config.transports = transports;
};

var logger =  {
	init: init,
	silly: function(msg, data){
		transportsWrite('silly', msg, data);
	},
	debug: function(msg, data){
		transportsWrite('debug', msg, data);
	},
	info: function(msg, data){
		transportsWrite('info', msg, data);
	},
	warn: function(msg, data){
		transportsWrite('warn', msg, data);
	},
	error: function(msg, data){
		transportsWrite('error', msg, data);
	},
	cyan: function(msg, data){
		transportsWrite('cyan', msg, data);
	}
};

var prefix = ' \033[',
	suffix = '\033[m: ',
	stderrColors = {
		error: '31m', // red
		info: '32m', // green
		warn: '33m', // yellow
		debug: '34m', // blue
		silly: '35m', // magenta
		cyan: '36m', // cyan
		white: '37m' // white
	};

var transportConsole = {
	name: 'Console',
	level: 'silly',
	levelOnly: false,
	write: function(timestamp, level, message, data){
		var msg = timestamp + prefix + stderrColors[level] + level + suffix + message;
		//process.stderr.write(msg);
		if (data != undefined){
			console.log(msg, data);
		} else {
			console.log(msg);
		}
	}
};

logger.init([transportConsole]);

module.exports = logger;


