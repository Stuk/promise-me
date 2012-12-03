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

exports.convert = function(code) {
    // parse
    var ast = esprima.parse(code, parseOptions);
    // console.log(JSON.stringify(ast));
    // walk ast
    estraverse.replace(ast, {
        leave: replacer
    });

    // generate
    // TODO make comments work
    ast = escodegen.attachComments(ast, ast.comments, ast.tokens);
    return escodegen.generate(ast);
};

function replacer(node, parent, notify) {
    if(node.type === "CallExpression" && hasNodeCallback(node)) {
        var args = node.arguments;
        var fn = node;
        var callback = args.pop();

        return {
            "type": "CallExpression",
            "callee": {
                "type": "MemberExpression",
                "computed": false,
                "object": fn,
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
    // TODO check callback has two arguments
    return args.length && args[args.length - 1].type === "FunctionExpression";
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
