import { isValidScoreRange, isValidScoreValue, hasAtMostOneDecimal } from '../src/common/domain-helpers';

describe('domain-helpers', () => {
  describe('isValidScoreRange', () => {
    it('returns true when min is less than max and both have at most 1 decimal', () => {
      expect(isValidScoreRange(5.0, 10.0)).toBe(true);
    });

    it('returns false when min is greater than max', () => {
      expect(isValidScoreRange(10.0, 5.0)).toBe(false);
    });

    it('returns false when min is equal to max', () => {
      expect(isValidScoreRange(5.0, 5.0)).toBe(false);
    });
  });

  describe('isValidScoreValue', () => {
    it('returns true when value is within range', () => {
      expect(isValidScoreValue(7.5, 5.0, 10.0)).toBe(true);
    });

    it('returns false when value is below min', () => {
      expect(isValidScoreValue(4.9, 5.0, 10.0)).toBe(false);
    });

    it('returns false when value is above max', () => {
      expect(isValidScoreValue(10.1, 5.0, 10.0)).toBe(false);
    });
  });

  describe('hasAtMostOneDecimal', () => {
    it('returns true when value has one decimal', () => {
      expect(hasAtMostOneDecimal(8.5)).toBe(true);
    });

    it('returns false when value has more than one decimal', () => {
      expect(hasAtMostOneDecimal(8.55)).toBe(false);
    });

    it('returns true when value has no decimals', () => {
      expect(hasAtMostOneDecimal(8)).toBe(true);
    });
  });
});
