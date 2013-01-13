/*
Promise Me
Copyright (c) 2013, Stuart Knightley
All rights reserved.

Licenced under the New BSD License. See LICENSE for details.
*/

// UMD from https://github.com/umdjs/umd/blob/master/commonjsStrict.js
(function (root, factory) {
    if (typeof exports === "object") {
        // CommonJS
        factory(exports,
            require("esprima"),
            require("escodegen"),
            require("estraverse")
        );
    } else if (typeof define === "function" && define.amd) {
        // AMD. Register as an anonymous module.
        /*global define*/
        define(["exports",
            "esprima",
            "escodegen",
            "estraverse"
        ], factory);
    } else {
        // Browser globals
        factory((root.promiseMe = {}),
            root.esprima,
            root.escodegen,
            root.estraverse
        );
    }
}(this, function (exports, esprima, escodegen, estraverse) {

var parseOptions = {
    loc: true,
    range: true,
    raw: true,
    tokens: true,
    comment: true
};

var genOptions = {
    parse: esprima.parse,
    comment: true
};

/**
 * Convert the given code to use promises.
 * @param  {string} code    String containing Javascript code.
 * @param  {Object} options Options for generation.
 * @param  {Function} log   Function to call with log messages.
 * @return {string}         The Javascript code with callbacks replaced with
 * .then() functions.
 */
exports.convert = function(code, options, log) {
    if (options) {
        for (var p in genOptions) {
            if (options[p] === undefined) {
                options[p] = genOptions[p];
            }
        }
    } else {
        options = genOptions;
    }

    // Parse
    var ast = esprima.parse(code, parseOptions);

    // Add comments to nodes.
    ast = escodegen.attachComments(ast, ast.comments, ast.tokens);

    // Do the magic
    estraverse.replace(ast, {
        leave: callbackReplacer
    });
    estraverse.replace(ast, {
        enter: thenFlattener
    });

    // generate
    return escodegen.generate(ast, options);
};

/**
 * Visitor to each node that replaces Node callbacks with then calls.
 * @param  {Object} node   Any type of node.
 * @return {Object|undefined} If the CallExpression has a node callback returns
 * a CallExpression node that calls ".then" on the result of the original
 * function call, or undefined.
 */
function callbackReplacer(node) {
    if(node.type === "CallExpression" && hasNodeCallback(node)) {
        // the called function
        var func = node;
        // arguments to called function
        var args = func.arguments;
        // the last argument is the callback we need to turn into promise
        // handlers
        var callback = args.pop();

        // create a call to .then()
        return {
            "type": "CallExpression",
            "callee": {
                "type": "MemberExpression",
                "computed": false,
                "object": func,
                "property": {
                    "type": "Identifier",
                    "name": "then"
                }
            },
            "arguments": callbackToThenArguments(callback)
        };
    }
}
/**
 * Checks if a CallExpression has a node callback. Heuristic: last argument
 * is a FunctionExpression, and that FunctionExpression has two arguments.
 * TODO: check first FunctionExpression argument is called something like "err",
 * or "error". Maybe that would be too presumptuous.
 * @param  {Object}  node CallExpression node.
 * @return {Boolean}      true if the node has a Node callback, false otherwise.
 */
function hasNodeCallback(node) {
    var args = node.arguments;
    return args.length && args[args.length - 1].type === "FunctionExpression" &&
        args[args.length - 1].params.length === 2;
}

/**
 * Convert a Node callback to arguments for a then call.
 * Removes the first (error) argument from the function. Checks if the error
 * arg is handled, if so it creates a rejection handler function.
 * @param  {Object} callback FunctionExpression node.
 * @return {Array}            Array of one or two FunctionExpression nodes.
 */
function callbackToThenArguments(callback) {
    var thenArgs = [callback];

    var errorArg = callback.params.shift();

    var errback = getErrorHandler(callback, errorArg);
    if (errback) {
        thenArgs.push(errback);
    }

    return thenArgs;
}

/**
 * Checks if the given FunctionExpression checks if the given error arg is
 * checked and handled. If so, returns a function containing the contents
 * of the if block.
 * @param  {Object} callback FunctionExpression node.
 * @param  {string}   errorArg The name of the error argument.
 * @return {Object|undefined} A FunctionExpression node if the error was
 * handled, or undefined if not.
 */
function getErrorHandler(callback, errorArg) {
    var errorArgName = errorArg.name;
    if (callback.body.type === 'BlockStatement') {
        var body = callback.body.body;
        for (var i = 0, len = body.length; i < len; i++) {
            // Only matches
            // if (error) ...
            // TODO: think about matching if (err !== null) and others
            if (
                body[i].type === "IfStatement" &&
                body[i].test.type === 'Identifier' &&
                body[i].test.name === errorArgName
            ) {
                var handler = body.splice(i, 1)[0].consequent;

                if (handler.type !== "BlockStatement") {
                    handler = {
                        "type": "BlockStatement",
                        "body": [handler]
                    };
                }

                return {
                    "type": "FunctionExpression",
                    "id": null,
                    // give the new function the same error argument
                    "params": [errorArg],
                    "defaults": [],
                    // the body is the body of the if
                    "body": handler,
                    "rest": null,
                    "generator": false,
                    "expression": false
                };
            }

        }
    }
}

/**
 * Visitor that looks for promises as the last statement of a function, and
 * moves the ".then" call to be called on the result of the function call.
 * TODO: check if the "then" function (or any of its children) close on any
 * variables in this function. If so we shouldn't flatten.
 * @param  {Object} node   Any type of node.
 * @return {Object|undefined} If the last statment is a promise, then returns
 * a CallExpression that calls ".then" on the result of the original function
 * call.
 */
function thenFlattener(node) {
    if (isThenCallWithThenCallAsLastStatement(node)) {
        var body = node.arguments[0].body.body;
        var lastStatement = body[body.length - 1];

        var functionCall = lastStatement.expression.callee.object;
        var thenArguments = lastStatement.expression.arguments;

        // Change last statement to just return the function call
        body[body.length - 1] = {
            type: "ReturnStatement",
            argument: functionCall
        }

        // Wrap the outer function call in a MemberExpression, so that we can
        // call then(thenArguments) on the result (which is the return value,
        // which is the return value of functionCall)
        return thenFlattener({
            type: "CallExpression",
            callee: {
                type: "MemberExpression",
                computed: false,
                object: node,
                property: {
                    type: "Identifier",
                    name: "then"
                }
            },
            arguments: thenArguments
        });
    } else {
        return node;
    }
}
/**
 * Checks if this is a ".then" CallExpression, and if so checks if the last
 * statment is a function call with ".then" called on it.
 * @param  {Object}  node Any type node.
 * @return {Boolean}
 */
function isThenCallWithThenCallAsLastStatement(node) {
    var callee, firstArg, firstArgBody;
    if (doesMatch(node, {
        type: "CallExpression",
        callee: {
            type: "MemberExpression",
            property: {
                type: "Identifier",
                name: "then"
            }
        },
        arguments: [
            {
                type: "FunctionExpression",
                body: {
                    type: "BlockStatement"
                }
            }
        ]
    })) {
        var body = node.arguments[0].body.body;
        var lastStatement = body[body.length - 1];
        return doesMatch(lastStatement, {
            type: "ExpressionStatement",
            expression: {
                type: "CallExpression",
                callee: {
                    type: "MemberExpression",
                    property: {
                        type: "Identifier",
                        name: "then"
                    }
                }
            }
        });
    }

    return false;
}

/**
 * Returns true if and only if for every property in matchObject, object
 * contains the same property with the same value. Objects are compared deeply.
 * Short circuits, so if a property does not exist in object then no errors are
 * raised.
 * The is means object can contain other properties that are not defined in
 * matchObject
 * @param  {any} object      The object to test.
 * @param  {any} matchObject The object that object must match.
 * @return {boolean}             See above.
 */
function doesMatch(object, matchObject) {
    if (!object || matchObject === null || typeof matchObject !== "object") {
        return object === matchObject;
    }

    return Object.keys(matchObject).every(function(prop) {
        return doesMatch(object[prop], matchObject[prop]);
    });
}

})); // UMD
