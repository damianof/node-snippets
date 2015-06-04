'use strict';

var getEndTimeNanosecs = function(startTime){
	var diff = process.hrtime(startTime);
	return (diff[0] * 1e9 + diff[1]);
};

var getEndTimeMillisecs = function(startTime){
	var totNano = getEndTimeNanosecs(startTime);
	return totNano / 1e6;
};

module.exports = {
	getEndTimeNanosecs: getEndTimeNanosecs,
	getEndTimeMillisecs: getEndTimeMillisecs		
};
