"use strict";

exports.streamToSource = streamToSource;
function streamToSource(stream) {
  var dataQueue = [];
  var readQueue = [];
  var paused = true;

  function check() {
    while (dataQueue.length && readQueue.length) {
      readQueue.shift().apply(null, dataQueue.shift());
    }
    if (paused && readQueue.length) {
      stream.resume();
      paused = false;
    }
    else if (!paused && dataQueue.length) {
      stream.pause();
      paused = true;
    }
  }

  stream.on("error", function (err) {
    dataQueue.push([err]);
    check();
  });

  stream.on("end", function () {
    dataQueue.push([]);
    check();
  });

  stream.on("readable", function () {
    var chunk;
    while (chunk = stream.read()) {
      dataQueue.push([null, chunk]);
    }
    check();
  });

  return function (close, callback) {
    if (close) {
      stream.destroy();
      stream.once("close", function () {
        callback(close === true ? null : close);
      });
    }
    else {
      readQueue.push(callback);
      check();
    }
  };
}

exports.streamToSink = streamToSink;
function streamToSink(stream, end) {
  if (end === undefined) end = true;
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
        if (end) stream.end();
        if (err) {
          console.error(err.toString());
          stream.destroy();
        }
      }
      else if (stream.write(chunk)) {
        next();
      }
    }

    stream.on("drain", next);
  };
}

exports.wrapStream = wrapStream;
function wrapStream(stream) {
  var obj = Object.create(stream);
  if (stream.readable) {
    obj.source = streamToSource(stream);
  }
  if (stream.writable) {
    obj.sink = streamToSink(stream);
  }
  return obj;
}

