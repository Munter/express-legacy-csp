const useragent = require('useragent');
const downgradeCsp2ToCsp1 = require('./downgradeCsp2ToCsp1');
require('useragent/features');
const toCamelCase = require('./toCamelCase');
const parseCsp = require('./parseCsp');

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
