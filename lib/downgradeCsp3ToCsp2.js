const omit = require('lodash.omit');

module.exports = function downgradeCsp3ToCsp2(parsedCsp) {
  var filteredCsp = omit(parsedCsp, ['manifestSrc', 'workerSrc', 'reportTo']);

  return Object.keys(filteredCsp)
    .filter(directiveName => /Src$/.test(directiveName))
    .reduce((newCsp, directiveName) => {
      const oldValue = parsedCsp[directiveName];
      // Remove unsafe-hashed-attributes and strict-dynamic
      const newValue = parsedCsp[directiveName].filter(
        token => !/^'(?:unsafe-hashed-attributes|strict-dynamic)'$/i.test(token)
      );

      if (oldValue.length !== newValue.length) {
        newValue.push("'unsafe-inline'");
      }

      newCsp[directiveName] = Array.from(new Set(newValue));

      return newCsp;
    }, filteredCsp);
};
