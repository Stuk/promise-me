/*global describe,before,it,expect,after */

var promiseMe = require("../index.js");

function convertFunctionToString(fn) {
    var lines = fn.toString().split("\n");
    lines.pop();
    lines.shift();
    lines = lines.map(function(line) {
        return line.trim();
    });
    return lines.join("\n");
}

// This utility function allows us to write tests as Javascript functions
// instead of strings. Note: the functions are never executed so they don't
// need to make semantic sense.
var compare = function(before, after) {
    before = convertFunctionToString(before);
    after = convertFunctionToString(after);

    expect(promiseMe.convert(
        before,
        {format: {indent: {style: '', base: 0 }}}
    )).toEqual(after);
};

describe("promise-me basics", function() {
    // defined to avoid jshint errors
    var a, b, c, d, e, f, g, h, i, j;

    it("changes a callback to then", function() {
        compare(function() {
            a(function(err, value) {
                console.log(value);
            });
        }, function() {
            a().then(function (value) {
                console.log(value);
            });
        });
    });

    describe("error handler", function() {
        it("creates a rejection handler from if statement", function() {
            compare(function() {
                a(function(err, value) {
                    if(err) {
                        return;
                    }
                    console.log(value);
                });
            }, function() {
                a().then(function (value) {
                    console.log(value);
                }, function (err) {
                    return;
                });
            });
        });

        it("handles consequant that isn't a block statement", function() {
            compare(function() {
                a(function(err, value) {
                    if(err) return;
                    console.log(value);
                });
            }, function() {
                a().then(function (value) {
                    console.log(value);
                }, function (err) {
                    return;
                });
            });
        });
    });

    describe("nested", function() {
        describe("callbacks", function() {
            it("are transformed into a chained thens", function() {
                compare(function() {
                    a(function (errA, valueA) {
                        b(valueA, function (errB, valueB) {
                            console.log(valueB);
                        });
                    });
                }, function() {
                    a().then(function (valueA) {
                        return b(valueA);
                    }).then(function (valueB) {
                        console.log(valueB);
                    });
                });
            });
        });

        describe("thens", function() {
            it("are transformed into chained thens", function() {
                compare(function() {
                    a().then(function (valueA) {
                        b(valueA).then(function (c) {});
                    });
                }, function() {
                    a().then(function (valueA) {
                        return b(valueA);
                    }).then(function (c) {});
                });
            });

            it("that are also chained are flattened", function() {
                compare(function() {
                    a().then(function (valueA) {
                        b(valueA).then(function (c) {}).then(function (d) {});
                    });
                }, function() {
                    a().then(function (valueA) {
                        return b(valueA);
                    }).then(function (c) {}).then(function (d) {});
                });
            });

            it("that are called on an object are flattened", function() {
                compare(function() {
                    a().then(function (valueA) {
                        b(valueA).then(function(c) {}).then(function(d) {});
                    });
                }, function() {
                    a().then(function (valueA) {
                        return b(valueA);
                    }).then(function (c) {}).then(function (d) {});
                });
            });
        });
    });
});
