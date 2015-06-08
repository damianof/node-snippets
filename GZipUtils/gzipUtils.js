'use strict';

var zlib = require('zlib')
	//, gbuf = require('./gzip-buffer')
	, Stream = require('stream').Stream
	, util = require('util');

/* begin: gzip-buffer */
var gbuf = (function(){
	// gzip-buffer is from https://github.com/devdazed/gzip-buffer
	// this is a modified version with a subset of the functionality we need here
	/*!
	 * gzip-buffer
	 * Copyright(c) 2011 Russell Bradberry <rbradberry@gmail.com>
	 * MIT Licensed
	 */

	/**
	 * Collects a stream into a buffer and when the stream ends it emits the collected buffer
	 * @constructor
	 * @private
	 */
	var StreamCollector = function(){
		this.writable = true;
		this.data = new Buffer(0);
	};
	util.inherits(StreamCollector, Stream);

	/**
	 * Writes data to the buffer
	 * @param {Object} chunk The chunk to buffer
	 */
	StreamCollector.prototype.write = function(chunk){
		if (chunk !== undefined){
			if (!Buffer.isBuffer(chunk)){
				chunk = new Buffer(chunk);
			}

			var newBuffer = new Buffer(chunk.length + this.data.length);
			this.data.copy(newBuffer);
			chunk.copy(newBuffer, this.data.length);

			this.data = newBuffer;
		}
	};

	/**
	 * Ends the stream writing the final chunk
	 * @param {Object} chunk The chunk to buffer
	 */
	StreamCollector.prototype.end = function(chunk){
		this.write(chunk);
		this.emit('end', this.data);
	};

	/**
	 * Creates the StreamCollector, zips or unzips it and calls back with the data
	 * @param {Object} dataToProcess The data to zip or unzip
	 * @param {Object} gz The zipping mechanism
	 * @param {Function} callback The callback to call once the stream has finished
	 * @private
	 */
	function process(dataToProcess, gz, callback){
		var stream = new StreamCollector();

		stream.on('end', function(onEndData){
			callback(onEndData);
		});

		gz.pipe(stream);
		gz.end(dataToProcess);
	}

	return {
		/**
		 * Compresses data using gzip and calls back with the compressed data
		 * @param {Object} dataToProcess The data to compress
		 * @param {Object} options Options to pass to the zlib class
		 * @param {Function} callback The callback function that returns the data
		 */
		gzip: function(dataToProcess, callback){
			process(dataToProcess, zlib.createGzip(), callback);
		},

		/**
		 * Uncompresses data using gunzip and calls back with the compressed data
		 * @param {Object} dataToProcess The data to uncompress
		 * @param {Object} options Options to pass to the zlib class
		 * @param {Function} callback The callback function that returns the data
		 */
		gunzip: function(dataToProcess, callback){
			process(dataToProcess, zlib.createGunzip(), callback);
		},

		/**
		 * Library version.
		 */
		version: '0.0.2'
	};
}());
/* end: gzip-buffer */


// exposes only what we need
module.exports = {
	gzipAsync: function(json, cb){
		gbuf.gzip(json, function(compressed){
			cb(compressed);
		});
	},
	gunzipAsync: function(compressed, cb){
		if (compressed && compressed != null) {
			gbuf.gunzip(compressed, function(json){
				cb(json.toString());
			});
		} else {
			cb(compressed);
		}
	}
};


