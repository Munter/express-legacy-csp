# express-legacy-csp

[![NPM version](https://badge.fury.io/js/express-legacy-csp.svg)](http://badge.fury.io/js/express-legacy-csp)
[![Build Status](https://travis-ci.org/Munter/express-legacy-csp.svg?branch=master)](https://travis-ci.org/Munter/express-legacy-csp)
[![Coverage Status](https://coveralls.io/repos/github/Munter/express-legacy-csp/badge.svg?branch=master)](https://coveralls.io/github/Munter/express-legacy-csp?branch=master)
[![Dependency Status](https://david-dm.org/Munter/express-legacy-csp.svg)](https://david-dm.org/Munter/express-legacy-csp)

Generating a [content-security-policy](https://www.w3.org/TR/CSP/) that works correctly in all the browsers you support is hard work.

Because of the different level of support of the CSP specifications, and some times even only partial implementations, you will run into situations where you will either need to drop older browser support or implement a less secure policy in order to make a one-size-fits-all policy that includes older browsers.

NOT ANY MORE!

express-legacy-csp is a middleware that sits at the top of your stack and analyses the user agent header and the `Content-Security-Policy` of the response. Based on these two pieces of data it will generate a version of your policy which is specifically tailored to the capabilities of the requesting browser.

This means you can serve [CSP3](https://www.w3.org/TR/CSP3/) with maximum security settings, but still support older versions of Chrome that only support [CSP2](https://www.w3.org/TR/CSP2/), or even older browsers like Safari 6 with [CSP1](https://www.w3.org/TR/CSP1/)-support.

express-legacy-csp fixes other quirks in old implementations, like renaming the header that contains the policy.

Unless a browser's capabilities and quirks are explicitly known, your policy will pass through untouched.

There is a tiny performance bonus of sending fewer bytes over the wire when sending CSP1 instead of CSP2. We have not done any research on the performance improvements this results in. It's most likely that these are negligible.

## How it works

Browser detection is done using [useragent](https://www.npmjs.com/package/useragent). Based on data from [caniuse.com](http://caniuse.com/#search=csp) the decision is made whether to downgrade your policy level or apply other changes.

A CSP version is only deemed supported if the the caniuse data has no notes attached. If the support is none or has notes, the CSP version will be dropped down one level. There is a specific exception for IE, where a non-standard header is needed to get even CSP1 support.

Resolutions that are cached for runtime performance in a production setup:

- Resolving a `User-Agent` string to a browser family and version
- Resolving a browser family and version to header name and CSP capabilities
- Downgrade of a unique CSP to corresponding lower version of the same CSP

### CSP3 to CSP2 downgrade

- ['unsafe-hashed-attributes'](https://www.w3.org/TR/CSP3/#unsafe-hashed-attributes-usage) is replaced with ['unsafe-inline'](https://www.w3.org/TR/CSP2/#source-list-syntax)
- ['strict-dynamic'](https://www.w3.org/TR/CSP3/#strict-dynamic-usage) is replaced with ['unsafe-inline'](https://www.w3.org/TR/CSP2/#source-list-syntax)

### CSP2 to CSP1 downgrade

- All [source-expressions](https://www.w3.org/TR/CSP2/#source_expression) have their paths stripped
- All [nonces](https://www.w3.org/TR/CSP2/#script-src-the-nonce-attribute) and [hashes](https://www.w3.org/TR/CSP2/#source-list-valid-hashes) are replaced with ['unsafe-inline'](https://www.w3.org/TR/CSP2/#source-list-syntax)

## Usage

Put express-legacy-csp in your middleware stack before the middleware
that sets your CSP.

```js
const express = require('express');
const expressLegacyCsp = require('express-legacy-csp');

express()
  .use(expressLegacyCsp())
  .use(someCspGeneratingMiddleware);
```

Both camelCased and kebab-cased directive names are supported, and you
can supply the tokens to add as either a string or an array of strings.

## Licence

[MIT](https://tldrlegal.com/license/mit-license)
