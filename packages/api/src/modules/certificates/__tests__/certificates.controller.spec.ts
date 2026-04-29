import { describe, it, expect, beforeEach, vi } from 'vitest'
import { CertificatesController } from '../certificates.controller'
import { FastifyReply, FastifyRequest } from 'fastify'
import * as fs from 'fs'

vi.mock('fs', async () => {
  const actual = await vi.importActual<typeof import('fs')>('fs')
  return {
    ...actual,
    createReadStream: vi.fn(),
  }
})

const mockCertificatesService = {
  getConfig: vi.fn(),
  updateText: vi.fn(),
  uploadBackground: vi.fn(),
  removeBackground: vi.fn(),
  addSignature: vi.fn(),
  updateSignature: vi.fn(),
  removeSignature: vi.fn(),
  enqueueBatchGeneration: vi.fn(),
  getJobStatus: vi.fn(),
  download: vi.fn(),
}

const mockStorageService = {
  upload: vi.fn(),
  remove: vi.fn(),
  getPublicUrl: vi.fn(),
  exists: vi.fn(),
}

function makeController() {
  return new CertificatesController(mockCertificatesService as never, mockStorageService as never)
}

describe('CertificatesController', () => {
  let controller: CertificatesController

  beforeEach(() => {
    vi.clearAllMocks()
    controller = makeController()
  })

  it('GET /config retorna configuração', async () => {
    mockCertificatesService.getConfig.mockResolvedValueOnce({ backgroundPath: 'bg.png', certificateText: 'texto' })
    const result = await controller.getConfig('e1', { user: { sub: 'm1' } })
    expect(result!.backgroundPath).toBe('bg.png')
  })

  it('PUT /config atualiza texto', async () => {
    mockCertificatesService.updateText.mockResolvedValueOnce({ certificateText: 'novo' })
    const result = await controller.updateConfig('e1', { certificateText: 'novo' }, { user: { sub: 'm1' } })
    expect(result.certificateText).toBe('novo')
  })

  it('POST /generate retorna jobId', async () => {
    mockCertificatesService.enqueueBatchGeneration.mockResolvedValueOnce({ jobId: 'j1', status: 'queued' })
    const result = await controller.generate('e1', { user: { sub: 'm1' } })
    expect(result.jobId).toBe('j1')
  })

  it('GET /jobs/:id retorna status', async () => {
    mockCertificatesService.getJobStatus.mockResolvedValueOnce({ id: 'j1', status: 'COMPLETED' })
    const result = await controller.getJobStatus('j1')
    expect(result!.status).toBe('COMPLETED')
  })

  it('POST /background com JPEG válido → 201', async () => {
    mockCertificatesService.uploadBackground.mockResolvedValueOnce({ path: 'bg.png', publicUrl: '/uploads/bg.png' })
    const mockReq = {
      file: vi.fn().mockResolvedValueOnce({ toBuffer: vi.fn().mockResolvedValueOnce(Buffer.from('img')), filename: 'bg.jpg', fields: {} }),
    } as unknown as FastifyRequest
    const result = await controller.uploadBackground('e1', mockReq, { user: { sub: 'm1' } })
    expect(result.path).toBe('bg.png')
  })

  it('POST /signatures adiciona assinatura', async () => {
    mockCertificatesService.addSignature.mockResolvedValueOnce({ id: 's1', path: 'sig.png', publicUrl: '/uploads/sig.png', displayOrder: 1 })
    const mockReq = {
      file: vi.fn().mockResolvedValueOnce({
        toBuffer: vi.fn().mockResolvedValueOnce(Buffer.from('img')),
        filename: 'sig.png',
        fields: { personName: { value: 'Ana' }, personRole: { value: 'Dir' }, displayOrder: { value: '1' } },
      }),
    } as unknown as FastifyRequest
    const result = await controller.addSignature('e1', mockReq, { user: { sub: 'm1' } })
    expect(result.id).toBe('s1')
  })

  it('PUT /signatures/:id atualiza assinatura', async () => {
    mockCertificatesService.updateSignature.mockResolvedValueOnce({ id: 's1', personName: 'Ana', personRole: 'Dir', displayOrder: 1 })
    const result = await controller.updateSignature('e1', 's1', { personName: 'Ana' }, { user: { sub: 'm1' } })
    expect(result).toBeDefined()
  })

  it('DELETE /signatures/:id remove assinatura', async () => {
    await controller.removeSignature('e1', 's1', { user: { sub: 'm1' } })
    expect(mockCertificatesService.removeSignature).toHaveBeenCalledWith('e1', 'm1', 's1')
  })

  it('DELETE /background remove background', async () => {
    await controller.removeBackground('e1', { user: { sub: 'm1' } })
    expect(mockCertificatesService.removeBackground).toHaveBeenCalledWith('e1', 'm1')
  })

  it('GET /download envia stream', async () => {
    mockCertificatesService.download.mockResolvedValueOnce('certificates/e1/file.pdf')
    vi.mocked(fs.createReadStream).mockReturnValue('mock-stream' as unknown as fs.ReadStream)

    const mockRes = {
      header: vi.fn(),
      send: vi.fn(),
    } as unknown as FastifyReply

    await controller.download('e1', { user: { sub: 'm1' } }, mockRes)
    expect(mockRes.header).toHaveBeenCalledWith('Content-Type', 'application/pdf')
    expect(mockRes.send).toHaveBeenCalledWith('mock-stream')
  })
})
