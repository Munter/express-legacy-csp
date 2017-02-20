# express-legacy-csp

[![NPM version](https://badge.fury.io/js/express-legacy-csp.svg)](http://badge.fury.io/js/express-legacy-csp)
[![Build Status](https://travis-ci.org/Munter/express-legacy-csp.svg?branch=master)](https://travis-ci.org/Munter/express-legacy-csp)
[![Coverage Status](https://coveralls.io/repos/Munter/express-legacy-csp/badge.svg)](https://coveralls.io/r/Munter/express-legacy-csp)
[![Dependency Status](https://david-dm.org/Munter/express-legacy-csp.svg)](https://david-dm.org/Munter/express-legacy-csp)




## Usage

Put express-legacy-csp in your middleware stack before the middleware
that sets your CSP.

```js
require('express')()
    .use(require('express-legacy-csp')());
```

Both camelCased and snake-cased directive names are supported, and you
can supply the tokens to add as either a string or an array of strings.

## Licence

[MIT](https://tldrlegal.com/license/mit-license)
