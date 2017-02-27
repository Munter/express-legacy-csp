const expect = require('unexpected').clone();
const preprocessCaniuseData = require('../lib/preprocessCaniuseData');

expect.addAssertion('<object> [not] to support <string> <number+>', (expect, subject, caniuseId, major, minor, patch) =>
    expect(preprocessCaniuseData(subject)(caniuseId, major, minor, patch), '[not] to be true'));

expect.addAssertion('<object> [not] to be undecided about <string> <number+>', (expect, subject, caniuseId, major, minor, patch) => {
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

    it('should let exact major versions through', function () {
        expect({ie: { '11': 'y' }}, 'to support', 'ie', 11)
            .and('to support', 'ie', 11, 1)
            .and('to support', 'ie', 11, 1, 2);
    });

    it('should let exact major.minor versions through', function () {
        expect({ie: { '11.1': 'y' }}, 'to support', 'ie', 11, 1)
            .and('not to support', 'ie', 11, 0);
    });

    it('should let exact major.minor.patch versions through', function () {
        expect({ie: { '11.1.2': 'y' }}, 'to support', 'ie', 11, 1, 2)
            .and('not to support', 'ie', 11, 1);
    });

    it('should let exact major versions through', function () {
        expect({ie: { 11: 'y' }}, 'to support', 'ie', 11, 0).and('to support', 'ie', 11, 1);
    });

    it('should explode version ranges spanning several minor versions', function () {
        expect({ie: { '10.1-10.2': 'y' }}, 'to support', 'ie', 10, 1)
            .and('to support', 'ie', 10, 2)
            .and('not to support', 'ie', 10, 0);
    });

    it('should explode version ranges spanning several major and minor versions', function () {
        expect({ie: { '10.3-12.1': 'y' }}, 'to support', 'ie', 10, 3)
            .and('to support', 'ie', 10, 20)
            .and('to support', 'ie', 10, 20, 4)
            .and('not to support', 'ie', 10, 0)
            .and('to support', 'ie', 11, 0)
            .and('to support', 'ie', 11, 20)
            .and('to support', 'ie', 12, 0)
            .and('to support', 'ie', 12, 1);
    });

    it('should support multiple non-overlapping ranges', function () {
        expect({ie: { '10.0-10.1': 'n', '10.3-12.1': 'y' }}, 'to support', 'ie', 10, 3)
            .and('to support', 'ie', 11)
            .and('not to support', 'ie', 10, 0)
            .and('not to support', 'ie', 10, 1)
            .and('not to support', 'ie', 10, 2)
            .and('to support', 'ie', 10, 3)
            .and('to support', 'ie', 10, 20)
            .and('to support', 'ie', 11, 0)
            .and('to support', 'ie', 11, 20)
            .and('to support', 'ie', 12, 0)
            .and('to support', 'ie', 12, 1);
    });

    describe('when there is only data about older versions of the browser being queried', function () {
        describe('when the highest known version is given as major', function () {
            it('should assume that the newer version is supported when the highest known version is', function () {
                expect({ie: { '10': 'y' }}, 'to support', 'ie', 11);
            });

            it('should assume that the newer version is not supported when the highest known version is not', function () {
                expect({ie: { '10': 'n' }}, 'not to support', 'ie', 11);
            });
        });

        describe('when the highest known version is given as major.minor', function () {
            it('should assume that the newer version is supported when the highest known version is', function () {
                expect({ie: { '10.5': 'y' }}, 'to support', 'ie', 11);
            });

            it('should assume that the newer version is not supported when the highest known version is not', function () {
                expect({ie: { '10.5': 'n' }}, 'not to support', 'ie', 11);
            });
        });

        describe('when the highest known version is given as major.minor.patch', function () {
            it('should assume that the newer version is supported when the highest known version is', function () {
                expect({ie: { '10.5.8': 'y' }}, 'to support', 'ie', 11);
            });

            it('should assume that the newer version is not supported when the highest known version is not', function () {
                expect({ie: { '10.5.8': 'n' }}, 'not to support', 'ie', 11);
            });
        });

        describe('when the highest known version is given as a range', function () {
            it('should assume that the newer version is supported when the highest known version is', function () {
                expect({ie: { '10.2-10.4': 'y' }}, 'to support', 'ie', 11);
            });

            it('should assume that the newer version is not supported when the highest known version is not', function () {
                expect({ie: { '10.2-10.4': 'n' }}, 'not to support', 'ie', 11);
            });
        });
    });

    describe('when there is only data about newer versions of the browser being queried', function () {
        describe('when the lowest known version is given as major', function () {
            it('should assume that the older version is not supported when the higher version is not', function () {
                expect({ie: { '10': 'n' }}, 'not to support', 'ie', 9);
            });

            it('should assume that the older version is not supported when the higher version is', function () {
                expect({ie: { '10': 'y' }}, 'not to support', 'ie', 9);
            });
        });

        describe('when the highest known version is given as major.minor', function () {
            it('should assume that the older version is not supported when the higher version is not', function () {
                expect({ie: { '10.5': 'n' }}, 'not to support', 'ie', 9);
            });

            it('should assume that the older version is not supported when the higher version is', function () {
                expect({ie: { '10.5': 'y' }}, 'not to support', 'ie', 9);
            });
        });

        describe('when the highest known version is given as major.minor.patch', function () {
            it('should assume that the older version is not supported when the higher version is not', function () {
                expect({ie: { '10.5.8': 'n' }}, 'not to support', 'ie', 9);
            });

            it('should assume that the older version is not supported when the higher version is', function () {
                expect({ie: { '10.5.8': 'y' }}, 'not to support', 'ie', 9);
            });
        });

        describe('when the highest known version is given as a range', function () {
            it('should assume that the older version is not supported when the higher version is not', function () {
                expect({ie: { '10.5.2-10.5.8': 'n' }}, 'not to support', 'ie', 9);
            });

            it('should assume that the older version is not supported when the higher version is', function () {
                expect({ie: { '10.5.2-10.5.8': 'y' }}, 'not to support', 'ie', 9);
            });
        });
    });

    describe('when there is no data about the browser being queried', function () {
        it('should return undefined', function () {
            expect({}, 'to be undecided about', 'ie', 10, 0);
        });
    });
});
