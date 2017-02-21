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

expect.addAssertion('<string> to come out as <string>', (expect, subject, value) => {
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
    beforeEach(function () {
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
    beforeEach(function () {
        userAgentString = 'Mozilla/5.0 (compatible; MSIE 10.0; Windows NT 6.1; Trident/6.0)';
        headerName = 'X-Content-Security-Policy';
    });

    it('should strip the path from a source expression without a scheme', () => {
        return expect('script-src somewhere.com/with/a/path', 'to come out as', 'script-src somewhere.com');
    });
});