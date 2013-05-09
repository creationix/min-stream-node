"use strict";
var net = require('net');

exports.createServer = createServer;
// Returns a source that emits requests.
function createServer(address, port, callback) {
  var dataQueue = [];
  var readQueue = [];
  var started;
  var server = net.createServer(onConnection);
  server.listen(port, address, onListening);
  server.on("error", onError);

  function onError(err) {
    if (started) {
      dataQueue.push([err]);
      check();
    }
    else {
      started = true;
      callback(err);
    }
  }

  function onListening() {
    started = true;
    var obj = Object.create(server);
    obj.source = source;
    callback(null, obj);
  }

  function source(close, callback) {
    if (close) {
      return server.close(function () {
        callback(close === true ? null : close);
      });
    }
    readQueue.push(callback);
    check();
  }

  function check() {
    while (readQueue.length && dataQueue.length) {
      readQueue.shift().apply(null, dataQueue.shift());
    }
  }

  function onConnection(socket) {
    dataQueue.push([null, wrapSocket(socket)]);
    check();
  }
}

exports.connect = connect;
function connect(address, port, callback) {
  var socket = net.connect(port, address, onConnected);
  socket.on("error", onError);

  function onError(err) {
    socket.removeListener("error", onError);
    callback(err);
  }

  function onConnected() {
    socket.removeListener("error", onError);
    callback(null, wrapSocket(socket));
  }
}

exports.wrapSocket = wrapSocket;
function wrapSocket(socket) {
  var obj = Object.create(socket);
  obj.source = socketToSource(socket);
  obj.sink = socketToSink(socket);
  return obj;
}

exports.socketToSource = socketToSource;
function socketToSource(socket) {
  var dataQueue = [];
  var readQueue = [];
  var paused = true;

  function check() {
    while (dataQueue.length && readQueue.length) {
      readQueue.shift().apply(null, dataQueue.shift());
    }
    if (paused && readQueue.length) {
      socket.resume();
      paused = false;
    }
    else if (!paused && dataQueue.length) {
      socket.pause();
      paused = true;
    }
  }

  socket.on("error", function (err) {
    dataQueue.push([err]);
    check();
  });

  socket.on("end", function () {
    dataQueue.push([]);
    check();
  });

  socket.on("readable", function () {
    var chunk;
    while (chunk = socket.read()) {
      dataQueue.push([null, chunk]);
    }
    check();
  });

  return function (close, callback) {
    if (close) {
      socket.destroy();
      socket.once("close", function () {
        callback(close === true ? null : close);
      });
    }
    else {
      readQueue.push(callback);
      check();
    }
  };
}

exports.socketToSink = socketToSink;
function socketToSink(socket) {
  return function (read) {
    var reading;
    next();

    function next() {
      if (reading) return;
      reading = true;
      read(null, onRead);
    }

    function onRead(err, chunk) {

      reading = false;
      if (chunk === undefined) {
        socket.end();
        if (err) {
          console.error(err.toString());
          socket.destroy();
        }
      }
      else if (socket.write(chunk)) {
        next();
      }
    }

    socket.on("drain", next);
  };
}
