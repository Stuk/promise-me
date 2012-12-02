// promise-me test file
var fs = require("fs");

// This callback should be changed to a promise
fs.readFile("test.js", "utf8").then(function (data) {
    console.log(data);
});
