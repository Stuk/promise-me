Promise Me
==========

Code transformer to change Node-style callbacks into promises.

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

Usage
-----

```bash
$ promise-me script.js
```

