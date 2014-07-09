var format = require('../../../src/server/lib/format');
var assert = require('assert');

describe('Module format', function () {
    
    describe('JSON', function() {
        it('should return JSON', function () {
            var src = [
                {a: 1, testingValue: 4},
                {a: 3, testingValue: 12}
            ];
            var expected = JSON.stringify(src, undefined, 2);
            assert.deepEqual(format.formatJson(src), expected);
        });
    });
    
    describe('CSV', function () {
       it('should return expected CSV', function () {
            var src = [
                {a: 1, testingValue: 4},
                {a: 3, testingValue: 12}
            ];
            var expected = [
                    '1;4',
                    '3;12'
                ].join('\n');
            assert.deepEqual(format.formatCsv(src), expected);
       });
       it('should escape delimiters', function () {
           
            var src = [
                {a: 1, testingValue: "ab;cd"},
                {a: 3, testingValue: 12}
            ];
            var expected = [
                    '1;"ab"";""cd"',
                    '3;12'
                ].join('\n');
            assert.deepEqual(format.formatCsv(src), expected);
       });
    });
    
    describe('format', function () {
        it('should select CSV', function () {
            var src = [
                {a: 1, testingValue: 4},
                {a: 3, testingValue: 12}
            ];
            var expected = [
                    '1;4',
                    '3;12'
                ].join('\n');
            assert.deepEqual(format.format(src, 'csv'), expected);
        });
        
        it('should select JSON', function () {
            var src = [
                {a: 1, testingValue: 4},
                {a: 3, testingValue: 12}
            ];
            var expected = JSON.stringify(src, undefined, 2);
            assert.deepEqual(format.format(src, 'json'), expected);
        });
        
        it('should be case insensitive', function () {
            var src = [
                {a: 1, testingValue: 4},
                {a: 3, testingValue: 12}
            ];
            var expected = [
                    '1;4',
                    '3;12'
                ].join('\n');
            assert.deepEqual(format.format(src, 'CSV'), expected);
        });
    });
});