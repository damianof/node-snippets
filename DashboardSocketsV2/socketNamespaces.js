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
	.on('connection', function (socket) {
		console.log('/chat a user connected');
		socket.emit('message', {
				that: 'only'
			, '/chat': 'will get'
		});
		chat.emit('message', {
				everyone: 'in'
			, '/chat': 'will get'
		});
	});

var news = io
	.of('/news')
	.on('connection', function (socket) {
		console.log('/news a user connected');
		socket.emit('item', { 
			news: 'item' 
		});
	});

var port = 3333;
http.listen(port, function(){
	console.log('listening on *:' + port);
});