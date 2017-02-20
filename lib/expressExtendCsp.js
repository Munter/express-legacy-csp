function toCamelCase(str) {
    return str.replace(/-([a-z])/g, function ($0, ch) {
        return ch.toUpperCase();
    });
}

function fromCamelCase(str) {
    return str.replace(/[A-Z]/g, function ($0) {
        return '-' + $0.toLowerCase();
    });
}

var fallsBackToDefaultSrcByDirective = {};

[
    'connect-src',
    'font-src',
    'frame-src',
    'img-src',
    'manifest-src',
    'media-src',
    'object-src',
    'script-src',
    'style-src',
    'worker-src'
].forEach(function (directive) {
    fallsBackToDefaultSrcByDirective[directive] = fallsBackToDefaultSrcByDirective[toCamelCase(directive)] = true;
});

function normalizeFragment(fragment) {
    if (/^'(?:unsafe-inline|unsafe-eval|unsafe-dynamic|unsafe-hash-attributes|self)'$/i.test(fragment)) {
        return fragment.toLowerCase();
    }
    return fragment.replace(/^[a-z0-9.+-]+:/i, function ($0) {
        return $0.toLowerCase();
    }).replace(/^'sha(\d+)-/i, '\'sha$1-').replace(/^'nonce-/i, '\'nonce-');
}

function parseCsp(cspStr) {
    var parseTree = {};
    cspStr.split(/\s*;\s*/).forEach(function (directiveStr, i) {
        if (!/^\s*$/.test(directiveStr)) {
            var fragments = directiveStr.replace(/^\s+|\s+$/g, '').split(/\s+/);
            var directiveName = toCamelCase(fragments.shift().toLowerCase());
            parseTree[directiveName] = fragments.map(normalizeFragment);
        }
    }, this);
    return parseTree;
}

function serializeCsp(parsedCsp) {
    let text = '';
    Object.keys(parsedCsp).forEach(directiveName => {
        text += (text ? '; ' : '') + fromCamelCase(directiveName);
        if (parsedCsp[directiveName].length > 0) {
            text += ' ' + parsedCsp[directiveName].join(' ');
        }
    });
    return text;
}

module.exports = config => {
    config = config || {};
    let addTokensByDirective;
    if (config.add) {
        addTokensByDirective = {};
        // Copy config.add to addTokensByDirective, normalizing the keys so they're camel cased
        // and the values to be arrays of tokens:
        Object.keys(config.add).forEach(key => {
            let tokens = config.add[key];
            if (!Array.isArray(tokens)) {
                tokens = [tokens];
            }
            addTokensByDirective[toCamelCase(key)] = tokens;
        });
    }
    return (req, res, next) => {
        if (addTokensByDirective) {
            let oldWriteHead = res.writeHead;
            res.writeHead = (...args) => {
                var existingCspHeaderValue = res.getHeader('Content-Security-Policy');
                if (existingCspHeaderValue) {
                    const parsedCsp = parseCsp(existingCspHeaderValue);
                    Object.keys(addTokensByDirective).forEach(directiveName => {
                        var addTokens = addTokensByDirective[directiveName];
                        if (parsedCsp[directiveName]) {
                            if (parsedCsp[directiveName].length === 1 && parsedCsp[directiveName][0] === "'none'") {
                                parsedCsp[directiveName] = [...addTokens];
                            } else {
                                parsedCsp[directiveName].push(...addTokens);
                            }
                        } else if (fallsBackToDefaultSrcByDirective[directiveName] && parsedCsp.defaultSrc && (parsedCsp.defaultSrc.length !== 1 || parsedCsp.defaultSrc[0] !== "'none'")) {
                            parsedCsp[directiveName] = [...parsedCsp.defaultSrc, ...addTokens];
                        } else {
                            // Deliberately not taking a copy here as we're not going to process it further before serializing:
                            parsedCsp[directiveName] = addTokens;
                        }
                    });
                    res.setHeader('Content-Security-Policy', serializeCsp(parsedCsp));
                }
                return oldWriteHead.call(res, ...args);
            };
        }
        next();
    };
};
