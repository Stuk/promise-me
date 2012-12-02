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
    // console.log(ast);

    // walk ast
    estraverse.replace(ast, {
        enter: replacer
    });

    // generate
    // TODO make comments work
    ast = escodegen.attachComments(ast, ast.comments, ast.tokens);
    return escodegen.generate(ast);
};

function replacer(node, _, notify) {

}
