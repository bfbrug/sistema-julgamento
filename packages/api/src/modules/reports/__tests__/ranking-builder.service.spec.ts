import { describe, it, expect, beforeEach, vi } from 'vitest'
import { RankingBuilderService } from '../ranking-builder.service'

const mockCalculate = vi.fn()
const mockGetTopN = vi.fn()
const mockPrisma = {
  judgingEvent: { findFirst: vi.fn(), findUniqueOrThrow: vi.fn() },
  judge: { findMany: vi.fn() },
  score: { findMany: vi.fn() },
  category: { findUniqueOrThrow: vi.fn(), findMany: vi.fn() },
  participant: { findMany: vi.fn() },
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

  describe('computeOverallRanking', () => {
    const makeParticipants = () => [
      { id: 'm1', name: 'João', gender: 'MALE' },
      { id: 'm2', name: 'Pedro', gender: 'MALE' },
      { id: 'm3', name: 'Carlos', gender: 'MALE' },
      { id: 'f1', name: 'Ana', gender: 'FEMALE' },
      { id: 'f2', name: 'Maria', gender: 'FEMALE' },
      { id: 'f3', name: 'Clara', gender: 'FEMALE' },
    ]

    const makeCalcWithScores = () =>
      baseCalcResponse([
        makeRanking('m1', 'João', 1, 30),
        makeRanking('f1', 'Ana', 2, 28),
        makeRanking('m2', 'Pedro', 3, 25),
        makeRanking('f2', 'Maria', 4, 22),
        makeRanking('m3', 'Carlos', 5, 20),
        makeRanking('f3', 'Clara', 6, 18),
      ])

    const setupEvent = (genderMode: string, topN = 2) => {
      mockPrisma.judgingEvent.findUniqueOrThrow.mockResolvedValueOnce({
        genderMode,
        topN,
      })
    }

    it('MIXED retorna entries únicos ordenados desc por finalScore (top-N do evento)', async () => {
      setupEvent('MIXED', 3)
      mockCalculate.mockResolvedValueOnce(makeCalcWithScores())
      mockPrisma.participant.findMany.mockResolvedValueOnce(makeParticipants())

      const r = await service.computeOverallRanking('e1', 'm1')
      expect(r.mode).toBe('MIXED')
      if (r.mode !== 'MIXED') return
      expect(r.entries).toHaveLength(3)
      expect(r.entries[0]!.participantId).toBe('m1')
      expect(r.entries[1]!.participantId).toBe('f1')
      expect(r.entries[2]!.participantId).toBe('m2')
      expect(r.entries[0]!.position).toBe(1)
      expect(r.entries[1]!.position).toBe(2)
      expect(r.entries[2]!.position).toBe(3)
    })

    it('UNISEX_SPLIT retorna male e female separados, cada um até topN', async () => {
      setupEvent('UNISEX_SPLIT', 2)
      mockCalculate.mockResolvedValueOnce(makeCalcWithScores())
      mockPrisma.participant.findMany.mockResolvedValueOnce(makeParticipants())

      const r = await service.computeOverallRanking('e1', 'm1')
      expect(r.mode).toBe('UNISEX_SPLIT')
      if (r.mode !== 'UNISEX_SPLIT') return
      expect(r.male).toHaveLength(2)
      expect(r.female).toHaveLength(2)
      expect(r.male[0]!.participantId).toBe('m1')
      expect(r.female[0]!.participantId).toBe('f1')
      expect(r.male[0]!.position).toBe(1)
      expect(r.female[0]!.position).toBe(1)
    })

    it('MALE_ONLY filtra apenas masculinos', async () => {
      setupEvent('MALE_ONLY', 5)
      mockCalculate.mockResolvedValueOnce(makeCalcWithScores())
      mockPrisma.participant.findMany.mockResolvedValueOnce(makeParticipants())

      const r = await service.computeOverallRanking('e1', 'm1')
      expect(r.mode).toBe('MALE_ONLY')
      if (r.mode !== 'MALE_ONLY') return
      expect(r.entries).toHaveLength(3)
      expect(r.entries.every((e) => ['m1', 'm2', 'm3'].includes(e.participantId))).toBe(true)
    })

    it('respeita calculationRule R2 do evento (delegado a CalculationService)', async () => {
      setupEvent('MIXED', 10)
      mockCalculate.mockResolvedValueOnce(makeCalcWithScores())
      mockPrisma.participant.findMany.mockResolvedValueOnce(makeParticipants())

      await service.computeOverallRanking('e1', 'm1')
      expect(mockCalculate).toHaveBeenCalledWith('e1', 'm1')
    })
  })

  describe('buildTopNByCategory', () => {
    const makeCalc = () =>
      baseCalcResponse([
        makeRanking('m1', 'João', 1, 9.0),
        makeRanking('f1', 'Ana', 2, 8.0),
      ])

    it('retorna entries por categoria sem split de gênero', async () => {
      mockPrisma.category.findMany.mockResolvedValueOnce([
        { id: 'cat1', name: 'Técnica' },
      ])
      mockPrisma.judgingEvent.findUniqueOrThrow.mockResolvedValueOnce({ topN: 10 })
      mockCalculate.mockResolvedValueOnce(makeCalc())

      const result = await service.buildTopNByCategory('e1', 'm1')
      expect(result).toHaveLength(1)
      expect(result[0]!.categoryId).toBe('cat1')
      expect(result[0]!.categoryName).toBe('Técnica')
      expect(result[0]!.entries).toHaveLength(2)
      expect(result[0]!.entries[0]!.participantName).toBe('João')
      expect(result[0]!.entries[1]!.participantName).toBe('Ana')
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
