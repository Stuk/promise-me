/**
    @module "ui/demo.reel"
    @requires montage
    @requires montage/ui/component
*/
var Montage = require("montage").Montage,
    Component = require("montage/ui/component").Component,
    ArrayController = require("montage/ui/controller/array-controller").ArrayController;

var convert = require("promise-me").convert;

/**
    Description TODO
    @class module:"ui/demo.reel".Demo
    @extends module:montage/ui/component.Component
*/
exports.Demo = Montage.create(Component, /** @lends module:"ui/demo.reel".Demo# */ {
    didCreate: {
        value: function() {
            var self = this;
            this.examplesController = ArrayController.create();
            require.async("examples.json").then(function(examples) {
                self.examplesController.content = examples;
                self.examplesController.selectedIndexes = [0];
            });
        }
    },

    examplesController: {
        value: null
    }
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
