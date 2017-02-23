const expect = require('unexpected').clone();
const preprocessCaniuseData = require('../lib/preprocessCaniuseData');

expect.addAssertion('<object> [not] to support <string> <number> <number> <number?>', (expect, subject, caniuseId, major, minor, patch) =>
    expect(preprocessCaniuseData(subject)(caniuseId, major, minor, patch), '[not] to be true'));

expect.addAssertion('<object> [not] to be undecided about <string> <number> <number> <number?>', (expect, subject, caniuseId, major, minor, patch) => {
    expect.errorMode = 'nested';
    return expect(preprocessCaniuseData(subject)(caniuseId, major, minor, patch), '[not] to be undefined');
});

describe('preprocessCaniuseData', function () {
    it('should understand all:"y"', function () {
        expect({ie: { all: 'y' }}, 'to support', 'ie', 11, 0);
    });

    it('should understand all:"n"', function () {
        expect({ie: { all: 'n' }}, 'not to support', 'ie', 11, 0);
    });

    it('should map a value of "y" to true', function () {
        expect({ie: { '11': 'y' }}, 'to support', 'ie', 11, 0);
    });

    it('should map a value of "y #..." to true', function () {
        expect({ie: { '11': 'y #4' }}, 'to support', 'ie', 11, 0);
    });

    it('should map a value of "a #..." to false', function () {
        expect({ie: { '11': 'a #2' }}, 'not to support', 'ie', 11, 0);
    });

    it('should map a value of "n" to false', function () {
        expect({ie: { '11': 'n' }}, 'not to support', 'ie', 11, 0);
    });

    it('should let exact major.minor versions through', function () {
        expect({ie: { '11.1': 'y' }}, 'to support', 'ie', 11, 1)
            .and('to be undecided about', 'ie', 11, 0);
    });

    it('should let exact major.minor.patch versions through', function () {
        expect({ie: { '11.1.2': 'y' }}, 'to support', 'ie', 11, 1, 2)
            .and('to be undecided about', 'ie', 11, 1);
    });

    it('should let exact major versions through', function () {
        expect({ie: { 11: 'y' }}, 'to support', 'ie', 11, 0).and('to support', 'ie', 11, 1);
    });

    it('should explode version ranges spanning several minor versions', function () {
        expect({ie: { '10.1-10.2': 'y' }}, 'to support', 'ie', 10, 1)
            .and('to support', 'ie', 10, 2)
            .and('to be undecided about', 'ie', 10, 0)
            .and('to be undecided about', 'ie', 10, 3);
    });

    it('should explode version ranges spanning several major and minor versions', function () {
        expect({ie: { '10.3-12.1': 'y' }}, 'to support', 'ie', 10, 3)
            .and('to support', 'ie', 10, 20)
            .and('to be undecided about', 'ie', 10, 0)
            .and('to support', 'ie', 11, 0)
            .and('to support', 'ie', 11, 20)
            .and('to support', 'ie', 12, 0)
            .and('to support', 'ie', 12, 1)
            .and('to be undecided about', 'ie', 12, 2);
    });

    it('should support multiple non-overlapping ranges', function () {
        expect({ie: { '10.0-10.1': 'n', '10.3-12.1': 'y' }}, 'to support', 'ie', 10, 3)
            .and('not to support', 'ie', 10, 0)
            .and('not to support', 'ie', 10, 1)
            .and('to be undecided about', 'ie', 10, 2)
            .and('to support', 'ie', 10, 3)
            .and('to support', 'ie', 10, 20)
            .and('to support', 'ie', 11, 0)
            .and('to support', 'ie', 11, 20)
            .and('to support', 'ie', 12, 0)
            .and('to support', 'ie', 12, 1)
            .and('to be undecided about', 'ie', 12, 2);
    });
});
