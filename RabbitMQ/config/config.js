/*global process*/
'use strict';

module.exports = {
	name: 'local',
	nodeID: 'LOCALdev-DEVV-devv-DEVV-LOCALdevONLY',
	app :{
		port: 3001
	},
	amqpConfig: {
		useCluster: false,
		connectRetryTimeout: 3000,
		prefix: 'POC_',
		deadletterTTL: 2000,
		instance: {
			host: '127.0.0.1',
			port: 5672,
			login: 'guest',
			password: 'guest'
		},
		cluster: {
			login: 'guest',
			password: 'guest',
			endPoints: [
				{
					proto: 'http',
					host: '127.0.0.1',
					port: 5672
				},
				{
					proto: 'http',
					host: '127.0.0.1',
					port: 5673
				}
			]
		}
	},
	logging: {
		levelConsole: 'silly',
		saveToDb: false || process.env.LOG_TO_DB,
		database: {
			level: 'warn',
			db: 'mongodb://localhost:27017/logging',
			collection: 'collection_local',
			storeHost: true
		}
	},
	sfcode:"uat-cert",
	defaults: {
		appName: 'RabbitMQSandbox',
		numJobQueues: 8
	}
};
