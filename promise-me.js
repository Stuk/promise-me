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
            require("estraverse"),
            require("escope"),
            require('lodash')
        );
    } else if (typeof define === "function" && define.amd) {
        // AMD. Register as an anonymous module.
        /*global define*/
        define(["exports",
            "esprima",
            "escodegen",
            "estraverse",
            "escope"
        ], factory);
    } else {
        // Browser globals
        // The auxilary files also attach to the promiseMe root object, so
        // don't redefine if it exists
        factory((root.promiseMe = root.promiseMe || {}),
            root.esprima,
            root.escodegen,
            root.estraverse,
            root.escope
        );
    }
}(this, function (exports, esprima, escodegen, estraverse, escope, _) {

function curry(fn) {
    var args = Array.prototype.slice.call(arguments, 1);
    return function() {
        return fn.apply(this, args.concat(
        Array.prototype.slice.call(arguments)));
    };
}

function isObject(obj) {
    return obj !== null && typeof obj === "object";
}

function combine(source, obj) {
    for(var prop in source) {
        if (typeof obj[prop] === "undefined") {
            obj[prop] = source[prop];
        } else if (isObject(obj[prop]) || isObject(source[prop])) {
            if(!isObject(obj[prop]) || !isObject(source[prop])) {
                throw new TypeError("Cannot combine object with non-object, '" + prop + "'");
            } else {
                obj[prop] = combine(obj[prop], source[prop]);
            }
        } else {
            obj[prop] = source[prop];
        }
    }
    return obj;
}

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

var defaultOptions = {
    parse: parseOptions,
    generate: genOptions,

    matcher: hasNodeCallback,
    replacer: replaceNodeCallback,
    matcherChrome: hasChromeCallback,
    replacerChrome: replaceChromeCallback,
    
    flattener: thenFlattener,
};

/**
 * Convert the given code to use promises.
 * @param  {string} code    String containing Javascript code.
 * @param  {Object} options Options for generation.
 * @param  {Object} options.parse       Options for esprima.parse. See http://esprima.org/doc/ .
 * @param  {Object} options.generate    Options for escodegen.generate. See https://github.com/Constellation/escodegen/wiki/API .
 * @param  {Function} options.matcher   A function of form `(node) => boolean`. Must
 * accept any type of node and return true if it should be transformed into
 * `then`, using the replacer, and false if not. See
 * https://developer.mozilla.org/en-US/docs/SpiderMonkey/Parser_API for node
 * types.
 * @param  {Function} options.replacer  A function of form `(node) => Node`. Must
 * accept any type of node and return a new node to replace it that uses `then`
 * instead of a callback. Will only get called if options.matcher returns true. See
 * https://developer.mozilla.org/en-US/docs/SpiderMonkey/Parser_API for node
 * types.
 * @param  {Function} options.flattener  A function of form `(node) => Node`. Must
 * accept any type of node, and return either return the original node, or a new
 * node with the `then` calls flattened.
 * @param  {Function} log   Function to call with log messages.
 * @return {string}         The Javascript code with callbacks replaced with
 * .then() functions.
 */
exports.convert = function(code, options, log) {
    if (options) {
        options = combine(defaultOptions, options);
    } else {
        options = defaultOptions;
    }

    // Parse
    var ast = esprima.parse(code, options.parse);

    // Add comments to nodes.
    ast = escodegen.attachComments(ast, ast.comments, ast.tokens);

    // Do the magic
    estraverse.replace(ast, {
        leave: curry(callbackReplacer,  options.matcher, options.replacer)
    });
    estraverse.replace(ast, {
        leave: curry(callbackReplacer,  options.matcherChrome, options.replacerChrome)
    });
    estraverse.replace(ast, {
        enter: options.flattener
    });

    // generate
    return escodegen.generate(ast, options.generate);
};

/**
 * Visitor to each node that replaces Node callbacks with then calls.
 * @param  {Function} matcher   A function of form `(node) => boolean`. Should
 * accept any type of node and return true if it should be transformed into
 * `then` using the replacer and false if not.
 * @param  {Function} replacer  A function of form `(node) => Node`. Should
 * accept any type of node and return a new node that uses `then`.
 * @param  {Object} node        Any type of node.
 * @return {Object|undefined} If the CallExpression has a node callback returns
 * a CallExpression node that calls ".then" on the result of the original
 * function call, or undefined.
 */
function callbackReplacer(matcher, replacer, node) {
    if(matcher(node)) {
        // create a call to .then()
        return replacer(node);
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
exports.NODE_MATCHER = hasNodeCallback;
function hasNodeCallback(node) {
    var args = node.arguments;
    return node.type === "CallExpression" &&
        args.length &&
        args[args.length - 1].type === "FunctionExpression" &&
        args[args.length - 1].params.length === 2;
}

exports.NODE_REPLACER = replaceNodeCallback;
function replaceNodeCallback(node) {
    // the called function
    var func = node;
    // arguments to called function
    var args = func.arguments;
    // the last argument is the callback we need to turn into promise
    // handlers
    var callback = args.pop();

    // TODO retain comments
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
exports.CHROME_MATCHER = hasChromeCallback;
function hasChromeCallback(node) {
    var args = node.arguments;
    
    return node.type === "CallExpression" &&
        args.length >= 2 &&
        args[args.length - 2].type === "FunctionExpression" &&
        // args[args.length - 1].params.length === 1 &&
        args.length &&
        args[args.length - 1].type === "FunctionExpression" &&
        args[args.length - 1].params.length === 1;
}

exports.CHROME_REPLACER = replaceChromeCallback;
function replaceChromeCallback(node) {
    // the called function
    var func = node;
    // arguments to called function
    var args = func.arguments;
    // the last argument is the callback we need to turn into promise
    // handlers
    var errback = args.pop();
    var callback = args.pop();

    // TODO retain comments
    return {/*
            type: "CallExpression",
            callee: {
                type: "MemberExpression",
                computed: false,
                object: {*/
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
                    "arguments": [callback]//callbackToThenArgumentsChrome(errback, callback)
                /*},
                property: {
                    type: "Identifier",
                    name: "catch"
                }
            },
            arguments: [errback]*/
        } ;
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

function callbackToThenArgumentsChrome(errback, callback) {
    var thenArgs = [callback, errback];

    // var errorArg = callback.params.shift();

    // var errback = getErrorHandler(callback, errorArg);
    // if (errback) {
    //     thenArgs.push(errback);
    // }

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
exports.FLATTENER = thenFlattener;
function thenFlattener(node) {
    var currentFuncName = isThenCallWithThenCallAsLastStatement(node);
    console.log(currentFuncName)
    if (currentFuncName.catch || currentFuncName.then) {
        console.log('found',node)
        var resolvedFn = node.arguments[0];
        var body = resolvedFn.body.body;
        var lastStatement = body[body.length - 1];

        var functionCall = lastStatement.expression.callee.object;
        var thenArguments = lastStatement.expression.arguments;

        // escope only works with full programs, so lets make one out of
        // our FunctionExpression
        var program = {
            "type": "Program",
            "body": [{
                "type": "ExpressionStatement",
                "expression": resolvedFn
            }]
        };


        var root = escope.analyze(program);
        // List of all the identifiers used that were not defined in the
        // resolvedFn scope
        var parentIdentifiers = root.scopes[1].through;
        // List of all the identifiers used that were not defined in the `then`
        // resolved handler scope
        var resolveIdentifiers = root.acquire(thenArguments[0]).through;

        // If the `then` handler references variables from outside of its scope
        // that its parent doesn't, then they must have been captured from
        // the parent, and we cannot flatten, so just return the original node
        for (var i = resolveIdentifiers.length - 1; i >= 0; i--) {
            if (parentIdentifiers.indexOf(resolveIdentifiers[i]) === -1) {
                return node;
            }
        }

        // same for rejection handler
        if (thenArguments.length >= 2) {
            var rejectIdentifiers = root.acquire(thenArguments[1]).through;
            for (i = rejectIdentifiers.length - 1; i >= 0; i--) {
                if (parentIdentifiers.indexOf(rejectIdentifiers[i]) === -1) {
                    return node;
                }
            }
        }

        // Change last statement to just return the function call
        body[body.length - 1] = {
            type: "ReturnStatement",
            argument: functionCall
        };

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
                    name: currentFuncName.then ? "then" : (currentFuncName.catch ? 'catch' : '')
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
    
    var blankAnonFunc = {
        type: "CallExpression",
        callee: {
            type: "MemberExpression",
            property: {
                type: "Identifier",
                name: "__blank__"
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
    };
    
    var thenAnonFunc = _.cloneDeep(blankAnonFunc);    
    thenAnonFunc.callee.property.name = 'then';
    var catchAnonFunc = _.cloneDeep(blankAnonFunc);
    catchAnonFunc.callee.property.name = 'catch';
    console.log(node, '*', thenAnonFunc, '*', catchAnonFunc)
    
    if (doesMatch(node, thenAnonFunc) || doesMatch(node, catchAnonFunc) ) {

        var callBlankStmt = {
            type: "ExpressionStatement",
            expression: {
                type: "CallExpression",
                callee: {
                    type: "MemberExpression",
                    property: {
                        type: "Identifier",
                        name: "__blank__"
                    }
                }
            }
        };
        var callThenStmt = _.cloneDeep(callBlankStmt);
        callThenStmt.expression.callee.property.name = 'then';
        var callCatchStmt = _.cloneDeep(callBlankStmt);
        callCatchStmt.expression.callee.property.name = 'catch';
        
        var body = node.arguments[0].body.body;
        var lastStatement = body[body.length - 1];

        return {
            then: doesMatch(lastStatement, callThenStmt),
            catch:  doesMatch(lastStatement, callCatchStmt)
        };
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
