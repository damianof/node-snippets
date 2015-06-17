var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);

// setup up express app
app.use(express.static(__dirname + '/client'));


// setup socket.io connection
io.on('connection', function(socket){
  console.log('socket.io a user connected');

  // log message when a user disconnect
  socket.on('disconnect', function(){
    console.log('socket.io user disconnected');
  });
});


// helper function to return a random integer within a specified range
function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

// helper function that returns a data item with random data points/counts
var getFakeData = function(){
  return {
    sessions: getRandomInt(1234,5432),
    rabbitQueue: getRandomInt(15454,53692),
    redisKeys: getRandomInt(15499,57932),
    other: getRandomInt(12131,27932)
  };
};

// a fake emitter of socket.io data (will send fakr data every 500 milliseconds)
var emitter = (function(){
  var intervalId;
  
  // will start emitting
  var start = function(io){
    if(!intervalId){
      intervalId = setInterval(function(){
        var fakeData = getFakeData();
        io.emit('data message', fakeData);
      }, 500);
    }
  };

  // stop emitting
  var stop = function(io){
    if(intervalId){
      clearInterval(intervalId);
      intervalId = null;
    }
  };

  // revealing module pattern, expose only start and stop functions
  return {
    start: start,
    stop: stop
  };

}());

// start emitting data
emitter.start(io);

// start node/express http server
var port = 3333;
http.listen(port, function(){
  console.log('listening on *:' + port);
});