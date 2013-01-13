/*global describe,before,it,expect,after,waitsFor */

// No UMD, only for nodejs
var exec = require("child_process").exec,
    fs = require("fs");

describe("promise-me binary", function() {

    it("converts a simple file", function() {
        var after = fs.readFileSync("spec/fixtures/after/simple.js", "utf8");

        var child = exec("./bin/promise-me spec/fixtures/before/simple.js",
          function (error, stdout, stderr) {
            expect(error).toBe(null);
            expect(stderr).toEqual("");
            expect(stdout).toEqual(after);
        });

        waitsFor(function() { return child.exitCode !== null; });
    });

});
