import { describe, it, expect, beforeEach, vi } from 'vitest'
import { RankingBuilderService } from '../ranking-builder.service'

const mockCalculate = vi.fn()
const mockGetTopN = vi.fn()
const mockPrisma = {
  judgingEvent: { findFirst: vi.fn() },
  judge: { findMany: vi.fn() },
  score: { findMany: vi.fn() },
}

const mockCalculationService = {
  calculate: mockCalculate,
  getTopN: mockGetTopN,
}

function makeService() {
  return new RankingBuilderService(mockCalculationService as never, mockPrisma as never)
}

const baseCalcResponse = (rankings: unknown[], excluded: unknown[] = []) => ({
  data: {
    event: { id: 'e1', name: 'Evento', calculationRule: 'R1', scoreMin: 0, scoreMax: 10, status: 'IN_PROGRESS' },
    calculatedAt: new Date().toISOString(),
    tiebreakerConfig: null,
    rankings,
    excluded,
    diagnostics: { totalParticipants: rankings.length, rankedParticipants: rankings.length, excludedParticipants: excluded.length },
  },
})

const makeRanking = (id: string, name: string, position: number, score: number) => ({
  position,
  participant: { id, name, presentationOrder: 1 },
  finalScore: score,
  finalScoreRaw: score,
  breakdown: { categoryAverages: [{ categoryId: 'c1', categoryName: 'Técnica', average: score }] },
  tiebreaker: null,
})

describe('RankingBuilderService', () => {
  let service: RankingBuilderService

  beforeEach(() => {
    vi.clearAllMocks()
    service = makeService()
  })

  describe('buildClassification', () => {
    it('retorna lista ordenada com posições corretas', async () => {
      mockCalculate.mockResolvedValueOnce(
        baseCalcResponse([
          makeRanking('p1', 'Alice', 1, 9.5),
          makeRanking('p2', 'Bob', 2, 8.0),
        ]),
      )
      const result = await service.buildClassification('e1', 'm1')
      expect(result).toHaveLength(2)
      expect(result[0]!.position).toBe(1)
      expect(result[0]!.participantName).toBe('Alice')
      expect(result[1]!.position).toBe(2)
    })

    it('empates recebem mesma posição', async () => {
      mockCalculate.mockResolvedValueOnce(
        baseCalcResponse([
          makeRanking('p1', 'Alice', 1, 9.0),
          makeRanking('p2', 'Bob', 1, 9.0),
          makeRanking('p3', 'Carol', 3, 8.0),
        ]),
      )
      const result = await service.buildClassification('e1', 'm1')
      expect(result[0]!.position).toBe(1)
      expect(result[1]!.position).toBe(1)
      expect(result[2]!.position).toBe(3)
    })

    it('ausentes excluídos da classificação', async () => {
      mockCalculate.mockResolvedValueOnce(
        baseCalcResponse(
          [makeRanking('p1', 'Alice', 1, 9.0)],
          [{ participant: { id: 'p2', name: 'Bob' }, reason: 'ABSENT' }],
        ),
      )
      const result = await service.buildClassification('e1', 'm1')
      expect(result).toHaveLength(1)
      expect(result[0]!.participantName).toBe('Alice')
    })

    it('extrai scoresByCategory do breakdown', async () => {
      mockCalculate.mockResolvedValueOnce(
        baseCalcResponse([makeRanking('p1', 'Alice', 1, 9.5)]),
      )
      const result = await service.buildClassification('e1', 'm1')
      expect(result[0]!.scoresByCategory['Técnica']).toBe(9.5)
    })
  })

  describe('buildTopN', () => {
    it('chama getTopN com topN do evento', async () => {
      mockPrisma.judgingEvent.findFirst.mockResolvedValueOnce({ topN: 5 })
      mockGetTopN.mockResolvedValueOnce(baseCalcResponse([makeRanking('p1', 'Alice', 1, 9.0)]))
      await service.buildTopN('e1', 'm1')
      expect(mockGetTopN).toHaveBeenCalledWith('e1', 'm1', 5)
    })

    it('usa topN=10 como default quando evento não encontrado', async () => {
      mockPrisma.judgingEvent.findFirst.mockResolvedValueOnce(null)
      mockGetTopN.mockResolvedValueOnce(baseCalcResponse([]))
      await service.buildTopN('e1', 'm1')
      expect(mockGetTopN).toHaveBeenCalledWith('e1', 'm1', 10)
    })

    it('se 8 participantes e top-10, retorna 8', async () => {
      mockPrisma.judgingEvent.findFirst.mockResolvedValueOnce({ topN: 10 })
      const rankings = Array.from({ length: 8 }, (_, i) =>
        makeRanking(`p${i}`, `P${i}`, i + 1, 10 - i),
      )
      mockGetTopN.mockResolvedValueOnce(baseCalcResponse(rankings))
      const result = await service.buildTopN('e1', 'm1')
      expect(result).toHaveLength(8)
    })
  })

  describe('buildAbsents', () => {
    it('retorna apenas ausentes', async () => {
      mockCalculate.mockResolvedValueOnce(
        baseCalcResponse(
          [makeRanking('p1', 'Alice', 1, 9.0)],
          [
            { participant: { id: 'p2', name: 'Bob' }, reason: 'ABSENT' },
            { participant: { id: 'p3', name: 'Carol' }, reason: 'NO_SCORES' },
          ],
        ),
      )
      const result = await service.buildAbsents('e1', 'm1')
      expect(result).toHaveLength(1)
      expect(result[0]!.participantName).toBe('Bob')
    })
  })

  describe('buildDetailedByJudge', () => {
    it('anonimiza jurados determinísticamente por ordem de id', async () => {
      mockCalculate.mockResolvedValueOnce(baseCalcResponse([]))
      mockPrisma.judge.findMany.mockResolvedValueOnce([
        { id: 'j-a', displayName: 'Judge A' },
        { id: 'j-b', displayName: 'Judge B' },
      ])
      mockPrisma.score.findMany.mockResolvedValueOnce([
        { judgeId: 'j-a', value: { toNumber: () => 8.0 }, participant: { name: 'Alice' }, category: { name: 'Técnica' } },
        { judgeId: 'j-b', value: { toNumber: () => 7.5 }, participant: { name: 'Alice' }, category: { name: 'Técnica' } },
      ])
      const result = await service.buildDetailedByJudge('e1', 'm1')
      expect(result[0]!.judgeAlias).toBe('Jurado 1')
      expect(result[1]!.judgeAlias).toBe('Jurado 2')
    })

    it('anonimização estável entre execuções', async () => {
      const setup = () => {
        mockCalculate.mockResolvedValueOnce(baseCalcResponse([]))
        mockPrisma.judge.findMany.mockResolvedValueOnce([
          { id: 'j-x', displayName: 'X' },
          { id: 'j-y', displayName: 'Y' },
        ])
        mockPrisma.score.findMany.mockResolvedValueOnce([])
      }
      setup()
      const r1 = await service.buildDetailedByJudge('e1', 'm1')
      setup()
      const r2 = await service.buildDetailedByJudge('e1', 'm1')
      expect(r1.map((e) => e.judgeAlias)).toEqual(r2.map((e) => e.judgeAlias))
    })
  })
})
