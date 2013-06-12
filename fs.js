// This module implements the js-git fs interface for node.js
// The interface is documented at:
//
//   https://github.com/creationix/js-git/blob/master/specs/fs.md
//

var fs = require('fs');

module.exports = {
  stat: stat,
  read: read,
  write: write,
  unlink: unlink,
  readlink: readlink,
  symlink: symlink,
  readdir: readdir,
  rmdir: rmdir,
  mkdir: mkdir
};

// Given a path, return a continuable for the stat object.
function stat(path) {
  return function (callback) {
    fs.stat(path, function (err, stat) {
      if (err) return callback(err);
      var ctime = stat.ctime / 1000;
      var cseconds = Math.floor(ctime);
      var mtime = stat.mtime / 1000;
      var mseconds = Math.floor(mtime);
      callback(null, {
        ctime: [cseconds, Math.floor((ctime - cseconds) * 1000000000)],
        mtime: [mseconds, Math.floor((mtime - mseconds) * 1000000000)],
        dev: stat.dev,
        ino: stat.ino,
        mode: stat.mode,
        uid: stat.uid,
        gid: stat.gid,
        size: stat.size
      });
    });
  };
}

// Given a path and options return a stream source of the file.
// options.start the start offset in bytes
// options.end the offset of the last byte to read
function read(path, options) {
  options = options || {};
  var position = options.start;
  var fd, reading;
  var dataQueue = [];
  var readQueue = [];

  // TODO: don't open the file till the first read.  Be lazy.
  // simulate a read lock for open and return the stream source.
  reading = true;
  fs.open(path, "r", function (err, result) {
    reading = false;
    if (err) dataQueue.push([err]);
    fd = result;
    check();
  });

  return source;

  function finish(err) {
    reading = true;
    if (fd) {
      fs.close(fd, function () {
        flush(err);
      });
    }
    else flush(err);
  }

  function flush(err) {
    while (readQueue.length) {
      readQueue.shift()(err);
    }
    reading = false;
  }

  function check() {
    while (dataQueue.length && readQueue.length) {
      var item = dataQueue.shift();
      if (item[1] === undefined) {
        return finish(item[0]);
      }
      readQueue.shift().apply(null, item);
    }
    if (reading || !readQueue.length) return;
    var length = 8192;
    if (typeof position === 'number' && typeof options.end === 'number') {
      length = Math.min(length, options.end - position);
      if (!length) {
        dataQueue.push([]);
        return check();
      }
    }
    var buffer = new Buffer(length);
    reading = true;
    fs.read(fd, buffer, 0, length, position, onRead);
  }

  function onRead(err, bytesRead, buffer) {
    reading = false;
    if (err) {
      dataQueue.push([err]);
      return check();
    }
    if (!bytesRead) {
      dataQueue.push([]);
      return check();
    }
    if (typeof position === 'number') position += bytesRead;
    if (bytesRead < buffer.length) {
      dataQueue.push([null, buffer.slice(0, bytesRead)]);
    }
    else {
      dataQueue.push([null, buffer]);
    }
    check();
  }

  function source(close, callback) {
    if (close) {
      // TODO: ensure the callback will eventually match the close.  Be robust.
      dataQueue.push([close === true ? null : close]);
    }
    readQueue.push(callback);
    check();
  }

}

function write(path, options) {
  options = options || {};
  var dataQueue = [];
  var read, fd;
  var callback;

  function onOpen(err, result) {
    if (err) dataQueue.push([err]);
    fd = result;
    check();
  }

  function onRead() {
    dataQueue.push(arguments);
    check();
  }

  function check() {
    if (!fd) return;
    if (dataQueue.length) {

    }

  }

  throw new Error("TODO: finish implementing this function");

  return function (source) {
    read = source;
    return function (cb) {
      callback = cb;
      fs.open(path, "w", options.mode, onOpen);
      read(null, onRead);
    };
  };
}


function unlink(path) {
  return function (callback) {
    fs.unlink(path, callback);
  };
}

function readlink(path) {
  return function (callback) {
    fs.readlink(path, callback);
  };
}

function symlink(path, value) {
  return function (callback) {
    fs.symlink(path, value, callback);
  };
}

function readdir(path) {
  var files = null;
  var error = null;
  var reading = false;
  var offset = 0;
  var readQueue = [];

  function check() {
    while (readQueue.length && (files || error)) {
      var callback = readQueue.shift();
      if (error) callback(error);
      else callback(null, files[offset++]);
    }
    if (!reading && readQueue.length) {
      reading = true;
      fs.readdir(path, onRead);
    }
  }

  function onRead(err, result) {
    reading = false;
    error = err;
    files = result;
    check();
  }

  return function (close, callback) {
    if (close) return callback(close === true ? null : close);
    readQueue.push(callback);
    check();
  };
}

function rmdir(path) {
  return function (callback) {
    fs.rmdir(path, callback);
  };
}

function mkdir(path) {
  return function (callback) {
    fs.mkdir(path, callback);
  };
}
