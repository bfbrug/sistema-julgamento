import { describe, it, expect, beforeEach, vi } from 'vitest'
import { ReportsController } from '../reports.controller'
import { ReportType } from '@prisma/client'
import * as fs from 'fs'

vi.mock('fs', async () => {
  const actual = await vi.importActual<typeof import('fs')>('fs')
  return {
    ...actual,
    createReadStream: vi.fn(),
  }
})

const mockReportsService = {
  enqueue: vi.fn(),
  getJobStatus: vi.fn(),
  download: vi.fn(),
  listJobsByEvent: vi.fn(),
}

const mockStorageService = {
  upload: vi.fn(),
  remove: vi.fn(),
  getPublicUrl: vi.fn(),
  exists: vi.fn(),
}

function makeController() {
  return new ReportsController(mockReportsService as never, mockStorageService as never)
}

describe('ReportsController', () => {
  let controller: ReportsController

  beforeEach(() => {
    vi.clearAllMocks()
    controller = makeController()
  })

  it('POST /generate: retorna jobId e status queued', async () => {
    mockReportsService.enqueue.mockResolvedValueOnce({ jobId: 'j1', status: 'queued' })
    const result = await controller.generate('e1', { type: ReportType.TOP_N }, { user: { sub: 'm1' } })
    expect(result).toEqual({ jobId: 'j1', status: 'queued' })
    expect(mockReportsService.enqueue).toHaveBeenCalledWith('e1', 'm1', ReportType.TOP_N)
  })

  it('GET /jobs/:jobId: retorna status do job', async () => {
    mockReportsService.getJobStatus.mockResolvedValueOnce({ id: 'j1', status: 'completed', progress: 100 })
    const result = await controller.getJobStatus('j1')
    expect(result.status).toBe('completed')
  })

  it('GET /: retorna lista de jobs por evento', async () => {
    mockReportsService.listJobsByEvent.mockResolvedValueOnce({ TOP_N: null, GENERAL: null, DETAILED_BY_JUDGE: null })
    const result = await controller.listJobs('e1')
    expect(result).toHaveProperty('TOP_N')
  })

  it('GET /:type/download: baixa PDF do job completed mais recente', async () => {
    mockReportsService.download.mockResolvedValueOnce('reports/mock.pdf')
    vi.mocked(fs.createReadStream).mockReturnValue('mock-stream' as any)
    
    const mockRes = {
      header: vi.fn(),
      send: vi.fn(),
    } as any

    await controller.download('e1', 'TOP_N', { user: { sub: 'm1' } }, mockRes)
    
    expect(mockReportsService.download).toHaveBeenCalledWith('e1', 'm1', ReportType.TOP_N)
    expect(mockRes.header).toHaveBeenCalledWith('Content-Type', 'application/pdf')
    expect(mockRes.header).toHaveBeenCalledWith('Content-Disposition', 'attachment; filename="mock.pdf"')
    expect(mockRes.send).toHaveBeenCalledWith('mock-stream')
  })
})
