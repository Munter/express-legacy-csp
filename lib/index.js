const useragent = require('useragent');
const downgradeCsp3ToCsp2 = require('./downgradeCsp3ToCsp2');
const downgradeCsp2ToCsp1 = require('./downgradeCsp2ToCsp1');
require('useragent/features');
const toCamelCase = require('./toCamelCase');
const parseCsp = require('./parseCsp');

function fromCamelCase(str) {
    return str.replace(/[A-Z]/g, $0 => `-${$0.toLowerCase()}`);
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
    return Object.keys(parsedCsp)
        .reduce((text, directiveName) => {
            text += (text ? '; ' : '') + fromCamelCase(directiveName);
            if (parsedCsp[directiveName].length > 0) {
                text += ' ' + parsedCsp[directiveName].join(' ');
            }

            return text;
        }, '');
}

module.exports = (config = {}) => {
    return (req, res, next) => {
        const agent = useragent.lookup(req.headers['user-agent']);
        const oldWriteHead = res.writeHead;
        res.writeHead = (...args) => {
            const existingCspHeaderValue = res.getHeader('Content-Security-Policy');
            if (existingCspHeaderValue) {
                const parsedCsp = parseCsp(existingCspHeaderValue);
                let targetCspLevel;
                let newHeaderName;
                if (agent.family === 'Safari') {
                    if (agent.satisfies('8 || 9')) {
                        targetCspLevel = 1;
                        res.setHeader('Content-Security-Policy', serializeCsp(downgradeCsp2ToCsp1(parsedCsp)));
                    }

                    if (agent.satisfies('< 10')) {
                        // CSP v1

                        if (agent.satisfies('6.1 - 6')) {
                            newHeaderName = 'X-Webkit-CSP';
                        }

                        if (agent.satisfies('< 6')) {
                            // Delete CSP header
                            res.removeHeader('Content-Security-Policy');
                        }
                    }
                }

                if (agent.family === 'Chrome') {
                    if (agent.satisfies('>= 40')) {
                        targetCspLevel = 2;
                    } else if (agent.satisfies('>= 14')) {
                        targetCspLevel = 1;
                    } else {
                        targetCspLevel = 0;
                    }
                }

                if (agent.family === 'mobile_safari') {
                    if (agent.satisfies('< 9.3')) {
                        // CSP v1

                        if (agent.satisfies('6.1')) {
                            newHeaderName = 'X-Webkit-CSP';
                            targetCspLevel = 1;
                        }

                        if (agent.satisfies('< 6.1')) {
                            targetCspLevel = 0;
                        }
                    }
                }

                if (agent.family === 'IE') {
                    if (agent.satisfies('< 15')) {
                        // CSP v1

                        if (agent.satisfies('11 || 10')) {
                            newHeaderName = 'X-Content-Security-Policy';
                            targetCspLevel = 1;
                        }

                        if (agent.satisfies('< 10')) {
                            targetCspLevel = 0;
                        }
                    }
                }

                if (targetCspLevel === 0) {
                    res.removeHeader('Content-Security-Policy');
                } else if (targetCspLevel > 0) {
                    let downgradedCsp = parsedCsp;
                    if (targetCspLevel < 3) {
                        downgradedCsp = downgradeCsp3ToCsp2(downgradedCsp);
                    }
                    if (targetCspLevel < 2) {
                        downgradedCsp = downgradeCsp2ToCsp1(downgradedCsp);
                    }
                    const serializedCsp = serializeCsp(downgradedCsp);
                    if (newHeaderName) {
                        res.removeHeader('Content-Security-Policy');
                        res.setHeader(newHeaderName, serializedCsp);
                    } else {
                        res.setHeader('Content-Security-Policy', serializedCsp);
                    }
                }
            }
            return oldWriteHead.call(res, ...args);
        };
        next();
    };
};
