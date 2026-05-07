import { describe, it, expect, beforeEach, vi } from 'vitest'
import { BadRequestException } from '@nestjs/common'
import { ResultReleasesService } from '../result-releases.service'

const mockPrisma = {
  judgingEvent: { findUniqueOrThrow: vi.fn() },
  category: { findUniqueOrThrow: vi.fn() },
  resultRelease: {
    create: vi.fn(),
    delete: vi.fn(),
    findMany: vi.fn(),
    findUniqueOrThrow: vi.fn(),
  },
}

const mockAudit = { record: vi.fn() }

const mockRankingBuilder = { computeRanking: vi.fn() }

function makeService() {
  return new ResultReleasesService(
    mockPrisma as never,
    mockAudit as never,
    mockRankingBuilder as never,
  )
}

const FINISHED_EVENT = { id: 'e1', status: 'FINISHED', managerId: 'm1' }
const MIXED_CATEGORY = { eventId: 'e1', genderMode: 'MIXED' }

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
    it('rejeita se evento não está FINISHED', async () => {
      mockPrisma.judgingEvent.findUniqueOrThrow.mockResolvedValueOnce({ status: 'IN_PROGRESS', managerId: 'm1' })
      await expect(
        service.release('e1', 'u1', { categoryId: 'cat1', gender: null, position: 1 }),
      ).rejects.toThrow('encerrado')
    })

    it('rejeita categoria de outro evento', async () => {
      mockPrisma.judgingEvent.findUniqueOrThrow.mockResolvedValueOnce(FINISHED_EVENT)
      mockPrisma.category.findUniqueOrThrow.mockResolvedValueOnce({ eventId: 'outro', genderMode: 'MIXED' })
      await expect(
        service.release('e1', 'u1', { categoryId: 'cat1', gender: null, position: 1 }),
      ).rejects.toThrow('não pertence')
    })

    it('rejeita gender em categoria MIXED', async () => {
      mockPrisma.judgingEvent.findUniqueOrThrow.mockResolvedValueOnce(FINISHED_EVENT)
      mockPrisma.category.findUniqueOrThrow.mockResolvedValueOnce(MIXED_CATEGORY)
      mockRankingBuilder.computeRanking.mockResolvedValueOnce(MIXED_RANKING)
      await expect(
        service.release('e1', 'u1', { categoryId: 'cat1', gender: 'MALE', position: 1 }),
      ).rejects.toThrow('mista não aceita')
    })

    it('rejeita posição fora do ranking', async () => {
      mockPrisma.judgingEvent.findUniqueOrThrow.mockResolvedValueOnce(FINISHED_EVENT)
      mockPrisma.category.findUniqueOrThrow.mockResolvedValueOnce(MIXED_CATEGORY)
      mockRankingBuilder.computeRanking.mockResolvedValueOnce(MIXED_RANKING)
      await expect(
        service.release('e1', 'u1', { categoryId: 'cat1', gender: null, position: 5 }),
      ).rejects.toThrow('não disponível')
    })

    it('cria release e grava audit log', async () => {
      mockPrisma.judgingEvent.findUniqueOrThrow.mockResolvedValueOnce(FINISHED_EVENT)
      mockPrisma.category.findUniqueOrThrow.mockResolvedValueOnce(MIXED_CATEGORY)
      mockRankingBuilder.computeRanking.mockResolvedValueOnce(MIXED_RANKING)
      mockPrisma.resultRelease.create.mockResolvedValueOnce({ id: 'r1', position: 1, gender: null })

      const result = await service.release('e1', 'u1', { categoryId: 'cat1', gender: null, position: 1 })

      expect(result.position).toBe(1)
      expect(mockPrisma.resultRelease.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ position: 1, gender: null }) }),
      )
      expect(mockAudit.record).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'RESULT_RELEASED' }),
      )
    })

    it('MALE_ONLY rejeita gender não-MALE', async () => {
      mockPrisma.judgingEvent.findUniqueOrThrow.mockResolvedValueOnce(FINISHED_EVENT)
      mockPrisma.category.findUniqueOrThrow.mockResolvedValueOnce({ eventId: 'e1', genderMode: 'MALE_ONLY' })
      await expect(
        service.release('e1', 'u1', { categoryId: 'cat1', gender: 'FEMALE', position: 1 }),
      ).rejects.toThrow(BadRequestException)
    })

    it('UNISEX_SPLIT rejeita gender null', async () => {
      mockPrisma.judgingEvent.findUniqueOrThrow.mockResolvedValueOnce(FINISHED_EVENT)
      mockPrisma.category.findUniqueOrThrow.mockResolvedValueOnce({ eventId: 'e1', genderMode: 'UNISEX_SPLIT' })
      await expect(
        service.release('e1', 'u1', { categoryId: 'cat1', gender: null, position: 1 }),
      ).rejects.toThrow(BadRequestException)
    })

    it('UNISEX_SPLIT usa coluna feminina quando gender=FEMALE', async () => {
      mockPrisma.judgingEvent.findUniqueOrThrow.mockResolvedValueOnce(FINISHED_EVENT)
      mockPrisma.category.findUniqueOrThrow.mockResolvedValueOnce({ eventId: 'e1', genderMode: 'UNISEX_SPLIT' })
      mockRankingBuilder.computeRanking.mockResolvedValueOnce({
        mode: 'UNISEX_SPLIT' as const,
        male: [{ participantId: 'm1', name: 'João', totalScore: 30, position: 1 }],
        female: [{ participantId: 'f1', name: 'Ana', totalScore: 28, position: 1 }],
      })
      mockPrisma.resultRelease.create.mockResolvedValueOnce({ id: 'r1', position: 1, gender: 'FEMALE' })

      const result = await service.release('e1', 'u1', { categoryId: 'cat1', gender: 'FEMALE', position: 1 })
      expect(result.gender).toBe('FEMALE')
      expect(mockPrisma.resultRelease.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ gender: 'FEMALE' }) }),
      )
    })
  })

  describe('revert', () => {
    it('remove release e grava audit log', async () => {
      mockPrisma.resultRelease.findUniqueOrThrow.mockResolvedValueOnce({
        id: 'r1', eventId: 'e1', categoryId: 'cat1', gender: null, position: 1,
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
        id: 'r1', eventId: 'outro', categoryId: 'cat1', gender: null, position: 1,
      })
      await expect(service.revert('e1', 'u1', 'r1')).rejects.toThrow('não pertence')
    })
  })

  describe('list', () => {
    it('retorna releases ordenados', async () => {
      mockPrisma.resultRelease.findMany.mockResolvedValueOnce([{ id: 'r1' }])
      const result = await service.list('e1')
      expect(result).toHaveLength(1)
      expect(mockPrisma.resultRelease.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { eventId: 'e1' } }),
      )
    })
  })
})
