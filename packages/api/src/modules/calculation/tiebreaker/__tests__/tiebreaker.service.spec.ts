import { describe, it, expect } from 'vitest'
import { TiebreakerService } from '../tiebreaker.service'

describe('TiebreakerService', () => {
  const service = new TiebreakerService()
  const categoryNames = new Map([['cat1', 'Técnica']])

  it('should apply tiebreaker with null config', () => {
    const results = [
      {
        participant: { id: 'p1', name: 'P1', presentationOrder: 1 },
        finalScoreRaw: 10,
        finalScore: 10,
        breakdown: { categoryAverages: [] }
      }
    ]
    const result = service.apply(results, null, categoryNames)
    expect(result).toHaveLength(1)
    expect(result[0].position).toBe(1)
  })

  it('should call selectTopN', () => {
    const ranked = [{ position: 1 }, { position: 2 }] as any
    const result = service.selectTopN(ranked, 1)
    expect(result).toHaveLength(1)
  })
})
