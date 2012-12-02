// promise-me test file
var fs = require("fs");

// This callback should be changed to a promise
fs.readFile("test.js", "utf8", function (err, data) {
    console.log(data);
});
