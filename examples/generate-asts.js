#!/usr/bin/env node

var fs = require("fs");
var esprima = require("esprima");


function generateAst(js) {
    return JSON.stringify(
        esprima.parse(js),
        null, 4
    );
}

function transform(name) {
    var content = generateAst(fs.readFileSync(name + ".js", "utf8"));
    fs.writeFileSync(name + ".ast", content, "utf8");
}

transform("before");
transform("after");
