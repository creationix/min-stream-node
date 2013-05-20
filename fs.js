var fs = require('fs');
var wrapStream = require('./common.js').wrapStream;

exports.createReadStream = createReadStream;
function createReadStream(path, options, callback) {
  var stream = fs.createReadStream(path, options);
  callback(null, wrapStream(stream));
}

exports.createWriteStream = createWriteStream;
function createWriteStream(path, options, callback) {
  var stream = fs.createWriteStream(path, options);
  callback(null, wrapStream(stream));
}