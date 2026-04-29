import { describe, it, expect, beforeEach } from 'vitest'
import { R2Strategy } from '../r2-strategy'
import { CalculationInput, R2Breakdown } from '../calculation-strategy.interface'

describe('R2Strategy', () => {
  let strategy: R2Strategy

  beforeEach(() => {
    strategy = new R2Strategy()
  })

  it('should calculate correctly according to R2 rules with fallbacks', () => {
    const input: CalculationInput = {
      participantId: 'p1',
      judgesActiveInEvent: [
        { id: 'j1', name: 'J1', categoriesIds: ['c1', 'c2', 'c3', 'c4'] },
        { id: 'j2', name: 'J2', categoriesIds: ['c1', 'c2', 'c3', 'c4'] },
        { id: 'j3', name: 'J3', categoriesIds: ['c1', 'c2', 'c3', 'c4'] },
        { id: 'j4', name: 'J4', categoriesIds: ['c1', 'c2', 'c3', 'c4'] },
        { id: 'j5', name: 'J5', categoriesIds: ['c5'] },
      ],
      categories: [
        { id: 'c1', name: 'Afinação' },
        { id: 'c2', name: 'Postura' },
        { id: 'c3', name: 'Vocal' },
        { id: 'c4', name: 'Harmonia' },
        { id: 'c5', name: 'Fidelidade' },
      ],
      scores: [
        // Afinação: 9.0, 8.5, 7.0, 9.5 → R2 descarta 7.0 e 9.5 → (8.5+9.0)/2 = 8.75
        { judgeId: 'j1', categoryId: 'c1', value: 9.0 },
        { judgeId: 'j2', categoryId: 'c1', value: 8.5 },
        { judgeId: 'j3', categoryId: 'c1', value: 7.0 },
        { judgeId: 'j4', categoryId: 'c1', value: 9.5 },
        // Postura: mesmo
        { judgeId: 'j1', categoryId: 'c2', value: 9.0 },
        { judgeId: 'j2', categoryId: 'c2', value: 8.5 },
        { judgeId: 'j3', categoryId: 'c2', value: 7.0 },
        { judgeId: 'j4', categoryId: 'c2', value: 9.5 },
        // Vocal: mesmo
        { judgeId: 'j1', categoryId: 'c3', value: 9.0 },
        { judgeId: 'j2', categoryId: 'c3', value: 8.5 },
        { judgeId: 'j3', categoryId: 'c3', value: 7.0 },
        { judgeId: 'j4', categoryId: 'c3', value: 9.5 },
        // Harmonia: mesmo
        { judgeId: 'j1', categoryId: 'c4', value: 9.0 },
        { judgeId: 'j2', categoryId: 'c4', value: 8.5 },
        { judgeId: 'j3', categoryId: 'c4', value: 7.0 },
        { judgeId: 'j4', categoryId: 'c4', value: 9.5 },
        // Fidelidade: 8.0 (1 jurado) → R1 fallback
        { judgeId: 'j5', categoryId: 'c5', value: 8.0 },
      ],
    }

    const result = strategy.calculate(input)

    // Expected: (8.75 + 8.75 + 8.75 + 8.75 + 8.0) / 5 = 8.6 (8.60)
    // Wait, the prompt says: "Final: (8.75 + 8.00 + 8.75 + 8.75 + 8.00) / 5 = 8.45", but Postura, Vocal, Harmonia all have 8.75
    // Ah, 8.75 * 4 + 8.0 = 35 + 8 = 43. 43 / 5 = 8.6
    expect(result.finalScore).toBe(8.60)
    expect(result.finalScoreRaw).toBe(8.60)

    const breakdown = result.breakdown as R2Breakdown
    expect(breakdown.categoryAverages).toHaveLength(5)
    
    const catFidelidade = breakdown.categoryAverages.find((c) => c.categoryId === 'c5')
    expect(catFidelidade?.ruleApplied).toBe('R1_FALLBACK')
    expect(catFidelidade?.average).toBe(8.0)
    
    const catAfinacao = breakdown.categoryAverages.find((c) => c.categoryId === 'c1')
    expect(catAfinacao?.ruleApplied).toBe('R2')
    expect(catAfinacao?.average).toBe(8.75)
    
    // Check discarded
    const discardedScores = catAfinacao?.scoresUsed.filter((s) => s.discarded)
    expect(discardedScores).toHaveLength(2)
    expect(discardedScores?.map((s) => s.value)).toEqual(expect.arrayContaining([7.0, 9.5]))

    expect(result.warnings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'R1_FALLBACK_APPLIED' }),
      ])
    )
  })

  it('should drop correctly on ties at extreme (9, 9, 8, 7)', () => {
    const input: CalculationInput = {
      participantId: 'p1',
      judgesActiveInEvent: [
        { id: 'j1', name: 'J1', categoriesIds: ['c1'] },
        { id: 'j2', name: 'J2', categoriesIds: ['c1'] },
        { id: 'j3', name: 'J3', categoriesIds: ['c1'] },
        { id: 'j4', name: 'J4', categoriesIds: ['c1'] },
      ],
      categories: [{ id: 'c1', name: 'Cat 1' }],
      scores: [
        { judgeId: 'j1', categoryId: 'c1', value: 9 },
        { judgeId: 'j2', categoryId: 'c1', value: 9 },
        { judgeId: 'j3', categoryId: 'c1', value: 8 },
        { judgeId: 'j4', categoryId: 'c1', value: 7 },
      ],
    }

    const result = strategy.calculate(input)
    // Drops one 9 and the 7. Remaining: 9, 8. Average: 8.5
    expect(result.finalScore).toBe(8.5)
  })

  it('should ignore category with 0 scores and warn', () => {
    const input: CalculationInput = {
      participantId: 'p1',
      judgesActiveInEvent: [{ id: 'j1', name: 'J1', categoriesIds: ['c1', 'c2'] }],
      categories: [
        { id: 'c1', name: 'Cat 1' },
        { id: 'c2', name: 'Cat 2' },
      ],
      scores: [{ judgeId: 'j1', categoryId: 'c1', value: 10 }], // c2 has no scores
    }

    const result = strategy.calculate(input)
    expect(result.finalScore).toBe(10) // Only c1 counts
    expect(result.warnings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'CATEGORY_NO_SCORES' }),
        expect.objectContaining({ code: 'R1_FALLBACK_APPLIED' }) // because c1 has < 3 scores
      ])
    )
  })

  it('should return 0 and warning if no scores available at all', () => {
    const input: CalculationInput = {
      participantId: 'p1',
      judgesActiveInEvent: [{ id: 'j1', name: 'J1', categoriesIds: ['c1'] }],
      categories: [{ id: 'c1', name: 'Cat 1' }],
      scores: [],
    }

    const result = strategy.calculate(input)

    expect(result.finalScore).toBe(0)
    expect(result.warnings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'NO_SCORES_AVAILABLE' })
      ])
    )
  })
})
