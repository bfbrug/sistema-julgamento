import { ReportsProcessor } from '../reports.processor'
import { ReportType, ReportJobStatus } from '@prisma/client'
import { Job } from 'bullmq'
import { GenerateReportJobPayload } from '../reports.service'
import * as fs from 'fs'

vi.mock('fs', async () => {
  const actual = await vi.importActual<typeof import('fs')>('fs')
  return {
    ...actual,
    existsSync: vi.fn(),
    readdirSync: vi.fn(),
    readFileSync: vi.fn(),
  }
})

describe('ReportsProcessor', () => {
  let processor: ReportsProcessor

  const mockPdfService = {
    render: vi.fn(),
  }

  const mockRankingBuilder = {
    buildTopN: vi.fn(),
    buildClassification: vi.fn(),
    buildAbsents: vi.fn(),
    buildDetailedByJudge: vi.fn(),
  }

  const mockRepository = {
    update: vi.fn(),
    getEventStatus: vi.fn(),
  }

  const mockAuditService = {
    record: vi.fn(),
  }

  const mockStorageService = {
    upload: vi.fn(),
  }

  beforeEach(async () => {
    vi.clearAllMocks()

    // Mock das operacoes de template
    vi.mocked(fs.existsSync).mockReturnValue(true)
    vi.mocked(fs.readdirSync).mockReturnValue(['footer.hbs'] as any)
    vi.mocked(fs.readFileSync).mockReturnValue('template-content')

    processor = new ReportsProcessor(
      mockPdfService as any,
      mockRankingBuilder as any,
      mockRepository as any,
      mockAuditService as any,
      mockStorageService as any
    )
  })

  it('process() TOP_N should generate pdf and upload', async () => {
    const job = {
      data: { jobId: 'j1', eventId: 'e1', managerId: 'm1', type: ReportType.TOP_N },
      updateProgress: vi.fn(),
    } as unknown as Job<GenerateReportJobPayload>

    mockRepository.getEventStatus.mockResolvedValueOnce({
      name: 'Event',
      eventDate: new Date(),
      location: 'Local',
      organizer: 'Org',
      topN: 10,
    })

    mockRankingBuilder.buildTopN.mockResolvedValueOnce([
      { position: 1, participantName: 'A' },
    ])

    mockPdfService.render.mockResolvedValueOnce(Buffer.from('pdf'))
    mockStorageService.upload.mockResolvedValueOnce({ path: 'reports/top_n.pdf' })

    const result = await processor.process(job)
    
    expect(result).toEqual({ pdfPath: 'reports/top_n.pdf' })
    expect(mockRepository.update).toHaveBeenCalledWith('j1', expect.objectContaining({ progress: 100, status: ReportJobStatus.COMPLETED }))
    expect(job.updateProgress).toHaveBeenCalledWith(100)
    expect(mockAuditService.record).toHaveBeenCalledWith(expect.objectContaining({ action: 'REPORT_GENERATION_COMPLETED' }))
  })

  it('process() GENERAL should generate pdf and upload', async () => {
    const job = {
      data: { jobId: 'j1', eventId: 'e1', managerId: 'm1', type: ReportType.GENERAL },
      updateProgress: vi.fn(),
    } as unknown as Job<GenerateReportJobPayload>

    mockRepository.getEventStatus.mockResolvedValueOnce({
      name: 'Event', eventDate: new Date(), location: 'Local', organizer: 'Org',
    })

    mockRankingBuilder.buildClassification.mockResolvedValueOnce([])
    mockRankingBuilder.buildAbsents.mockResolvedValueOnce([])

    mockPdfService.render.mockResolvedValueOnce(Buffer.from('pdf'))
    mockStorageService.upload.mockResolvedValueOnce({ path: 'reports/general.pdf' })

    const result = await processor.process(job)
    expect(result.pdfPath).toBe('reports/general.pdf')
  })

  it('process() DETAILED_BY_JUDGE should generate pdf and upload', async () => {
    const job = {
      data: { jobId: 'j1', eventId: 'e1', managerId: 'm1', type: ReportType.DETAILED_BY_JUDGE },
      updateProgress: vi.fn(),
    } as unknown as Job<GenerateReportJobPayload>

    mockRepository.getEventStatus.mockResolvedValueOnce({
      name: 'Event', eventDate: new Date(), location: 'Local', organizer: 'Org',
    })

    mockRankingBuilder.buildDetailedByJudge.mockResolvedValueOnce([])

    mockPdfService.render.mockResolvedValueOnce(Buffer.from('pdf'))
    mockStorageService.upload.mockResolvedValueOnce({ path: 'reports/detailed.pdf' })

    const result = await processor.process(job)
    expect(result.pdfPath).toBe('reports/detailed.pdf')
    // Verifica se pediu landscape
    expect(mockPdfService.render).toHaveBeenCalledWith(expect.any(String), { landscape: true })
  })

  it('process() should fail if event not found', async () => {
    const job = {
      data: { jobId: 'j1', eventId: 'e1', managerId: 'm1', type: ReportType.TOP_N },
      updateProgress: vi.fn(),
    } as unknown as Job<GenerateReportJobPayload>

    mockRepository.getEventStatus.mockResolvedValueOnce(null)

    await expect(processor.process(job)).rejects.toThrow('Evento não encontrado')

    expect(mockRepository.update).toHaveBeenCalledWith('j1', expect.objectContaining({ status: ReportJobStatus.FAILED }))
    expect(mockAuditService.record).toHaveBeenCalledWith(expect.objectContaining({ action: 'REPORT_GENERATION_FAILED' }))
  })
})
