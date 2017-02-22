const expect = require('unexpected').clone();
const downgradeCsp2ToCsp1 = require('../lib/downgradeCsp2ToCsp1');
const parseCsp = require('../lib/parseCsp');

function normalizeParsedCsp(parsedCsp) {
    const result = {};
    Object.keys(parsedCsp).forEach(key => {
        if (Array.isArray(parsedCsp[key])) {
            result[key] = [].concat(parsedCsp[key]).sort();
        } else if (parsedCsp[key]) {
            result[key] = [ parsedCsp[key] ];
        }
    });
    return result;
}

expect.addAssertion('<object|string> to come out as <object|string>', (expect, subject, value) => {
    if (typeof subject === 'string') {
        subject = parseCsp(subject);
    }
    if (typeof value === 'string') {
        value = parseCsp(value);
    }
    expect(normalizeParsedCsp(downgradeCsp2ToCsp1(normalizeParsedCsp(subject))), 'to satisfy', normalizeParsedCsp(value));
});

describe('downgradeCsp2ToCsp1', () => {
    it('should leave all directives not ending in -src untouched', () => {
        expect('report-uri http://mntr.dk', 'to come out as', 'report-uri http://mntr.dk');
    });

    it('should leave unsafe-inline', () => {
        expect("script-src 'unsafe-inline'", 'to come out as', "script-src 'unsafe-inline'");
    });

    it('should keep unsafe-inline when and drop nonces and hashes', () => {
        expect("script-src 'sha256-XeYlw2NVzOfB1UCIJqCyGr+0n7bA4fFslFpvKu84IAw=' 'unsafe-inline' 'nonce-foo'", 'to come out as', "script-src 'unsafe-inline'");
    });

    it('should add unsafe-inline when nonces and hashes are dropped', () => {
        expect("script-src 'sha256-XeYlw2NVzOfB1UCIJqCyGr+0n7bA4fFslFpvKu84IAw=' 'nonce-foo'", 'to come out as', "script-src 'unsafe-inline'");
    });

    it('should strip the path from a source expression without a scheme', () => {
        expect('script-src somewhere.com/with/a/path', 'to come out as', 'script-src somewhere.com');
    });

    it('should strip the path from a source expression with a scheme', () => {
        expect('script-src https://somewhere.com/with/a/path', 'to come out as', 'script-src https://somewhere.com');
    });

    it('should dedupe after stripping the path', () => {
        expect('script-src somewhere.com/with/a/path somewhere.com/with/another/path', 'to come out as', 'script-src somewhere.com');
    });
});
