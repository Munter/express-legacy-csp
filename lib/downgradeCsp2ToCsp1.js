const originRegExp = /^(?:([a-z][a-z0-9+.-]+):\/\/)?(\*|(?:\*\.)?[a-z0-9-]+(?:\.[a-z0-9-]+)*)(?::(\d+|\*))?(\/.*)?$/i;

function stripPathsFromSourceExpression(sourceExpression) {
    const matchOrigin = sourceExpression.match(originRegExp);
    if (matchOrigin) {
        var scheme = matchOrigin[1];
        var host = matchOrigin[2];
        var port = matchOrigin[3];
        return (scheme ? `${scheme}://` : '') + host + (port ? `:${port}` : '');
    } else {
        return sourceExpression;
    }
}

module.exports = function downgradeCsp2ToCsp1(parsedCsp) {
    return Object.keys(parsedCsp)
        .filter(directiveName => /Src$/.test(directiveName))
        .reduce((newCsp, directiveName) => {
            const oldValue = parsedCsp[directiveName];
            // Filter away nonces and hashes
            const newValue = oldValue.filter(
                token => !/^'(?:nonce|sha\d+-)/i.test(token)
            );

            // If nonces or hashes were encountered, add 'unsafe-inline'
            if (newValue.length !== oldValue.length) {
                newValue.push("'unsafe-inline'");
            }

            // Strip paths from source expressions and remove duplicates
            newCsp[directiveName] = Array.from(
                new Set(newValue.map(stripPathsFromSourceExpression))
            );

            return newCsp;
        }, Object.assign({}, parsedCsp));
};
