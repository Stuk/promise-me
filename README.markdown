Promise Me [![Build Status](https://secure.travis-ci.org/Stuk/promise-me.png?branch=master)](https://travis-ci.org/Stuk/promise-me)
==========

Promise Me helps you move your code from using callbacks to using [promises](http://wiki.commonjs.org/wiki/Promises/A), for example through [Q](https://github.com/kriskowal/q), [RSVP.js](https://github.com/tildeio/rsvp.js) or [when.js](https://github.com/cujojs/when).

It parses your code and then manipulates the AST to transform the callbacks into calls to `then()`, including a rejection handler if you handle the original callback error. Think of it as a slightly smarter find-and-replace. It will probably break your code and require you to fix it.

Try the [live demo](http://stuk.github.com/promise-me/)!

Installation and usage
----------------------

```bash
$ npm install -g promise-me
```

```bash
$ promise-me script.js
```


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


