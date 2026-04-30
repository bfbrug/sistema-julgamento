import { describe, it, expect, beforeEach } from 'vitest'
import { R1Strategy } from '../r1-strategy'
import { CalculationInput, R1Breakdown } from '../calculation-strategy.interface'

describe('R1Strategy', () => {
  let strategy: R1Strategy

  beforeEach(() => {
    strategy = new R1Strategy()
  })

  it('should calculate mean of means correctly according to R1 rules', () => {
    const input: CalculationInput = {
      participantId: 'p1',
      judgesActiveInEvent: [
        { id: 'jA', name: 'Jurado A', categoriesIds: ['c1', 'c2', 'c3'] },
        { id: 'jB', name: 'Jurado B', categoriesIds: ['c1', 'c2', 'c3'] },
        { id: 'jC', name: 'Jurado C', categoriesIds: ['c1', 'c2', 'c3'] },
        { id: 'jD', name: 'Jurado D', categoriesIds: ['c4'] },
      ],
      categories: [
        { id: 'c1', name: 'Cat 1' },
        { id: 'c2', name: 'Cat 2' },
        { id: 'c3', name: 'Cat 3' },
        { id: 'c4', name: 'Cat 4' },
      ],
      scores: [
        // Jurado A: 10, 9, 8 → média 9
        { judgeId: 'jA', categoryId: 'c1', value: 10 },
        { judgeId: 'jA', categoryId: 'c2', value: 9 },
        { judgeId: 'jA', categoryId: 'c3', value: 8 },
        // Jurado B: 10, 9, 9 → média 9.3333
        { judgeId: 'jB', categoryId: 'c1', value: 10 },
        { judgeId: 'jB', categoryId: 'c2', value: 9 },
        { judgeId: 'jB', categoryId: 'c3', value: 9 },
        // Jurado C: 8, 8, 8 → média 8
        { judgeId: 'jC', categoryId: 'c1', value: 8 },
        { judgeId: 'jC', categoryId: 'c2', value: 8 },
        { judgeId: 'jC', categoryId: 'c3', value: 8 },
        // Jurado D: 9 → média 9
        { judgeId: 'jD', categoryId: 'c4', value: 9 },
      ],
    }

    const result = strategy.calculate(input)

    // Expected: (9 + 9.333333333333334 + 8 + 9) / 4 = 8.833333333333334
    // Rounded to 2 decimals: 8.83
    // Rounded to 4 decimals: 8.8333
    expect(result.finalScore).toBe(8.83)
    expect(result.finalScoreRaw).toBe(8.8333)
    expect(result.warnings).toHaveLength(0)

    const breakdown = result.breakdown as R1Breakdown
    expect(breakdown.judgeAverages).toHaveLength(4)
    expect(breakdown.judgeAverages.find((j) => j.judgeId === 'jA')?.average).toBe(9)
    expect(breakdown.judgeAverages.find((j) => j.judgeId === 'jB')?.average).toBeCloseTo(9.3333, 4)
    expect(breakdown.judgeAverages.find((j) => j.judgeId === 'jC')?.average).toBe(8)
    expect(breakdown.judgeAverages.find((j) => j.judgeId === 'jD')?.average).toBe(9)
  })

  it('should ignore judges with no scores', () => {
    const input: CalculationInput = {
      participantId: 'p1',
      judgesActiveInEvent: [
        { id: 'jA', name: 'Jurado A', categoriesIds: ['c1'] },
        { id: 'jB', name: 'Jurado B', categoriesIds: ['c1'] }, // No scores
      ],
      categories: [{ id: 'c1', name: 'Cat 1' }],
      scores: [{ judgeId: 'jA', categoryId: 'c1', value: 7.5 }],
    }

    const result = strategy.calculate(input)

    expect(result.finalScore).toBe(7.5)
    const breakdown = result.breakdown as R1Breakdown
    expect(breakdown.judgeAverages).toHaveLength(1)
    expect(breakdown.judgeAverages[0]!.judgeId).toBe('jA')
  })

  it('should return 0 and warning if no scores available', () => {
    const input: CalculationInput = {
      participantId: 'p1',
      judgesActiveInEvent: [{ id: 'jA', name: 'Jurado A', categoriesIds: ['c1'] }],
      categories: [{ id: 'c1', name: 'Cat 1' }],
      scores: [],
    }

    const result = strategy.calculate(input)

    expect(result.finalScore).toBe(0)
    expect(result.warnings).toHaveLength(1)
    expect(result.warnings[0]!.code).toBe('NO_SCORES_AVAILABLE')
  })
})
