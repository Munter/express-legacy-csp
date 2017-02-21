const express = require('express');
const expect = require('unexpected').clone()
    .use(require('unexpected-express'));
const expressLegacyCsp = require('../');

let userAgentString;
let headerName;
beforeEach(() => {
    userAgentString = undefined;
    headerName = 'Content-Security-Policy';
});

expect.addAssertion('<string> to come out as <string|undefined>', (expect, subject, value) => {
    return expect(
        express()
            .use(expressLegacyCsp())
            .use((req, res, next) => {
                res.setHeader('Content-Security-Policy', subject);
                res.status(200).end();
            }),
        'to yield exchange', {
            request: { headers: { 'User-Agent': userAgentString } },
            response: { headers: { [headerName]: value } }
        }
    );
});

describe('in Safari 8', function () {
    beforeEach(() => {
        userAgentString = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_10_4) AppleWebKit/600.7.12 (KHTML, like Gecko) Version/8.0.7 Safari/600.7.12';
    });

    it('should strip the path from a source expression without a scheme', () => {
        return expect('script-src somewhere.com/with/a/path', 'to come out as', 'script-src somewhere.com');
    });

    it('should strip the path from a source expression with a scheme', () => {
        return expect('script-src https://somewhere.com/with/a/path', 'to come out as', 'script-src https://somewhere.com');
    });

    it('should dedupe after stripping the path', () => {
        return expect('script-src somewhere.com/with/a/path somewhere.com/with/another/path', 'to come out as', 'script-src somewhere.com');
    });
});

describe('in IE10', function () {
    beforeEach(() => {
        userAgentString = 'Mozilla/5.0 (compatible; MSIE 10.0; Windows NT 6.1; Trident/6.0)';
        headerName = 'X-Content-Security-Policy';
    });

    it('should strip the path from a source expression without a scheme', () => {
        return expect('script-src somewhere.com/with/a/path', 'to come out as', 'script-src somewhere.com');
    });
});

describe('in a CSP2 compliant browser', () => {
    beforeEach(() => {
        // Chrome 55
        userAgentString = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/55.0.2883.87 Safari/537.36';
    });

    it('should remove CSP3 constructs', () => {
        return expect("script-src 'unsafe-hashed-attributes'", 'to come out as', "script-src 'unsafe-inline'");
    });

    it('should keep CSP2 constructs', () => {
        return expect('script-src somewhere.com/with/a/path', 'to come out as', 'script-src somewhere.com/with/a/path');
    });
});

describe('in a CSP1 compliant browser', () => {
    beforeEach(() => {
        // Chrome 14
        userAgentString = 'Mozilla/5.0 (Windows NT 6.0; WOW64) AppleWebKit/535.1 (KHTML, like Gecko) Chrome/14.0.835.2 Safari/535.1';
    });

    it('should remove CSP3 and CSP2 constructs', () => {
        return expect("script-src 'unsafe-hashed-attributes' somewhere.com/with/a/path somewhere.com/with/another/path", 'to come out as', "script-src somewhere.com 'unsafe-inline'");
    });
});

describe('in a browser that does not support CSP', function () {
    beforeEach(() => {
        // Chrome 13
        userAgentString = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_6_3) AppleWebKit/535.1 (KHTML, like Gecko) Chrome/13.0.782.220 Safari/535.1';
    });

    it('should remove CSP3 and CSP2 constructs', () => {
        return expect("script-src 'unsafe-hashed-attributes' somewhere.com/with/a/path somewhere.com/with/another/path", 'to come out as', undefined);
    });
});

describe('in an unknown browser', function () {
    beforeEach(() => {
        userAgentString = 'Sunshine, lollipops and rainbows';
    });

    it('should preserve the CSP as-is', function () {
        return expect("script-src 'strict-dynamic'", 'to come out as', "script-src 'strict-dynamic'");
    });
});
