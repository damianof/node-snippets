/*global process*/
'use strict';

module.exports = {
	name: 'local',
	nodeID: 'LOCALdev-DEVV-devv-DEVV-LOCALdevONLY',
	app :{
		port: 3001// locally running controller on 3001 (collection on 3000 and processing on 3002)
	},
	rabbitConfig: {
		// if true, it will use the rabbitCluster configuration section below, otherwise it will the rabbit section
		useCluster: false,
		// this is the time before we'll try to reconnect to RabbitMQ if unable to connect
		connectRetryTimeout: 3000,
		// Prefix for Rabbit exchange and queues.
		// Since currently we have a single instance of Rabbit, this is to separate
		// queues and exchange for different environments like staging,dev,production etc
		prefix: 'POC_',
		deadletterTTL: 2000,
		rabbit: {
			// If useCluster is false, we'll use this to conenct to a single RabbitMQ instance:
			
			// Host address of Rabbit. Needs to be set either locally as environment
			// variable or on modulus. Same for all the below environment variables.
			host: '127.0.0.1',
		
			// Port on which Rabbit instance is running.
			port: 5672,
		
			// Login for Rabbit
			login: 'test',
		
			// Password for Rabbit
			password: 'test'
		},
		rabbitCluster: {
			// if useCluster is true, we'll use this to connect to the RabbitMQ cluster end points
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
		// if wish, you can set level with env variable here
		levelConsole: 'silly',
		//levelOnlyConsole: false,
		saveToDb: false || process.env.LOG_TO_DB,
		database: {
			level: 'warn',
			//levelOnly: false,
			//db: 'mongodb://162.242.149.191:9999/logging',
			db: 'mongodb://localhost:27017/logging',
			collection: 'cont_local',
			storeHost: true
		}
	},
	sfcode:"uat-cert",
	defaults: {
		appName: 'QueueController',
		numJobQueues: 4
	}
};
