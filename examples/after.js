fs.readFile("test.js", "utf8").then(function (data) {
    console.log(data);
}, function (err) {
    console.error(err);
    return;
});
