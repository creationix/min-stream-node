"use strict";
var net = require('net');
var wrapStream = require('./common.js').wrapStream;

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
  source.is = "min-stream-read";

  function check() {
    while (readQueue.length && dataQueue.length) {
      readQueue.shift().apply(null, dataQueue.shift());
    }
  }

  function onConnection(socket) {
    dataQueue.push([null, wrapStream(socket)]);
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
    callback(null, wrapStream(socket));
  }
}

