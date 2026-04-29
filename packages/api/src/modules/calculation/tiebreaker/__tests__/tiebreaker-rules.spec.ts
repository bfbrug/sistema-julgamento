import { describe, it, expect } from 'vitest'
import { applyTiebreaker, selectTopN, ParticipantWithRawScore, TiebreakerConfig } from '../tiebreaker-rules'

describe('tiebreaker-rules', () => {
  const categoryNames = new Map([
    ['cat1', 'Técnica'],
    ['cat2', 'Presença'],
  ])

  const mockBreakdown = { judgeAverages: [] }

  const createParticipant = (id: string, score: number, cat1?: number, cat2?: number): ParticipantWithRawScore => ({
    participantId: id,
    name: `P-${id}`,
    presentationOrder: parseInt(id),
    finalScoreRaw: score,
    finalScore: score,
    categoryAggregates: new Map([
      ...(cat1 !== undefined ? [['cat1', cat1] as [string, number]] : []),
      ...(cat2 !== undefined ? [['cat2', cat2] as [string, number]] : []),
    ]),
    breakdown: mockBreakdown,
  })

  describe('applyTiebreaker', () => {
    it('1. should return empty array for empty input', () => {
      expect(applyTiebreaker([], { firstCategoryId: null, secondCategoryId: null }, categoryNames)).toEqual([])
    })

    it('2. should handle 3 participants with different scores (no tie)', () => {
      const p1 = createParticipant('1', 10)
      const p2 = createParticipant('2', 9)
      const p3 = createParticipant('3', 8)
      
      const result = applyTiebreaker([p2, p3, p1], { firstCategoryId: null, secondCategoryId: null }, categoryNames)
      
      expect(result[0].participantId).toBe('1')
      expect(result[0].position).toBe(1)
      expect(result[1].participantId).toBe('2')
      expect(result[1].position).toBe(2)
      expect(result[2].participantId).toBe('3')
      expect(result[2].position).toBe(3)
    })

    it('3. should handle 2 participants with identical scores and no config (tie unresolved)', () => {
      const p1 = createParticipant('1', 10)
      const p2 = createParticipant('2', 10)
      
      const result = applyTiebreaker([p1, p2], { firstCategoryId: null, secondCategoryId: null }, categoryNames)
      
      expect(result[0].position).toBe(1)
      expect(result[1].position).toBe(1)
      expect(result[0].tiebreaker).toBeNull()
    })

    it('4. should handle 3 participants with identical scores and no config (tie unresolved)', () => {
      const p1 = createParticipant('1', 10)
      const p2 = createParticipant('2', 10)
      const p3 = createParticipant('3', 10)
      const p4 = createParticipant('4', 9)
      
      const result = applyTiebreaker([p1, p2, p3, p4], { firstCategoryId: null, secondCategoryId: null }, categoryNames)
      
      expect(result[0].position).toBe(1)
      expect(result[1].position).toBe(1)
      expect(result[2].position).toBe(1)
      expect(result[3].position).toBe(4)
    })

    it('5. should resolve tie with first category', () => {
      const p1 = createParticipant('1', 10, 8)
      const p2 = createParticipant('2', 10, 9) // better in cat1
      
      const result = applyTiebreaker([p1, p2], { firstCategoryId: 'cat1', secondCategoryId: null }, categoryNames)
      
      expect(result[0].participantId).toBe('2')
      expect(result[0].position).toBe(1)
      expect(result[0].tiebreaker?.resolvedBy).toBe('FIRST_CATEGORY')
      
      expect(result[1].participantId).toBe('1')
      expect(result[1].position).toBe(2)
      expect(result[1].tiebreaker?.resolvedBy).toBe('FIRST_CATEGORY')
    })

    it('6. should stay tied if first category is also tied', () => {
      const p1 = createParticipant('1', 10, 9)
      const p2 = createParticipant('2', 10, 9)
      
      const result = applyTiebreaker([p1, p2], { firstCategoryId: 'cat1', secondCategoryId: null }, categoryNames)
      
      expect(result[0].position).toBe(1)
      expect(result[1].position).toBe(1)
      expect(result[0].tiebreaker?.resolvedBy).toBe('UNRESOLVED')
    })

    it('7. should resolve tie with second category if first is tied', () => {
      const p1 = createParticipant('1', 10, 9, 7)
      const p2 = createParticipant('2', 10, 9, 8) // better in cat2
      
      const result = applyTiebreaker([p1, p2], { firstCategoryId: 'cat1', secondCategoryId: 'cat2' }, categoryNames)
      
      expect(result[0].participantId).toBe('2')
      expect(result[0].position).toBe(1)
      expect(result[0].tiebreaker?.resolvedBy).toBe('SECOND_CATEGORY')
      
      expect(result[1].participantId).toBe('1')
      expect(result[1].position).toBe(2)
      expect(result[1].tiebreaker?.resolvedBy).toBe('SECOND_CATEGORY')
    })

    it('8. should stay tied if both categories are tied', () => {
      const p1 = createParticipant('1', 10, 9, 8)
      const p2 = createParticipant('2', 10, 9, 8)
      
      const result = applyTiebreaker([p1, p2], { firstCategoryId: 'cat1', secondCategoryId: 'cat2' }, categoryNames)
      
      expect(result[0].position).toBe(1)
      expect(result[1].position).toBe(1)
      expect(result[0].tiebreaker?.resolvedBy).toBe('UNRESOLVED')
    })

    it('9. should resolve partially with first category', () => {
      const p1 = createParticipant('1', 10, 9)
      const p2 = createParticipant('2', 10, 9)
      const p3 = createParticipant('3', 10, 8)
      
      const result = applyTiebreaker([p1, p2, p3], { firstCategoryId: 'cat1', secondCategoryId: null }, categoryNames)
      
      expect(result[0].position).toBe(1)
      expect(result[1].position).toBe(1)
      expect(result[2].position).toBe(3)
      expect(result[2].participantId).toBe('3')
    })

    it('10. should resolve all with first category', () => {
      const p1 = createParticipant('1', 10, 9)
      const p2 = createParticipant('2', 10, 8)
      const p3 = createParticipant('3', 10, 7)
      
      const result = applyTiebreaker([p1, p2, p3], { firstCategoryId: 'cat1', secondCategoryId: null }, categoryNames)
      
      expect(result[0].position).toBe(1)
      expect(result[1].position).toBe(2)
      expect(result[2].position).toBe(3)
    })

    it('11. should make participant lose if missing category score', () => {
      const p1 = createParticipant('1', 10, 5)
      const p2 = createParticipant('2', 10) // missing cat1
      
      const result = applyTiebreaker([p1, p2], { firstCategoryId: 'cat1', secondCategoryId: null }, categoryNames)
      
      expect(result[0].participantId).toBe('1')
      expect(result[1].participantId).toBe('2')
    })

    it('12. should stay tied if both missing category score', () => {
      const p1 = createParticipant('1', 10)
      const p2 = createParticipant('2', 10)
      
      const result = applyTiebreaker([p1, p2], { firstCategoryId: 'cat1', secondCategoryId: null }, categoryNames)
      
      expect(result[0].position).toBe(1)
      expect(result[1].position).toBe(1)
    })

    it('13. should ignore non-existent category in config', () => {
      const p1 = createParticipant('1', 10, 9)
      const p2 = createParticipant('2', 10, 8)
      
      const result = applyTiebreaker([p1, p2], { firstCategoryId: 'invalid', secondCategoryId: null }, categoryNames)
      
      expect(result[0].position).toBe(1)
      expect(result[1].position).toBe(1)
    })

    it('14. should handle 1 participant only', () => {
      const p1 = createParticipant('1', 10)
      const result = applyTiebreaker([p1], { firstCategoryId: 'cat1', secondCategoryId: null }, categoryNames)
      expect(result).toHaveLength(1)
      expect(result[0].position).toBe(1)
    })

    it('15. should handle multiple separate tie groups', () => {
      const p1 = createParticipant('1', 10, 9)
      const p2 = createParticipant('2', 10, 8)
      const p3 = createParticipant('3', 9, 9)
      const p4 = createParticipant('4', 9, 8)
      
      const result = applyTiebreaker([p1, p2, p3, p4], { firstCategoryId: 'cat1', secondCategoryId: null }, categoryNames)
      
      expect(result[0].position).toBe(1)
      expect(result[1].position).toBe(2)
      expect(result[2].position).toBe(3)
      expect(result[3].position).toBe(4)
    })
  })

  describe('selectTopN', () => {
    const p1 = { position: 1 } as any
    const p2 = { position: 2 } as any
    const p3 = { position: 3 } as any
    const p3_tie = { position: 3 } as any
    const p5 = { position: 5 } as any

    it('should return 3 participants when there is no tie at boundary', () => {
      const ranked = [p1, p2, p3, p5]
      expect(selectTopN(ranked, 3)).toHaveLength(3)
    })

    it('should return 4 participants for top 3 when there is a tie at 3rd place', () => {
      const ranked = [p1, p2, p3, p3_tie, p5]
      const result = selectTopN(ranked, 3)
      expect(result).toHaveLength(4)
      expect(result.every(p => p.position <= 3)).toBe(true)
    })

    it('should return 2 participants for top 1 when there is a tie at 1st place', () => {
      const p1_a = { position: 1 } as any
      const p1_b = { position: 1 } as any
      const ranked = [p1_a, p1_b, p3]
      expect(selectTopN(ranked, 1)).toHaveLength(2)
    })

    it('should return empty array for n=0', () => {
      expect(selectTopN([p1, p2], 0)).toEqual([])
    })

    it('should return all participants if n > length', () => {
      expect(selectTopN([p1, p2], 10)).toHaveLength(2)
    })
  })
})
