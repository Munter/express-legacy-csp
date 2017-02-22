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

expect.addAssertion('<string|array> to come out as <string|array|undefined>', (expect, subject, value) => {
    return expect(
        express()
            .use(expressLegacyCsp())
            .use((req, res, next) => {
                if (Array.isArray(subject)) {
                    subject.forEach(headerValue => res.append('Content-Security-Policy', headerValue));
                } else {
                    res.setHeader('Content-Security-Policy', subject);
                }
                res.status(200).end();
            }),
        'to yield exchange', {
            request: { headers: { 'User-Agent': userAgentString } },
            response: { headers: { [headerName]: value } }
        }
    );
});

describe('with multiple CSP headers', function () {
    // Safari 7
    beforeEach(() => {
        userAgentString = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_9_3) AppleWebKit/537.75.14 (KHTML, like Gecko) Version/7.0.3 Safari/7046A194A';
    });
    it('should process all headers', function () {
        return expect([
            'script-src somewhere.com/with/a/path',
            'script-src \'nonce-foo\''
        ], 'to come out as', [
            'script-src somewhere.com',
            'script-src \'unsafe-inline\''
        ]);
    });
});

describe('in Safari 10', function () {
    beforeEach(() => {
        userAgentString = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_12_1) AppleWebKit/602.2.14 (KHTML, like Gecko) Version/10.0.1 Safari/602.2.14';
    });

    it('should downgrade to CSP 2', () => {
        return expect("script-src somewhere.com/with/a/path 'strict-dynamic'", 'to come out as', "script-src somewhere.com/with/a/path 'unsafe-inline'");
    });
});

describe('in Safari 7', function () {
    beforeEach(() => {
        userAgentString = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_9_3) AppleWebKit/537.75.14 (KHTML, like Gecko) Version/7.0.3 Safari/7046A194A';
    });

    it('should downgrade to CSP 1', () => {
        return expect("script-src somewhere.com/with/a/path 'strict-dynamic'", 'to come out as', "script-src somewhere.com 'unsafe-inline'");
    });
});

describe('in Safari 6', function () {
    beforeEach(() => {
        userAgentString = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_8_2) AppleWebKit/536.26.17 (KHTML, like Gecko) Version/6.0.2 Safari/536.26.17';
        headerName = 'X-Webkit-CSP';
    });

    it('should downgrade to CSP 1 and switch to the X-Webkit-CSP header', () => {
        return expect("script-src somewhere.com/with/a/path 'strict-dynamic'", 'to come out as', "script-src somewhere.com 'unsafe-inline'");
    });
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

describe('in Safari 5', function () {
    beforeEach(() => {
        userAgentString = 'Mozilla/5.0 (Macintosh; U; Intel Mac OS X 10_6_8; de-at) AppleWebKit/533.21.1 (KHTML, like Gecko) Version/5.0.5 Safari/533.21.1';
    });

    it('should remove the Content-Security-Policy header', () => {
        return expect("script-src somewhere.com/with/a/path 'strict-dynamic'", 'to come out as', undefined);
    });
});

describe('in Firefox 51', function () {
    beforeEach(() => {
        userAgentString = 'Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:51.0) Gecko/20100101 Firefox/51.0';
    });

    it('should not have CSP level 2 constructs downgraded, even though caniusedb says "a #7"', function () {
        return expect('script-src somewhere.com/with/a/path', 'to come out as', 'script-src somewhere.com/with/a/path');
    });
});

describe('in Edge 13', function () {
    beforeEach(() => {
        userAgentString = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/46.0.2486.0 Safari/537.36 Edge/13.10586';
    });

    it('should have CSP level 2 constructs downgraded', function () {
        return expect("script-src somewhere.com/with/a/path 'sha256-XeYlw2NVzOfB1UCIJqCyGr+0n7bA4fFslFpvKu84IAw='", 'to come out as', "script-src somewhere.com 'unsafe-inline'");
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
