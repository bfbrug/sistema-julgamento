import { describe, it, expect, beforeEach, vi } from 'vitest'
import { BadRequestException } from '@nestjs/common'
import { ResultReleasesService } from '../result-releases.service'

const mockPrisma = {
  judgingEvent: { findUniqueOrThrow: vi.fn() },
  resultRelease: {
    create: vi.fn(),
    delete: vi.fn(),
    findMany: vi.fn(),
    findUniqueOrThrow: vi.fn(),
  },
}

const mockAudit = { record: vi.fn() }

const mockRankingBuilder = { computeOverallRanking: vi.fn() }

function makeService() {
  return new ResultReleasesService(
    mockPrisma as never,
    mockAudit as never,
    mockRankingBuilder as never,
  )
}

const FINISHED_EVENT = { id: 'e1', status: 'FINISHED', managerId: 'm1', genderMode: 'MIXED' }

const MIXED_RANKING = {
  mode: 'MIXED' as const,
  entries: [
    { participantId: 'p1', name: 'João', totalScore: 30, position: 1 },
    { participantId: 'p2', name: 'Ana', totalScore: 28, position: 2 },
  ],
}

describe('ResultReleasesService', () => {
  let service: ResultReleasesService

  beforeEach(() => {
    vi.clearAllMocks()
    service = makeService()
  })

  describe('release', () => {
    it('libera posição do ranking geral em evento MIXED', async () => {
      mockPrisma.judgingEvent.findUniqueOrThrow.mockResolvedValueOnce(FINISHED_EVENT)
      mockRankingBuilder.computeOverallRanking.mockResolvedValueOnce(MIXED_RANKING)
      mockPrisma.resultRelease.create.mockResolvedValueOnce({ id: 'r1', eventId: 'e1', gender: null, position: 1 })

      const created = await service.release('e1', 'u1', { position: 1 })
      expect(created).toMatchObject({ eventId: 'e1', gender: null, position: 1 })
    })

    it('libera split MALE em evento UNISEX_SPLIT', async () => {
      mockPrisma.judgingEvent.findUniqueOrThrow.mockResolvedValueOnce({ ...FINISHED_EVENT, genderMode: 'UNISEX_SPLIT' })
      mockRankingBuilder.computeOverallRanking.mockResolvedValueOnce({
        mode: 'UNISEX_SPLIT',
        male: [{ participantId: 'm1', name: 'M', totalScore: 9, position: 1 }],
        female: [],
      })
      mockPrisma.resultRelease.create.mockResolvedValueOnce({ id: 'r1', eventId: 'e1', gender: 'MALE', position: 1 })

      const created = await service.release('e1', 'u1', { gender: 'MALE', position: 1 })
      expect(created.gender).toBe('MALE')
    })

    it('rejeita gender em evento MIXED', async () => {
      mockPrisma.judgingEvent.findUniqueOrThrow.mockResolvedValueOnce(FINISHED_EVENT)
      await expect(service.release('e1', 'u1', { gender: 'MALE', position: 1 }))
        .rejects.toThrow(/MIXED.*não aceita gênero/)
    })

    it('exige gender em UNISEX_SPLIT', async () => {
      mockPrisma.judgingEvent.findUniqueOrThrow.mockResolvedValueOnce({ ...FINISHED_EVENT, genderMode: 'UNISEX_SPLIT' })
      await expect(service.release('e1', 'u1', { position: 1 }))
        .rejects.toThrow(/UNISEX_SPLIT.*exige gênero/)
    })

    it('valida posição existe no ranking geral', async () => {
      mockPrisma.judgingEvent.findUniqueOrThrow.mockResolvedValueOnce(FINISHED_EVENT)
      mockRankingBuilder.computeOverallRanking.mockResolvedValueOnce(MIXED_RANKING)
      await expect(service.release('e1', 'u1', { position: 5 })).rejects.toThrow(/Posição 5/)
    })

    it('rejeita se evento não está FINISHED', async () => {
      mockPrisma.judgingEvent.findUniqueOrThrow.mockResolvedValueOnce({ ...FINISHED_EVENT, status: 'IN_PROGRESS' })
      await expect(service.release('e1', 'u1', { position: 1 })).rejects.toThrow('encerrado')
    })
  })

  describe('getFullRanking', () => {
    it('retorna ranking geral do evento', async () => {
      mockPrisma.judgingEvent.findUniqueOrThrow.mockResolvedValueOnce({ managerId: 'm1', genderMode: 'UNISEX_SPLIT' })
      mockRankingBuilder.computeOverallRanking.mockResolvedValueOnce({
        mode: 'UNISEX_SPLIT',
        male: [],
        female: [],
      })
      const r = await service.getFullRanking('e1')
      expect(r).toEqual({ genderMode: 'UNISEX_SPLIT', ranking: { mode: 'UNISEX_SPLIT', male: [], female: [] } })
    })
  })

  describe('revert', () => {
    it('remove release e grava audit log', async () => {
      mockPrisma.resultRelease.findUniqueOrThrow.mockResolvedValueOnce({
        id: 'r1', eventId: 'e1', gender: null, position: 1,
      })
      mockPrisma.resultRelease.delete.mockResolvedValueOnce({})

      const result = await service.revert('e1', 'u1', 'r1')
      expect(result).toEqual({ id: 'r1' })
      expect(mockPrisma.resultRelease.delete).toHaveBeenCalledWith({ where: { id: 'r1' } })
      expect(mockAudit.record).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'RESULT_UNRELEASED' }),
      )
    })

    it('rejeita release de outro evento', async () => {
      mockPrisma.resultRelease.findUniqueOrThrow.mockResolvedValueOnce({
        id: 'r1', eventId: 'outro', gender: null, position: 1,
      })
      await expect(service.revert('e1', 'u1', 'r1')).rejects.toThrow('não pertence')
    })
  })

  describe('list', () => {
    it('retorna releases ordenados por gender, position', async () => {
      mockPrisma.resultRelease.findMany.mockResolvedValueOnce([{ id: 'r1' }])
      const result = await service.list('e1')
      expect(result).toHaveLength(1)
      expect(mockPrisma.resultRelease.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { eventId: 'e1' },
          orderBy: [{ gender: 'asc' }, { position: 'asc' }],
        }),
      )
    })
  })
})
