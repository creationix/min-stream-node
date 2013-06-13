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
    var data = false;
    while (chunk = stream.read()) {
      data = true;
      dataQueue.push([null, chunk]);
    }
    if (data) check();
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
  var reading = false, writing = false;
  var source, callback;

  return sink;

  function sink(read) {
    source = read;
    return continuable;
  }

  function continuable(cb) {
    callback = cb;
    stream.on("drain", onDrain);
    check();
  }

  function onDrain() {
    writing = false;
    check();
  }

  function check() {
    while (!(reading || writing)) {
      reading = true;
      source(null, onRead);
    }
  }

  function onRead(err, chunk) {
    reading = false;
    if (chunk === undefined) {
      if (end) stream.end();
      if (err) stream.destroy();
      callback(err);
    }
    else {
      writing = !stream.write(chunk);
      check();
    }
  }

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

