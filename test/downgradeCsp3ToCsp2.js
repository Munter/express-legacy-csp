const expect = require('unexpected').clone();
const downgradeCsp3ToCsp2 = require('../lib/downgradeCsp3ToCsp2');
const parseCsp = require('../lib/parseCsp');

function normalizeParsedCsp(parsedCsp) {
  const result = {};
  Object.keys(parsedCsp).forEach(key => {
    if (Array.isArray(parsedCsp[key])) {
      result[key] = [].concat(parsedCsp[key]).sort();
    } else if (parsedCsp[key]) {
      result[key] = [parsedCsp[key]];
    }
  });
  return result;
}

expect.addAssertion(
  '<object|string> to come out as <object|string>',
  (expect, subject, value) => {
    if (typeof subject === 'string') {
      subject = parseCsp(subject);
    }
    if (typeof value === 'string') {
      value = parseCsp(value);
    }
    expect(
      normalizeParsedCsp(downgradeCsp3ToCsp2(normalizeParsedCsp(subject))),
      'to satisfy',
      normalizeParsedCsp(value)
    );
  }
);

describe('downgradeCsp3ToCsp2', () => {
  it('should leave all directives not ending in -src untouched', () => {
    expect(
      'report-uri http://mntr.dk',
      'to come out as',
      'report-uri http://mntr.dk'
    );
  });

  it("should replace 'unsafe-hashed-attributes' with 'unsafe-inline'", () => {
    expect(
      "script-src 'unsafe-hashed-attributes'",
      'to come out as',
      "script-src 'unsafe-inline'"
    );
  });

  it("should leave 'unsafe-inline' when removing 'unsafe-hashed-attributes'", () => {
    expect(
      "script-src 'unsafe-inline' 'unsafe-hashed-attributes'",
      'to come out as',
      "script-src 'unsafe-inline'"
    );
  });

  it("should leave 'nonce-...'", () => {
    expect(
      "script-src 'nonce-foo'",
      'to come out as',
      "script-src 'nonce-foo'"
    );
  });

  it("should leave 'sha...'", () => {
    expect(
      "script-src 'sha256-XeYlw2NVzOfB1UCIJqCyGr+0n7bA4fFslFpvKu84IAw='",
      'to come out as',
      "script-src 'sha256-XeYlw2NVzOfB1UCIJqCyGr+0n7bA4fFslFpvKu84IAw='"
    );
  });

  it("should replace 'strict-dynamic' with 'unsafe-inline'", () => {
    expect(
      "script-src 'strict-dynamic'",
      'to come out as',
      "script-src 'unsafe-inline'"
    );
  });

  it("should leave 'unsafe-inline' when removing 'strict-dynamic'", () => {
    expect(
      "script-src 'unsafe-inline' 'strict-dynamic'",
      'to come out as',
      "script-src 'unsafe-inline'"
    );
  });
});
