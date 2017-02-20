const expect = require('unexpected').use(require('unexpected-express'));
const expressExtendCsp = require('../lib/expressExtendCsp');
const express = require('express');

let config;
beforeEach(function () {
    config = {};
});

expect.addAssertion('<string|undefined> to come out as <any>', function (expect, subject, value) {
    return expect(
        express()
            .use(expressExtendCsp(config))
            .use(function (req, res) {
                if (subject !== undefined) {
                    res.setHeader('Content-Security-Policy', subject);
                }
                res.send('<!DOCTYPE html>\n<html><head></head><body>foo</body></html>');
            }),
        'to yield exchange', {
            request: '/',
            response: {
                headers: {
                    'Content-Security-Policy': value
                }
            }
        }
    );
});

describe('expressExtendCsp', function () {
    describe('extending the csp', function () {
        it('should not do anything when no config is passed', function () {
            config = undefined;
            return expect('style-src https:', 'to come out as', 'style-src https:');
        });

        it('should not do anything when config.add is not defined', function () {
            return expect('style-src https:', 'to come out as', 'style-src https:');
        });

        it('should not do anything when there is no Content-Security-Policy header already', function () {
            config = { add: { styleSrc: ['somewhereovertherainbow.com'] } };
            return expect(undefined, 'to come out as', undefined);
        });

        it('should add to an existing directive, array case', function () {
            config = { add: { styleSrc: ['somewhereovertherainbow.com'] } };
            return expect('style-src https:', 'to come out as', 'style-src https: somewhereovertherainbow.com');
        });

        it('should add to an existing directive, string case', function () {
            config = { add: { styleSrc: 'somewhereovertherainbow.com' } };
            return expect('style-src https:', 'to come out as', 'style-src https: somewhereovertherainbow.com');
        });

        it('should add to an existing directive, non-camel cased key', function () {
            config = { add: { 'style-src': 'somewhereovertherainbow.com' } };
            return expect('style-src https:', 'to come out as', 'style-src https: somewhereovertherainbow.com');
        });

        describe('with a broken or irregular existing CSP', function () {
            it('should tolerate a semicolon at the end', function () {
                config = { add: { 'style-src': 'somewhereovertherainbow.com' } };
                return expect('script-src *;', 'to come out as', 'script-src *; style-src somewhereovertherainbow.com');
            });

            it('should tolerate an empty directive when adding to it', function () {
                config = { add: { 'style-src': 'somewhereovertherainbow.com' } };
                return expect('style-src', 'to come out as', 'style-src somewhereovertherainbow.com');
            });

            it('should tolerate an empty directive when adding to a different one', function () {
                config = { add: { 'style-src': 'somewhereovertherainbow.com' } };
                return expect('script-src;', 'to come out as', 'script-src; style-src somewhereovertherainbow.com');
            });
        });

        it('should remove the \'none\' token when adding to an empty directive', function () {
            config = { add: { styleSrc: ['somewhereovertherainbow.com'] } };
            return expect("style-src 'none'", 'to come out as', 'style-src somewhereovertherainbow.com');
        });

        it('should add a new directive', function () {
            config = { add: { styleSrc: ['somewhereovertherainbow.com'] } };
            return expect("connect-src 'self'", 'to come out as', "connect-src 'self'; style-src somewhereovertherainbow.com");
        });

        it('should take default-src into account when adding a new directive that falls back to default-src', function () {
            config = { add: { styleSrc: ['somewhereovertherainbow.com'] } };
            return expect("default-src 'self'", 'to come out as', "default-src 'self'; style-src 'self' somewhereovertherainbow.com");
        });

        it('should handle a default-src of \'none\' when adding a new directive that falls back to default-src', function () {
            config = { add: { styleSrc: ['somewhereovertherainbow.com'] } };
            return expect("default-src 'none'", 'to come out as', "default-src 'none'; style-src somewhereovertherainbow.com");
        });

        it('should disregard default-src when adding a new directive that does not fall back to it per spec', function () {
            config = { add: { childSrc: ['somewhereovertherainbow.com'] } };
            return expect("default-src 'self'", 'to come out as', "default-src 'self'; child-src somewhereovertherainbow.com");
        });
    });
});
