const useragent = require('useragent');
const memoizeSync = require('memoizesync');
const downgradeCsp3ToCsp2 = require('./downgradeCsp3ToCsp2');
const downgradeCsp2ToCsp1 = require('./downgradeCsp2ToCsp1');
require('useragent/features');
const parseCsp = require('./parseCsp');

const cspStatsByLevel = {
    1: require('caniuse-db/features-json/contentsecuritypolicy.json').stats,
    2: require('caniuse-db/features-json/contentsecuritypolicy2.json').stats
};

try {
    cspStatsByLevel[3] = require('caniuse-db/features-json/contentsecuritypolicy3.json').stats;
} catch (e) {}

const maxCspLevel = Math.max(...Object.keys(cspStatsByLevel).map(levelStr => parseInt(levelStr, 10)));

const caniuseIdByAgentFamily = {
    IE: 'ie',
    Edge: 'edge',
    'Mobile Safari UI/WKWebView': 'ios_saf',
    'Mobile Safari': 'ios_saf',
    Safari: 'safari',
    Chrome: 'chrome',
    Opera: 'opera',
    Firefox: 'firefox',
    'Opera Mini': 'op_mini',
    'BlackBerry WebKit': 'bb',
    'Opera Mobile': 'op_mob',
    'Chrome Mobile': 'and_chr'
    // : 'android',
    // : 'and_ff',
    // : 'ie_mob',
    // : 'and_uc',
    // : 'samsung',
    // : 'and_qq',
    // : 'ios_saf'
};

function fromCamelCase(str) {
    return str.replace(/[A-Z]/g, $0 => `-${$0.toLowerCase()}`);
}

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

const lookupTargetCspLevelInCanIUseDb = memoizeSync((family, major, minor) => {
    let targetCspLevel;
    let caniuseId = caniuseIdByAgentFamily[family];
    if (caniuseId === 'ie' && parseInt(major, 10) >= 12) {
        caniuseId = 'edge';
    }
    if (caniuseId) {
        let seenNo = false;
        for (let cspLevel = maxCspLevel ; cspLevel > 0 ; cspLevel -= 1) {
            const cspIsSupportedByVersion = cspStatsByLevel[cspLevel][caniuseId];
            if (!cspIsSupportedByVersion) {
                continue;
            }
            const majorMinorVersion = major + '.' + minor;
            const cspIsSupportedInMinorVersion = cspIsSupportedByVersion[majorMinorVersion];
            if (cspIsSupportedInMinorVersion) {
                if (/^y/.test(cspIsSupportedInMinorVersion)) {
                    targetCspLevel = cspLevel;
                    break;
                } else {
                    seenNo = true;
                }
            } else {
                const cspIsSupportedInMajorVersion = cspIsSupportedByVersion[major];
                if (cspIsSupportedInMajorVersion) {
                    if (/^y/.test(cspIsSupportedInMajorVersion)) {
                        targetCspLevel = cspLevel;
                        break;
                    } else {
                        seenNo = true;
                    }
                }
            }
        }
        if (!targetCspLevel && seenNo) {
            return 0;
        }
    }
    return targetCspLevel;
});

const downgradeAndSerializeCsp = memoizeSync((cspStr, targetCspLevel) => {
    const parsedCsp = parseCsp(cspStr);
    let downgradedCsp = parsedCsp;
    if (targetCspLevel < 3) {
        downgradedCsp = downgradeCsp3ToCsp2(downgradedCsp);
    }
    if (targetCspLevel < 2) {
        downgradedCsp = downgradeCsp2ToCsp1(downgradedCsp);
    }
    return serializeCsp(downgradedCsp);
});

module.exports = (config = {}) => {
    return (req, res, next) => {
        const agent = useragent.lookup(req.headers['user-agent']);
        const oldWriteHead = res.writeHead;
        res.writeHead = (...args) => {
            ['Content-Security-Policy', 'Content-Security-Policy-Report-Only'].forEach(headerName => {
                let existingCspHeaderValues = res.getHeader(headerName);

                if (existingCspHeaderValues) {
                    if (!Array.isArray(existingCspHeaderValues)) {
                        existingCspHeaderValues = [ existingCspHeaderValues ];
                    }
                    let reportOnlySuffix = /-Report-Only$/.test(headerName) ? '-Report-Only' : '';
                    let targetCspLevel;
                    let newHeaderName;

                    if (agent.family === 'IE' && agent.satisfies('11 || 10')) {
                        newHeaderName = 'X-Content-Security-Policy' + reportOnlySuffix;
                        targetCspLevel = 1;
                    } else if (agent.family === 'Safari' && agent.satisfies('6.1 || 6')) {
                        targetCspLevel = 1;
                        newHeaderName = 'X-Webkit-CSP' + reportOnlySuffix;
                    } else if (agent.family === 'Firefox' && agent.satisfies('>= 45')) {
                        targetCspLevel = 2;
                    } else {
                        targetCspLevel = lookupTargetCspLevelInCanIUseDb(agent.family, agent.major, agent.minor);
                    }

                    if (targetCspLevel === 0) {
                        res.removeHeader(headerName);
                    } else if (targetCspLevel > 0) {
                        res.removeHeader(headerName);
                        existingCspHeaderValues.forEach(existingCspHeaderValue => {
                            res.append(newHeaderName || headerName, downgradeAndSerializeCsp(existingCspHeaderValue, targetCspLevel));
                        });
                    }
                }
            });
            return oldWriteHead.call(res, ...args);
        };
        next();
    };
};
