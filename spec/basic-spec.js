/*global describe,before,it,expect,after */

var promiseMe = require("../index.js");

describe("promise-me basics", function() {
    it("changes a callback to then", function() {
        expect(
            promiseMe.convert("a(function(err, value){ console.log(value); })")
        ).toEqual("a().then(function (value) {\n    console.log(value);\n});");
    });

    describe("error handler", function() {
        it("creates a rejection handler from if statement", function() {
            expect(
                promiseMe.convert("a(function(err, value){ if(err) { return; } console.log(value); })")
            ).toEqual("a().then(function (value) {\n    console.log(value);\n}, function (err) {\n    return;\n});");
        });

        it("handles consequant that isn't a block statement", function() {
            expect(
                promiseMe.convert("a(function(err, value){ if(err) return; console.log(value); })")
            ).toEqual("a().then(function (value) {\n    console.log(value);\n}, function (err) {\n    return;\n});");
        });

    });

});
