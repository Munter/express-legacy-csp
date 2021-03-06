const useragent = require('useragent');
const memoizeSync = require('memoizesync');
const downgradeCsp3ToCsp2 = require('./downgradeCsp3ToCsp2');
const downgradeCsp2ToCsp1 = require('./downgradeCsp2ToCsp1');
require('useragent/features');
const parseCsp = require('./parseCsp');
const preprocessCaniuseData = require('./preprocessCaniuseData');

const checkSupportedByLevelAndBrowserAndVersion = {
  1: preprocessCaniuseData(
    require('caniuse-db/features-json/contentsecuritypolicy.json').stats
  ),
  2: preprocessCaniuseData(
    require('caniuse-db/features-json/contentsecuritypolicy2.json').stats
  )
};

const maxCspLevel = Math.max(
  ...Object.keys(checkSupportedByLevelAndBrowserAndVersion).map(levelStr =>
    parseInt(levelStr, 10)
  )
);

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
  return Object.keys(parsedCsp).reduce((text, directiveName) => {
    text += (text ? '; ' : '') + fromCamelCase(directiveName);
    if (parsedCsp[directiveName].length > 0) {
      text += ` ${parsedCsp[directiveName].join(' ')}`;
    }

    return text;
  }, '');
}

const lookupTargetCspLevelInCanIUseDb = memoizeSync((family, major, minor) => {
  const caniuseId = caniuseIdByAgentFamily[family];
  if (caniuseId) {
    let seenNo = false;
    for (let cspLevel = maxCspLevel; cspLevel > 0; cspLevel -= 1) {
      const isSupported = checkSupportedByLevelAndBrowserAndVersion[cspLevel](
        caniuseId,
        major,
        minor
      );
      if (isSupported) {
        return cspLevel;
      } else if (isSupported === false) {
        seenNo = true;
      }
    }
    if (seenNo) {
      return 0;
    }
  }
});

const downgradeAndSerializeCsp = memoizeSync((cspStr, targetCspLevel) => {
  // Process multiple comma-separated policies separately:
  return cspStr
    .split(/,\s*/)
    .map(cspStr => {
      let csp = downgradeCsp3ToCsp2(parseCsp(cspStr));
      if (targetCspLevel < 2) {
        csp = downgradeCsp2ToCsp1(csp);
      }
      return serializeCsp(csp);
    })
    .join(', ');
});

module.exports = (config = {}) => {
  return (req, res, next) => {
    const agent = useragent.lookup(req.headers['user-agent']);
    const oldWriteHead = res.writeHead;
    res.writeHead = (...args) => {
      [
        'Content-Security-Policy',
        'Content-Security-Policy-Report-Only'
      ].forEach(headerName => {
        let existingCspHeaderValues = res.getHeader(headerName);

        if (existingCspHeaderValues) {
          if (!Array.isArray(existingCspHeaderValues)) {
            existingCspHeaderValues = [existingCspHeaderValues];
          }
          const reportOnlySuffix = /-Report-Only$/.test(headerName)
            ? '-Report-Only'
            : '';
          let targetCspLevel;
          let newHeaderName;

          if (agent.family === 'IE' && agent.satisfies('11 || 10')) {
            newHeaderName = `X-Content-Security-Policy${reportOnlySuffix}`;
            targetCspLevel = 1;
          } else if (agent.family === 'Safari' && agent.satisfies('6.1 || 6')) {
            targetCspLevel = 1;
            newHeaderName = `X-Webkit-CSP${reportOnlySuffix}`;
          } else if (agent.family === 'Firefox' && agent.satisfies('>= 45')) {
            targetCspLevel = 2;
          } else {
            targetCspLevel = lookupTargetCspLevelInCanIUseDb(
              agent.family,
              agent.major,
              agent.minor
            );
          }

          if (targetCspLevel === 0) {
            res.removeHeader(headerName);
          } else if (targetCspLevel > 0) {
            res.removeHeader(headerName);
            existingCspHeaderValues.forEach(existingCspHeaderValue => {
              res.append(
                newHeaderName || headerName,
                downgradeAndSerializeCsp(existingCspHeaderValue, targetCspLevel)
              );
            });
          }
        }
      });
      return oldWriteHead.call(res, ...args);
    };
    next();
  };
};
