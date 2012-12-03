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
    var errorArg = callback.params.shift();
    // TODO add reject callback
    return [callback];
}
