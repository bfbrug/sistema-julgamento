import { describe, it, expect } from 'vitest'
import { trimmedMean } from '../trimmed-mean'

describe('trimmedMean helper', () => {
  it('should trim highest and lowest value and calculate mean', () => {
    expect(trimmedMean([1, 2, 3, 4, 5], 1)).toBe(3) // drops 1 and 5
  })

  it('should handle identical values properly', () => {
    expect(trimmedMean([5, 5, 5, 5, 5], 1)).toBe(5)
  })

  it('should handle ties at extremes by dropping one instance', () => {
    expect(trimmedMean([1, 1, 1, 10], 1)).toBe(1) // drops one 1 and 10, remaining 1, 1 -> mean 1
    expect(trimmedMean([5, 5, 5, 8, 8], 1)).toBe(6) // drops 5 and 8 -> 5, 5, 8 -> mean 6
  })

  it('should handle floating point numbers', () => {
    expect(trimmedMean([8.5, 9.0, 7.0, 9.5], 1)).toBe(8.75) // drops 7.0 and 9.5 -> 8.5, 9.0 -> 8.75
  })

  it('should throw an error if not enough values', () => {
    expect(() => trimmedMean([1, 2], 1)).toThrow('Insufficient values for trimmed mean')
  })
  
  it('should work with 3 items', () => {
    expect(trimmedMean([1, 2, 3], 1)).toBe(2)
  })
})
