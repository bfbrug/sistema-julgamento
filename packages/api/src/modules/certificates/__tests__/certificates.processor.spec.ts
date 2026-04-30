/* global Buffer */
import { CertificatesProcessor } from '../certificates.processor'
import { Job } from 'bullmq'
import { GenerateCertificatesJobPayload } from '../certificates.service'
import * as fs from 'fs'

vi.mock('fs', async () => {
  const actual = await vi.importActual<typeof import('fs')>('fs')
  return {
    ...actual,
    readFileSync: vi.fn(),
    existsSync: vi.fn(),
  }
})

vi.mock('../../config/env', () => ({
  env: { STORAGE_LOCAL_ROOT: '/tmp/uploads' },
}))

describe('CertificatesProcessor', () => {
  let processor: CertificatesProcessor

  const mockPdfService = { render: vi.fn() }
  const mockCertificatesService = { buildBatchData: vi.fn() }
  const mockRepository = { updateJob: vi.fn() }
  const mockAuditService = { record: vi.fn() }
  const mockStorageService = { upload: vi.fn() }
  const mockLogger = { info: vi.fn(), error: vi.fn(), warn: vi.fn() }

  beforeEach(() => {
    vi.clearAllMocks()

    vi.mocked(fs.existsSync).mockReturnValue(true)
    vi.mocked(fs.readFileSync).mockImplementation((filepath) => {
      if (typeof filepath === 'string' && filepath.endsWith('.hbs')) {
        return '<html>{{backgroundUrl}} {{#each participants}}{{this.name}}{{/each}}</html>'
      }
      return Buffer.from('fake-image')
    })

    processor = new CertificatesProcessor(
      mockPdfService as never,
      mockCertificatesService as never,
      mockRepository as never,
      mockAuditService as never,
      mockStorageService as never,
      mockLogger as never,
    )
  })

  it('processa lote e gera PDF com N páginas', async () => {
    const job = {
      data: { jobId: 'j1', eventId: 'e1', managerId: 'm1' },
      updateProgress: vi.fn(),
    } as unknown as Job<GenerateCertificatesJobPayload>

    mockCertificatesService.buildBatchData.mockResolvedValueOnce({
      backgroundPath: 'certificates/backgrounds/e1/bg.png',
      participants: [
        { id: 'p1', name: 'Ana', processedText: 'Certificamos que Ana participou' },
        { id: 'p2', name: 'Bruno', processedText: 'Certificamos que Bruno participou' },
      ],
      signatures: [
        { personName: 'Dir', personRole: 'Diretor', imagePath: 'sig.png', displayOrder: 1 },
      ],
    })

    mockPdfService.render.mockResolvedValueOnce(Buffer.from('pdf'))
    mockStorageService.upload.mockResolvedValueOnce({ path: 'certificates/generated/e1/file.pdf' })

    const result = await processor.process(job)

    expect(result.pdfPath).toBe('certificates/generated/e1/file.pdf')
    expect(mockPdfService.render).toHaveBeenCalledWith(
      expect.stringContaining('Ana'),
      expect.objectContaining({ landscape: true, format: 'A4' }),
    )
    expect(mockRepository.updateJob).toHaveBeenCalledWith('j1', expect.objectContaining({ progress: 100 }))
    expect(mockAuditService.record).toHaveBeenCalledWith(expect.objectContaining({ action: 'CERTIFICATE_BATCH_COMPLETED' }))
  })

  it('falha controladamente se background ausente', async () => {
    const job = {
      data: { jobId: 'j1', eventId: 'e1', managerId: 'm1' },
      updateProgress: vi.fn(),
    } as unknown as Job<GenerateCertificatesJobPayload>

    mockCertificatesService.buildBatchData.mockRejectedValueOnce(new Error('Background do certificado não configurado'))

    await expect(processor.process(job)).rejects.toThrow('Background do certificado não configurado')
    expect(mockRepository.updateJob).toHaveBeenCalledWith('j1', expect.objectContaining({ status: 'FAILED' }))
    expect(mockAuditService.record).toHaveBeenCalledWith(expect.objectContaining({ action: 'CERTIFICATE_BATCH_FAILED' }))
  })
})
