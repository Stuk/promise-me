fs.readFile("test.js", "utf8", function (err, data) {
    if (err) {
        console.error(err);
        return;
    }

    console.log(data);
});
