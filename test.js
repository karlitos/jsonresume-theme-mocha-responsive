const rewire = require('rewire');

const app = rewire('./index.js');

const customHelpers = app.__get__('customHelpers'); 

describe('The formatDate function', () => {
    const formatDate = customHelpers.formatDate;

    test('it should format full date correctly', () => {
        expect(formatDate('2020-12-12')).toBe('12/12/2020');
        expect(formatDate('2020-01-12')).toBe('01/12/2020');
        expect(formatDate('2020-1-12')).toBe('01/12/2020');
    });

    test('it should format year with month correctly', () => {
        expect(formatDate('2020-12')).toBe('12/2020');
        expect(formatDate('2020-01')).toBe('01/2020');
        expect(formatDate('2020-1')).toBe('01/2020');
    });

    test('it should format standalone year correctly', () => {
        expect(formatDate('2020')).toBe('2020');
        expect(formatDate('1900')).toBe('1900');
        expect(formatDate('2222')).toBe('2222');
    });
});

describe('The concat function', () => {
    const concat = customHelpers.concat;

    test('it concatenate multiple strings correctly', () => {
        expect(concat('ba', 'na', 'na')).toBe('banana');
        expect(concat('Ba', ' T ', 'mAn')).toBe('Ba T mAn');
        expect(concat('', ' ', `${(1).toString()}`)).toBe(' 1');
    });

    test('it concatenate numbers correctly', () => {
        expect(concat(1, 2, 3)).toBe('123');
        expect(concat(1.1, 2.2, 3.3)).toBe('1.12.23.3');
    });

    test('it concatenate mixed content correctly', () => {
        expect(concat('foo', 2, false)).toBe('foo2false');
        expect(concat('undefined', undefined)).toBe('undefinedundefined');
    });

    test('it omits non primitive data types', () => {
        expect(concat({},[], null, function(){})).toBe('');
    });

});