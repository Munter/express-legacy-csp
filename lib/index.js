const useragent = require('useragent');
require('useragent/features');
const _ = require('lodash');

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

let originRegExp = /^(?:([a-z][a-z0-9+.-]+):\/\/)?(\*|(?:\*\.)?[a-z0-9-]+(?:\.[a-z0-9-]+)*)(?::(\d+|\*))?(\/.*)?$/i;

function downgradeCsp2ToCsp1(parsedCsp) {
    Object.keys(parsedCsp).forEach(directiveName => {
        if (/Src$/.test(directiveName)) {
            parsedCsp[directiveName] = _.uniq(parsedCsp[directiveName].map(
                token => {
                    const matchOrigin = token.match(originRegExp);
                    if (matchOrigin) {
                        var scheme = matchOrigin[1];
                        var host = matchOrigin[2];
                        var port = matchOrigin[3];
                        return (scheme ? scheme + '://' : '') + host + (port ? ':' + port : '');
                    } else {
                        return token;
                    }
                }
            ));
        }
    });
    return parsedCsp;
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

    return (req, res, next) => {
        const agent = useragent.lookup(req.headers['user-agent']);
        const oldWriteHead = res.writeHead;
res.setHeader('Detected-User-Agent', JSON.stringify(agent));
        res.writeHead = (...args) => {
            const existingCspHeaderValue = res.getHeader('Content-Security-Policy');
            let newCsp;
            if (existingCspHeaderValue) {
                const parsedCsp = parseCsp(existingCspHeaderValue);
                if (agent.family === 'Safari') {

                    if (agent.satisfies('8 || 9')) {
                        downgradeCsp2ToCsp1(parsedCsp);
                        res.setHeader('Content-Security-Policy', serializeCsp(parsedCsp));
                    }


                    if (agent.satisfies('< 10')) {
                        // CSP v1

                        if (agent.satisfies('6.1 - 6')) {
                            res.removeHeader('Content-Security-Policy');
                            res.setHeader('X-Webkit-CSP', newCsp);
                        }

                        if (agent.satisfies('< 6')) {
                            // Delete CSP header
                            res.removeHeader('Content-Security-Policy');
                        }
                    }
                }

                if (agent.family === 'mobile_safari') {
                    if (agent.satisfies('< 9.3')) {
                        // CSP v1

                        if (agent.satisfies('6.1')) {
                            res.removeHeader('Content-Security-Policy');
                            res.setHeader('X-Webkit-CSP', newCsp);
                        }

                        if (agent.satisfies('< 6.1')) {
                            // Delete CSP header
                            res.removeHeader('Content-Security-Policy');
                        }
                    }
                }

                if (agent.family === 'IE') {
                    if (agent.satisfies('< 15')) {
                        // CSP v1

                        if (agent.satisfies('11 || 10')) {
                            res.removeHeader('Content-Security-Policy');
                            res.setHeader('X-Content-Security-Policy', serializeCsp(downgradeCsp2ToCsp1(parsedCsp)));
                        }

                        if (agent.satisfies('< 10')) {
                            // Delete CSP header
                            res.removeHeader('Content-Security-Policy');
                        }
                    }
                }
            }
            return oldWriteHead.call(res, ...args);
        };
        next();
    };
};
