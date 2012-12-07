var esprima = require("esprima");
var escodegen = require("escodegen");
var estraverse = require("estraverse");

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

// TODO: do more processing on the options array
exports.convert = function(code, options, log) {
    // parse
    var ast = esprima.parse(code, parseOptions);

    // walk ast
    estraverse.replace(ast, {
        leave: callbackReplacer
    });

    estraverse.replace(ast, {
        enter: thenFlattener
    });

    // generate
    // TODO make comments work
    // ast = escodegen.attachComments(ast, ast.comments, ast.tokens);
    return escodegen.generate(ast, options);
};

function callbackReplacer(node, parent, notify) {
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

function hasNodeCallback(node) {
    var args = node.arguments;
    return args.length && args[args.length - 1].type === "FunctionExpression" &&
        args[args.length - 1].params.length === 2;
}

function callbackToThenArguments(callback) {
    var thenArgs = [callback];

    var errorArg = callback.params.shift();

    var errback = getErrorHandler(callback, errorArg);
    if (errback) {
        thenArgs.push(errback);
    }

    return thenArgs;
}

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

function thenFlattener(node, parent, notify) {
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
        return {
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
        };
    }
}

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
