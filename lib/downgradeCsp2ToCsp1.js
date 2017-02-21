const _ = require('lodash');

const originRegExp = /^(?:([a-z][a-z0-9+.-]+):\/\/)?(\*|(?:\*\.)?[a-z0-9-]+(?:\.[a-z0-9-]+)*)(?::(\d+|\*))?(\/.*)?$/i;

module.exports = function downgradeCsp2ToCsp1(parsedCsp) {
    Object.keys(parsedCsp).forEach(directiveName => {
        if (/Src$/.test(directiveName)) {
            const lengthBefore = parsedCsp[directiveName].length;
            parsedCsp[directiveName] = parsedCsp[directiveName].filter(token => {
                return !/^'(?:nonce|sha\d+-)/i.test(token);
            });
            if (lengthBefore !== parsedCsp[directiveName].length) {
                parsedCsp[directiveName].push("'unsafe-inline'");
            }

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
};
