min-stream-node
===============

This module contains some helper functions for converting node streams into min-streams and sinks.

The interface for sources and sinks is in the [min-stream][] documentation.

## streamToSource(readableStream) -> source

Converts a readable stream to a min-stream source.

## streamToSink(writableStream, [end]) -> sink

Converts a writable stream to a min-stream sink.

If the optional `end` argument is false, then the node stream won't have `.end()` called on it when the stream ends.

### wrapStream(stream) -> minStream

Wraps a single stream into an object with `source` and `sink` properties.  It will only add the properties if the node stream claims to be readable and/or writable.

```js
// Here is an example creating a duplex min-stream manually
var stdio = {
  source: streamToSource(process.stdin),
  sink: streamToSink(process.stdout, false)
};

// If we have an existing duplex node stream, we can do it in one shot.
var stream = net.connect(8080, function () {
  var socket = wrapStream(stream);
  // socket now has .source() and .sink() properties.
});
```

[min-stream]: https://github.com/creationix/js-git/blob/master/specs/min-stream.md
