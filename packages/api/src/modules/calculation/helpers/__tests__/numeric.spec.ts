import { describe, it, expect } from 'vitest'
import { roundHalfEven, decimalToNumber, preciseSum, mean } from '../numeric'
import { Prisma } from '@prisma/client'

describe('numeric helper', () => {
  describe('roundHalfEven', () => {
    it('should round half to even (bankers rounding) properly at 0 decimals', () => {
      expect(roundHalfEven(2.5, 0)).toBe(2)
      expect(roundHalfEven(3.5, 0)).toBe(4)
      expect(roundHalfEven(2.4, 0)).toBe(2)
      expect(roundHalfEven(2.6, 0)).toBe(3)
    })

    it('should round half to even properly at 2 decimals', () => {
      expect(roundHalfEven(2.345, 2)).toBe(2.34)
      expect(roundHalfEven(2.355, 2)).toBe(2.36)
    })
    
    it('should handle negative numbers correctly', () => {
      expect(roundHalfEven(-2.5, 0)).toBe(-2)
      expect(roundHalfEven(-3.5, 0)).toBe(-4)
    })
  })

  describe('decimalToNumber', () => {
    it('should convert Prisma.Decimal to number', () => {
      expect(decimalToNumber(new Prisma.Decimal('10.5'))).toBe(10.5)
    })

    it('should return 0 for null or undefined', () => {
      expect(decimalToNumber(null)).toBe(0)
      expect(decimalToNumber(undefined)).toBe(0)
    })
  })

  describe('preciseSum', () => {
    it('should sum floating point numbers with Kahan algorithm reducing error', () => {
      expect(preciseSum([0.1, 0.1, 0.1])).toBeCloseTo(0.3, 10)
      expect(preciseSum([0.1, 0.2])).toBeCloseTo(0.3, 10)
    })

    it('should return 0 for empty array', () => {
      expect(preciseSum([])).toBe(0)
    })
  })

  describe('mean', () => {
    it('should calculate the arithmetic mean of an array', () => {
      expect(mean([1, 2, 3])).toBe(2)
      expect(mean([10, 20])).toBe(15)
    })

    it('should return 0 for an empty array', () => {
      expect(mean([])).toBe(0)
    })
  })
})
