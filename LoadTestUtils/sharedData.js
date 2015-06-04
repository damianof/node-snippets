/**
	* @description
	* Shared data between loadTestOneSession and loadTestMany
*/
var instance;


var getInstance = function () {
	if (!instance) {
		instance = {
			incompleteSessions: 0
		};
	}

	return instance;
}

module.exports = {
	getInstance: getInstance
};
