module.exports = {

	
	apiBaseUrl: process.env.API_BASEURL || 'http://localhost:3000/api/v1/',

	// app id to use for testing
	appId: 		'PF23627CD-B1D2-534A-E040-070AAB3152EE',
	
	howManySessions: isNaN(process.env.NUM_SESSION) ? 1 : process.env.NUM_SESSION,
	
	howManyId3: isNaN(process.env.HOW_MANY_ID3) ? 5 : process.env.HOW_MANY_ID3,
	
	intervalBetweenRequests: process.env.INTERVAL_BETWEEN_REQUESTS || 6000,
	
	rampUpTime: isNaN(process.env.RAMP_UP) ? 5 : process.env.RAMP_UP, // this is in minutes
	
	logging: {
		level: 'warn',
		saveToDb: false,
		database: {
		}
	}
};
