/**
    @module "ui/demo.reel"
    @requires montage
    @requires montage/ui/component
*/
var Montage = require("montage").Montage,
    Component = require("montage/ui/component").Component,
    ArrayController = require("montage/ui/controller/array-controller").ArrayController;

var convert = require("promise-me").convert;

var TAB = "    ";

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
    },

    prepareForDraw: {
        value: function () {
            this.templateObjects.before.element.addEventListener("keydown", this, false);
        }
    },

    handleKeydown: {
        value: function(e) {
            var target = e.target;
            var keyCode = e.keyCode;

            if (keyCode == 9) {
                e.preventDefault();
                var start = target.selectionStart;
                var end = target.selectionEnd;

                target.value = target.value.substring(0, start) + TAB + target.value.substring(end);

                target.selectionStart = target.selectionEnd = start + TAB.length;
            }
        }
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
