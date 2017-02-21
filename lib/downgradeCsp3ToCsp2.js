const _ = require('lodash');

module.exports = function downgradeCsp3ToCsp2(parsedCsp) {
    Object.keys(parsedCsp).forEach(directiveName => {
        if (/Src$/.test(directiveName)) {
            const lengthBefore = parsedCsp[directiveName].length;
            parsedCsp[directiveName] = parsedCsp[directiveName].filter(token => {
                return !/^'(?:unsafe-hashed-attributes|strict-dynamic)'$/i.test(token);
            });
            if (lengthBefore !== parsedCsp[directiveName].length) {
                parsedCsp[directiveName].push("'unsafe-inline'");
            }
            parsedCsp[directiveName] = _.uniq(parsedCsp[directiveName]);
        }
    });
    return parsedCsp;
};
