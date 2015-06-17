/*
Restricting yourself to a namespace
If you have control over all the messages and events emitted for a particular application, 
using the default / namespace works. If you want to leverage 3rd-party code, or produce code 
to share with others, socket.io provides a way of namespacing a socket.

This has the benefit of multiplexing a single connection. Instead of 
socket.io using two WebSocket connections, it’ll use one.
*/


var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);

// setup up express app
app.use(express.static(__dirname + '/client'));

// setup socket.io connection
// io.on('connection', function(socket){
// 	console.log('socket.io a user connected');
// 	// log message when a user disconnect
// 	socket.on('disconnect', function(){
// 	console.log('socket.io user disconnected');
// 	});
// });


//var io = require('socket.io')(3333);
var chat = io
	.of('/chat')
	.on('connection', function (chatSocket) {
		console.log('/chat a user connected');

		chat.on('disconnect', function(){
			console.log('/chat a user disconnected');
		});

		// chatSocket.emit('message', {
		// 		that: 'only'
		// 	, '/chat': 'will get'
		// });
		chat.emit('message', {
				everyone: 'in'
			, '/chat': 'will get'
		});

		chatSocket.on('reply', function (item) {
			console.log('/chat server received reply', item);
		});
	});

var news = io
	.of('/news')
	.on('connection', function (newsSocket) {
		console.log('/news a user connected');

		news.on('disconnect', function(){
			console.log('/news a user disconnected');
		});

		news.emit('item', { 
			news: 'item' 
		});

		newsSocket.on('reply', function (item) {
			console.log('/NEWS server received reply', item);
		});
	});

var port = 3333;
http.listen(port, function(){
	console.log('listening on *:' + port);
});