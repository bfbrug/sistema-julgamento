import { describe, it, expect } from 'vitest'
import { calculateRankingsWithTiebreaker } from '../ranking-with-tiebreaker'
import { R1Breakdown, R2Breakdown } from '../../strategies/calculation-strategy.interface'

describe('ranking-with-tiebreaker', () => {
  const categoryNames = new Map([
    ['cat1', 'Técnica'],
    ['cat2', 'Presença'],
  ])

  it('should calculate category aggregates for R1', () => {
    const r1Breakdown: R1Breakdown = {
      judgeAverages: [
        {
          judgeId: 'j1',
          judgeName: 'J1',
          average: 9,
          categoryScores: [{ categoryId: 'cat1', categoryName: 'Técnica', value: 10 }, { categoryId: 'cat2', categoryName: 'Presença', value: 8 }]
        },
        {
          judgeId: 'j2',
          judgeName: 'J2',
          average: 8,
          categoryScores: [{ categoryId: 'cat1', categoryName: 'Técnica', value: 8 }, { categoryId: 'cat2', categoryName: 'Presença', value: 8 }]
        }
      ]
    }

    const results = [
      {
        participant: { id: 'p1', name: 'P1', presentationOrder: 1 },
        finalScoreRaw: 8.5,
        finalScore: 8.5,
        breakdown: r1Breakdown
      }
    ]

    const result = calculateRankingsWithTiebreaker(results, { firstCategoryId: 'cat1', secondCategoryId: null }, categoryNames)
    
    expect(result[0].categoryAggregates.get('cat1')).toBe(9) // (10+8)/2
    expect(result[0].categoryAggregates.get('cat2')).toBe(8) // (8+8)/2
  })

  it('should use already calculated averages for R2', () => {
    const r2Breakdown: R2Breakdown = {
      categoryAverages: [
        {
          categoryId: 'cat1',
          categoryName: 'Técnica',
          average: 9.5,
          ruleApplied: 'R2',
          scoresUsed: []
        }
      ]
    }

    const results = [
      {
        participant: { id: 'p1', name: 'P1', presentationOrder: 1 },
        finalScoreRaw: 9.5,
        finalScore: 9.5,
        breakdown: r2Breakdown
      }
    ]

    const result = calculateRankingsWithTiebreaker(results, { firstCategoryId: 'cat1', secondCategoryId: null }, categoryNames)
    
    expect(result[0].categoryAggregates.get('cat1')).toBe(9.5)
  })
})
