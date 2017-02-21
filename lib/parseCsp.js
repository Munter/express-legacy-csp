const toCamelCase = require('./toCamelCase');

function normalizeFragment(fragment) {
    if (/^'(?:unsafe-inline|unsafe-eval|unsafe-dynamic|unsafe-hash-attributes|self)'$/i.test(fragment)) {
        return fragment.toLowerCase();
    }
    return fragment
        .replace(/^[a-z0-9.+-]+:/i, $0 => $0.toLowerCase())
        .replace(/^'sha(\d+)-/i, '\'sha$1-')
        .replace(/^'nonce-/i, '\'nonce-');
}

module.exports = function parseCsp(cspStr) {
    return cspStr
        .split(/\s*;\s*/)
        .reduce((cspObj, directiveStr) => {
            // If directive value is non-empty
            if (directiveStr.trim()) {
                const [directiveName, ...tokens] = directiveStr.trim().split(/\s+/);
                const camelCasedDirectiveName = toCamelCase(directiveName.toLowerCase());

                cspObj[camelCasedDirectiveName] = tokens.map(normalizeFragment);
            }

            return cspObj;
        }, {});
};
