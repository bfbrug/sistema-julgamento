import { describe, it, expect, beforeEach, vi } from 'vitest'
import { UnprocessableEntityException, NotFoundException } from '@nestjs/common'
import { ReportsService } from '../reports.service'
import { EventStatus, ReportType } from '@prisma/client'

const mockRepository = {
  getEventStatus: vi.fn(),
  countFinishedScores: vi.fn(),
  countPendingJudges: vi.fn(),
  create: vi.fn(),
  findById: vi.fn(),
  findLastCompleted: vi.fn(),
}
const mockQueue = { add: vi.fn().mockResolvedValue({}) }
const mockAudit = { record: vi.fn().mockResolvedValue(undefined) }
const mockStorage = { exists: vi.fn().mockResolvedValue(true) }
const mockLogger = { info: vi.fn(), error: vi.fn(), warn: vi.fn() }
const mockPrisma = { $transaction: vi.fn(async (cb: any) => cb({ auditLog: { create: vi.fn() } })) }

function makeService() {
  return new ReportsService(
    mockRepository as never,
    mockQueue as never,
    mockAudit as never,
    mockStorage as never,
    mockLogger as never,
    mockPrisma as never,
  )
}

describe('ReportsService', () => {
  let service: ReportsService

  beforeEach(() => {
    vi.clearAllMocks()
    service = makeService()
  })

  describe('enqueue', () => {
    it('lança 422 quando evento em DRAFT', async () => {
      mockRepository.getEventStatus.mockResolvedValueOnce({ status: EventStatus.DRAFT })
      await expect(service.enqueue('e1', 'm1', ReportType.TOP_N)).rejects.toThrow(
        UnprocessableEntityException,
      )
    })

    it('lança 422 quando sem notas', async () => {
      mockRepository.getEventStatus.mockResolvedValueOnce({
        status: EventStatus.IN_PROGRESS, topN: 10, name: 'Ev', eventDate: new Date(), location: 'L', organizer: 'O',
      })
      mockRepository.countFinishedScores.mockResolvedValueOnce(0)
      await expect(service.enqueue('e1', 'm1', ReportType.TOP_N)).rejects.toThrow(
        UnprocessableEntityException,
      )
    })

    it('enfileira job e retorna jobId quando ok', async () => {
      mockRepository.getEventStatus.mockResolvedValueOnce({
        status: EventStatus.FINISHED, topN: 10, name: 'Ev', eventDate: new Date(), location: 'L', organizer: 'O',
      })
      mockRepository.countFinishedScores.mockResolvedValueOnce(5)
      mockRepository.create.mockResolvedValueOnce({ id: 'job-1' })
      const result = await service.enqueue('e1', 'm1', ReportType.GENERAL)
      expect(result.jobId).toBe('job-1')
      expect(result.status).toBe('queued')
      expect(mockQueue.add).toHaveBeenCalled()
      expect(mockAudit.record).toHaveBeenCalledWith(expect.objectContaining({ action: 'REPORT_GENERATION_QUEUED' }), expect.anything())
    })

    it('retorna warning quando há jurados pendentes em IN_PROGRESS', async () => {
      mockRepository.getEventStatus.mockResolvedValueOnce({
        status: EventStatus.IN_PROGRESS, topN: 10, name: 'Ev', eventDate: new Date(), location: 'L', organizer: 'O',
      })
      mockRepository.countFinishedScores.mockResolvedValueOnce(3)
      mockRepository.countPendingJudges.mockResolvedValueOnce(2)
      mockRepository.create.mockResolvedValueOnce({ id: 'job-2' })
      const result = await service.enqueue('e1', 'm1', ReportType.TOP_N)
      expect(result.warning).toContain('2 jurado(s)')
    })

    it('lança 404 quando evento não encontrado', async () => {
      mockRepository.getEventStatus.mockResolvedValueOnce(null)
      await expect(service.enqueue('e1', 'm1', ReportType.TOP_N)).rejects.toThrow(NotFoundException)
    })
  })

  describe('download', () => {
    it('lança 404 quando não há job completed', async () => {
      mockRepository.getEventStatus.mockResolvedValueOnce({ status: EventStatus.FINISHED })
      mockRepository.findLastCompleted.mockResolvedValueOnce(null)
      await expect(service.download('e1', 'm1', ReportType.TOP_N)).rejects.toThrow(NotFoundException)
    })

    it('retorna filePath quando job completed existe', async () => {
      mockRepository.getEventStatus.mockResolvedValueOnce({ status: EventStatus.FINISHED })
      mockRepository.findLastCompleted.mockResolvedValueOnce({ id: 'job-1', filePath: 'reports/e1/TOP_N/file.pdf' })
      const path = await service.download('e1', 'm1', ReportType.TOP_N)
      expect(path).toBe('reports/e1/TOP_N/file.pdf')
      expect(mockAudit.record).toHaveBeenCalledWith(expect.objectContaining({ action: 'REPORT_DOWNLOADED' }))
    })
  })
})
