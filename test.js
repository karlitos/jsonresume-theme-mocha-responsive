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