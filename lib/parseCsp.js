const toCamelCase = require('./toCamelCase');

function normalizeFragment(fragment) {
    if (/^'(?:unsafe-inline|unsafe-eval|unsafe-dynamic|unsafe-hash-attributes|self)'$/i.test(fragment)) {
        return fragment.toLowerCase();
    }
    return fragment.replace(/^[a-z0-9.+-]+:/i, function ($0) {
        return $0.toLowerCase();
    }).replace(/^'sha(\d+)-/i, '\'sha$1-').replace(/^'nonce-/i, '\'nonce-');
}

module.exports = function parseCsp(cspStr) {
    var parseTree = {};
    cspStr.split(/\s*;\s*/).forEach(function (directiveStr, i) {
        if (!/^\s*$/.test(directiveStr)) {
            var fragments = directiveStr.replace(/^\s+|\s+$/g, '').split(/\s+/);
            var directiveName = toCamelCase(fragments.shift().toLowerCase());
            parseTree[directiveName] = fragments.map(normalizeFragment);
        }
    }, this);
    return parseTree;
};
