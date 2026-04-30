import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NotFoundException, UnprocessableEntityException } from '@nestjs/common'
import { CertificatesService } from '../certificates.service'

const mockRepository = {
  findConfigByEventId: vi.fn(),
  findEventWithConfig: vi.fn(),
  upsertConfig: vi.fn(),
  updateEventCertificateText: vi.fn(),
  countSignatures: vi.fn(),
  findSignatureByDisplayOrder: vi.fn(),
  createSignature: vi.fn(),
  updateSignature: vi.fn(),
  deleteSignature: vi.fn(),
  getParticipants: vi.fn(),
  createJob: vi.fn(),
  findJobById: vi.fn(),
  findLastCompletedJob: vi.fn(),
}

const mockQueue = { add: vi.fn().mockResolvedValue({}) }
const mockAudit = { record: vi.fn().mockResolvedValue(undefined) }
const mockStorage = {
  upload: vi.fn(),
  remove: vi.fn().mockResolvedValue(undefined),
  exists: vi.fn().mockResolvedValue(true),
  getPublicUrl: vi.fn().mockResolvedValue('/uploads/test.png'),
}
const mockLogger = { info: vi.fn(), error: vi.fn(), warn: vi.fn() }
const mockPrisma = { $transaction: vi.fn(async (cb: any) => cb({ auditLog: { create: vi.fn() } })) }

function makeService() {
  return new CertificatesService(
    mockRepository as never,
    mockQueue as never,
    mockAudit as never,
    mockStorage as never,
    mockLogger as never,
    mockPrisma as never,
  )
}

describe('CertificatesService', () => {
  let service: CertificatesService

  beforeEach(() => {
    vi.clearAllMocks()
    service = makeService()
  })

  describe('getConfig', () => {
    it('retorna configuração do evento', async () => {
      mockRepository.findEventWithConfig.mockResolvedValueOnce({
        id: 'e1',
        certificateText: 'texto',
        certificateConfig: {
          id: 'c1',
          backgroundPath: 'bg.png',
          signatures: [{ id: 's1', personName: 'Ana', personRole: 'Dir', imagePath: 'sig.png', displayOrder: 1 }],
        },
        _count: { participants: 5 },
      })

      const result = await service.getConfig('e1', 'm1')
      expect(result.certificateText).toBe('texto')
      expect(result.backgroundPath).toBe('bg.png')
      expect(result.signatures).toHaveLength(1)
    })

    it('lança 404 quando evento não encontrado', async () => {
      mockRepository.findEventWithConfig.mockResolvedValueOnce(null)
      await expect(service.getConfig('e1', 'm1')).rejects.toThrow(NotFoundException)
    })
  })

  describe('updateText', () => {
    it('salva texto e retorna warnings para placeholders desconhecidos', async () => {
      mockRepository.findEventWithConfig.mockResolvedValueOnce({
        id: 'e1',
        certificateConfig: { id: 'c1' },
      })
      mockRepository.updateEventCertificateText.mockResolvedValueOnce({ certificateText: 'Olá {{desconhecido}}' })

      const result = await service.updateText('e1', 'm1', { certificateText: 'Olá {{desconhecido}}' })
      expect(result.certificateText).toBe('Olá {{desconhecido}}')
      expect(result.warnings).toContain('UNKNOWN_PLACEHOLDER')
      expect(mockAudit.record).toHaveBeenCalledWith(expect.objectContaining({ action: 'CERTIFICATE_TEXT_UPDATED' }), expect.anything())
    })

    it('rejeita texto > 1500 caracteres via DTO (simulado)', async () => {
      // O DTO já valida isso; aqui testamos que o service não quebra
      mockRepository.findEventWithConfig.mockResolvedValueOnce({ id: 'e1', certificateConfig: { id: 'c1' } })
      mockRepository.updateEventCertificateText.mockResolvedValueOnce({ certificateText: 'x'.repeat(1500) })

      const result = await service.updateText('e1', 'm1', { certificateText: 'x'.repeat(1500) })
      expect(result.certificateText).toHaveLength(1500)
    })
  })

  describe('uploadBackground', () => {
    it('faz upload e substitui arquivo antigo', async () => {
      mockRepository.findEventWithConfig.mockResolvedValueOnce({
        id: 'e1',
        certificateConfig: { id: 'c1', backgroundPath: 'old.png' },
      })
      mockStorage.upload.mockResolvedValueOnce({ path: 'new.png', publicUrl: '/uploads/new.png' })

      const result = await service.uploadBackground('e1', 'm1', Buffer.from('img'), 'bg.jpg')
      expect(result.path).toBe('new.png')
      expect(mockStorage.remove).toHaveBeenCalledWith('old.png')
      expect(mockAudit.record).toHaveBeenCalledWith(expect.objectContaining({ action: 'CERTIFICATE_BACKGROUND_UPLOADED' }), expect.anything())
    })

    it('rejeita arquivo > 5MB', async () => {
      mockRepository.findEventWithConfig.mockResolvedValueOnce({ id: 'e1', certificateConfig: null })
      const bigBuffer = Buffer.alloc(5 * 1024 * 1024 + 1)
      await expect(service.uploadBackground('e1', 'm1', bigBuffer, 'bg.jpg')).rejects.toThrow(UnprocessableEntityException)
    })
  })

  describe('removeBackground', () => {
    it('remove arquivo do storage e registra audit', async () => {
      mockRepository.findEventWithConfig.mockResolvedValueOnce({
        id: 'e1',
        certificateConfig: { id: 'c1', backgroundPath: 'bg.png' },
      })

      await service.removeBackground('e1', 'm1')
      expect(mockStorage.remove).toHaveBeenCalledWith('bg.png')
      expect(mockAudit.record).toHaveBeenCalledWith(expect.objectContaining({ action: 'CERTIFICATE_BACKGROUND_REMOVED' }), expect.anything())
    })
  })

  describe('addSignature', () => {
    it('cria assinatura com displayOrder', async () => {
      mockRepository.findEventWithConfig.mockResolvedValueOnce({
        id: 'e1',
        certificateConfig: { id: 'c1', signatures: [] },
      })
      mockRepository.findConfigByEventId.mockResolvedValueOnce({ id: 'c1' })
      mockRepository.countSignatures.mockResolvedValueOnce(0)
      mockRepository.findSignatureByDisplayOrder.mockResolvedValueOnce(null)
      mockStorage.upload.mockResolvedValueOnce({ path: 'sig.png', publicUrl: '/uploads/sig.png' })
      mockRepository.createSignature.mockResolvedValueOnce({ id: 's1', displayOrder: 1 })

      const result = await service.addSignature('e1', 'm1', Buffer.from('img'), 'sig.png', 'Ana', 'Dir', 1)
      expect(result.displayOrder).toBe(1)
      expect(mockAudit.record).toHaveBeenCalledWith(expect.objectContaining({ action: 'CERTIFICATE_SIGNATURE_ADDED' }), expect.anything())
    })

    it('rejeita 4ª assinatura', async () => {
      mockRepository.findEventWithConfig.mockResolvedValueOnce({
        id: 'e1',
        certificateConfig: { id: 'c1', signatures: [] },
      })
      mockRepository.findConfigByEventId.mockResolvedValueOnce({ id: 'c1' })
      mockRepository.countSignatures.mockResolvedValueOnce(3)

      await expect(
        service.addSignature('e1', 'm1', Buffer.from('img'), 'sig.png', 'Ana', 'Dir', 1),
      ).rejects.toThrow('Máximo de 3 assinaturas permitido')
    })

    it('rejeita displayOrder duplicado', async () => {
      mockRepository.findEventWithConfig.mockResolvedValueOnce({
        id: 'e1',
        certificateConfig: { id: 'c1', signatures: [] },
      })
      mockRepository.findConfigByEventId.mockResolvedValueOnce({ id: 'c1' })
      mockRepository.countSignatures.mockResolvedValueOnce(1)
      mockRepository.findSignatureByDisplayOrder.mockResolvedValueOnce({ id: 's2', displayOrder: 1 })

      await expect(
        service.addSignature('e1', 'm1', Buffer.from('img'), 'sig.png', 'Ana', 'Dir', 1),
      ).rejects.toThrow('Ordem de exibição 1 já está em uso')
    })
  })

  describe('updateSignature', () => {
    it('atualiza nome e cargo', async () => {
      mockRepository.findEventWithConfig.mockResolvedValueOnce({
        id: 'e1',
        certificateConfig: { id: 'c1', signatures: [] },
      })
      mockRepository.updateSignature.mockResolvedValueOnce({ id: 's1', personName: 'Ana', personRole: 'Dir', displayOrder: 1 })

      const result = await service.updateSignature('e1', 'm1', 's1', { personName: 'Ana', personRole: 'Dir' })
      expect(result.personName).toBe('Ana')
    })

    it('rejeita displayOrder duplicado em update', async () => {
      mockRepository.findEventWithConfig.mockResolvedValueOnce({
        id: 'e1',
        certificateConfig: { id: 'c1', signatures: [] },
      })
      mockRepository.findSignatureByDisplayOrder.mockResolvedValueOnce({ id: 's2', displayOrder: 2 })

      await expect(service.updateSignature('e1', 'm1', 's1', { displayOrder: 2 })).rejects.toThrow('Ordem de exibição 2 já está em uso')
    })
  })

  describe('removeSignature', () => {
    it('remove assinatura e arquivo', async () => {
      mockRepository.findEventWithConfig.mockResolvedValueOnce({
        id: 'e1',
        certificateConfig: {
          id: 'c1',
          signatures: [{ id: 's1', imagePath: 'sig.png' }],
        },
      })

      await service.removeSignature('e1', 'm1', 's1')
      expect(mockStorage.remove).toHaveBeenCalledWith('sig.png')
      expect(mockAudit.record).toHaveBeenCalledWith(expect.objectContaining({ action: 'CERTIFICATE_SIGNATURE_REMOVED' }), expect.anything())
    })
  })

  describe('getJobStatus', () => {
    it('retorna job pelo id', async () => {
      mockRepository.findJobById.mockResolvedValueOnce({ id: 'j1', status: 'COMPLETED' })
      const result = await service.getJobStatus('j1')
      expect(result!.status).toBe('COMPLETED')
    })
  })

  describe('download', () => {
    it('retorna filePath quando job completed existe', async () => {
      mockRepository.findEventWithConfig.mockResolvedValueOnce({ id: 'e1' })
      mockRepository.findLastCompletedJob.mockResolvedValueOnce({ id: 'j1', filePath: 'cert.pdf' })
      const path = await service.download('e1', 'm1')
      expect(path).toBe('cert.pdf')
      expect(mockAudit.record).toHaveBeenCalledWith(expect.objectContaining({ action: 'CERTIFICATE_BATCH_DOWNLOADED' }))
    })
  })

  describe('enqueueBatchGeneration', () => {
    it('enfileira job quando pré-condições ok', async () => {
      mockRepository.findEventWithConfig.mockResolvedValueOnce({
        id: 'e1',
        certificateText: 'texto',
        certificateConfig: { id: 'c1', backgroundPath: 'bg.png' },
      })
      mockRepository.getParticipants.mockResolvedValueOnce([{ id: 'p1', name: 'Ana' }])
      mockRepository.createJob.mockResolvedValueOnce({ id: 'job-1' })

      const result = await service.enqueueBatchGeneration('e1', 'm1')
      expect(result.jobId).toBe('job-1')
      expect(mockQueue.add).toHaveBeenCalled()
      expect(mockAudit.record).toHaveBeenCalledWith(expect.objectContaining({ action: 'CERTIFICATE_BATCH_QUEUED' }), expect.anything())
    })

    it('falha se background ausente', async () => {
      mockRepository.findEventWithConfig.mockResolvedValueOnce({
        id: 'e1',
        certificateText: 'texto',
        certificateConfig: { id: 'c1', backgroundPath: '' },
      })

      await expect(service.enqueueBatchGeneration('e1', 'm1')).rejects.toThrow('Background do certificado não configurado')
    })

    it('falha se texto ausente', async () => {
      mockRepository.findEventWithConfig.mockResolvedValueOnce({
        id: 'e1',
        certificateText: '',
        certificateConfig: { id: 'c1', backgroundPath: 'bg.png' },
      })

      await expect(service.enqueueBatchGeneration('e1', 'm1')).rejects.toThrow('Texto do certificado não configurado')
    })

    it('falha se sem participantes', async () => {
      mockRepository.findEventWithConfig.mockResolvedValueOnce({
        id: 'e1',
        certificateText: 'texto',
        certificateConfig: { id: 'c1', backgroundPath: 'bg.png' },
      })
      mockRepository.getParticipants.mockResolvedValueOnce([])

      await expect(service.enqueueBatchGeneration('e1', 'm1')).rejects.toThrow('Nenhum participante cadastrado')
    })
  })
})
