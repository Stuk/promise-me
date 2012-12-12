/**
    @module "ui/demo.reel"
    @requires montage
    @requires montage/ui/component
*/
var Montage = require("montage").Montage,
    Component = require("montage/ui/component").Component;

var convert = require("promise-me").convert;

/**
    Description TODO
    @class module:"ui/demo.reel".Demo
    @extends module:montage/ui/component.Component
*/
exports.Demo = Montage.create(Component, /** @lends module:"ui/demo.reel".Demo# */ {

});

exports.PromiseMeConverter = Montage.create(Montage, {
    convert: {
        value: function(value) {
            var out;
            try {
                out = convert(value);
            } catch (e) {
                out = e;
            }
            return out;
        }
    }
});
