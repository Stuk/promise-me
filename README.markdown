Promise Me [![Build Status](https://secure.travis-ci.org/Stuk/promise-me.png?branch=master)](https://travis-ci.org/Stuk/promise-me)
==========

Promise Me helps you move your code from using callbacks to using [promises](http://wiki.commonjs.org/wiki/Promises/A), for example through [Q](https://github.com/kriskowal/q), [RSVP.js](https://github.com/tildeio/rsvp.js) or [when.js](https://github.com/cujojs/when).

It parses your code and then manipulates the AST to transform the callbacks into calls to `then()`, including a rejection handler if you handle the original callback error. Think of it as a slightly smarter find-and-replace. It will probably break your code and require you to fix it.

Try the [live demo](http://stuk.github.com/promise-me/)!

Installation and usage
----------------------

```bash
$ npm install -g promise-me
$ promise-me script.js
```

### API

```javascript
var promiseMe = require("promise-me");

var before = "...";
var after = promiseMe.convert(before, options);
```

#### promiseMe.convert(code, options)

Convert the given code to use promises.

 * `{string} code`    String containing Javascript code.
 * `{Object} options` Options for generation.
 * `{Object} options.parse`       Options for `esprima.parse`. See http://esprima.org/doc/ .
 * `{Object} options.generate`    Options for `escodegen.generate`. See https://github.com/Constellation/escodegen/wiki/API .
 * `{Function} options.matcher`   A function of form `(node) => boolean`. Must accept any type of node and return true if it should be transformed into `then`, using the replacer, and false if not. See https://developer.mozilla.org/en-US/docs/SpiderMonkey/Parser_API for node types.
 * `{Function} options.replacer`  A function of form `(node) => Node`. Must accept any type of node and return a new node to replace it that uses `then` instead of a callback. Will only get called if options.matcher returns true. See https://developer.mozilla.org/en-US/docs/SpiderMonkey/Parser_API for node types.
 * `{Function} options.flattener`  A function of form `(node) => Node`. Must accept any type of node, and return either return the original node, or a new node with the `then` calls flattened.
 * `{Function} log`   Function to call with log messages.
 * Returns `{string}`         The Javascript code with callbacks replaced with `.then()` functions.


Examples
--------

### Simple callback

Before:
```javascript
getDetails("Bob", function (err, details) {
    console.log(details)
});
```

After:
```javascript
getDetails('Bob').then(function (details) {
    console.log(details);
});
```

### Error handling

Before:
```javascript
getDetails("Bob", function (err, details) {
    if (err) {
        console.error(err);
        return;
    }
    console.log(details)
});
```

After:
```javascript
getDetails('Bob').then(function (details) {
    console.log(details);
}, function (err) {
    console.error(err);
    return;
});
```

### Nested callbacks

Before:
```javascript
getDetails("Bob", function (err, details) {
    getLongLat(details.address, details.country, function(err, longLat) {
        getNearbyBars(longLat, function(err, bars) {
            console.log("Your nearest bar is: " + bars[0]);
        });
    });
});
```

After:
```javascript
getDetails('Bob').then(function (details) {
    return getLongLat(details.address, details.country);
}).then(function (longLat) {
    return getNearbyBars(longLat);
}).then(function (bars) {
    console.log('Your nearest bar is: ' + bars[0]);
});
```

### Captured variables

Before:
```javascript
getDetails("Bob", function (err, details) {
    getLongLat(details.address, details.country, function(err, longLat) {
        getNearbyBars(longLat, function(err, bars) {
            // Note the captured `details` variable
            console.log("The closest bar to " + details.address + " is: " + bars[0]);
        });
    });
});
```

After:
```javascript
getDetails("Bob").then(function (details) {
    getLongLat(details.address, details.country).then(function (longLat) {
        return getNearbyBars(longLat);
    }).then(function (bars) {
        // Note the captured `details` variable
        console.log("The closest bar to " + details.address + " is: " + bars[0]);
    });
});
```


