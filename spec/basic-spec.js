/*global describe,before,it,expect,after */

// UMD from https://github.com/umdjs/umd/blob/master/commonjsStrict.js
(function (root, factory) {
    if (typeof exports === "object") {
        // CommonJS
        factory(require("../promise-me"));
    } else if (typeof define === "function" && define.amd) {
        // AMD. Register as an anonymous module.
        /*global define*/
        define(["../promise-me"], factory);
    } else {
        // Browser globals
        factory(root.promiseMe);
    }
}(this, function (promiseMe) {

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
        {generate: {format: {indent: {style: '', base: 0 }}}}
    )).toEqual(after);
};

describe("promise-me basics", function() {
    // defined to avoid jshint errors
    var a, b, c, d, e, f, g, h, i, j;

    it("changes a callback to then", function() {
        compare(function() {
            a(function (err, value) {
                console.log(value);
            });
        }, function() {
            a().then(function (value) {
                console.log(value);
            });
        });
    });

    it("doesn't change a callback to then when it doesn't have two parameters", function() {
        compare(function() {
            a(function (err) {
                console.log(err);
            });
        }, function() {
            a(function (err) {
                console.log(err);
            });
        });

        compare(function() {
            a(function (err, value, more) {
                console.log(value, more);
            });
        }, function() {
            a(function (err, value, more) {
                console.log(value, more);
            });
        });
    });

    describe("error handler", function() {
        it("creates a rejection handler from if statement", function() {
            compare(function() {
                a(function (err, value) {
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
                a(function (err, value) {
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

        xit("handles if else/alternate", function() {
            compare(function() {
                a(function (err, value) {
                    if(err) {
                        console.error(err);
                    } else {
                        console.log(value);
                    }
                });
            }, function() {
                a().then(function (value) {
                    console.log(value);
                }, function (err) {
                    console.error(err);
                });
            });
        });
    });

    describe("nested", function() {
        describe("callbacks", function() {
            it("are transformed into a chained thens", function() {
                compare(function () {
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

                compare(function () {
                    a(function (errA, valueA) {
                        b(valueA, function (errB, valueB) {
                            c(valueB, function (errC, valueC) {
                                console.log(valueC);
                            });
                        });
                    });
                }, function() {
                    a().then(function (valueA) {
                        return b(valueA);
                    }).then(function (valueB) {
                        return c(valueB);
                    }).then(function (valueC) {
                        console.log(valueC);
                    });
                });
            });
        });

        // disabled for the moment, as I don't think these are necessary for
        // version 1
        xdescribe("thens", function() {
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

    describe("comments", function() {
        it("keeps comments", function() {
            compare(function() {
                a(function (err, value) {
                    // log the value
                    console.log(value);
                });
            }, function() {
                a().then(function (value) {
                    // log the value
                    console.log(value);
                });
            });
        });
    });
});

})); // UMD
