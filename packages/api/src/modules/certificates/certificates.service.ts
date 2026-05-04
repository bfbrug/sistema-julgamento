import { Injectable, Inject, NotFoundException, UnprocessableEntityException } from '@nestjs/common'
import { InjectQueue } from '@nestjs/bullmq'
import { Queue } from 'bullmq'
import { CertificatesRepository } from './certificates.repository'
import { AuditService } from '../audit/audit.service'
import { IStorageService, STORAGE_SERVICE } from '../storage/storage.service.interface'
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino'
import { UpdateCertificateConfigDto } from './dto/update-config.dto'
import { UpdateSignatureDto } from './dto/update-signature.dto'
import { PrismaService } from '../../config/prisma.service'

export interface GenerateCertificatesJobPayload {
  jobId: string
  eventId: string
  managerId: string
}

const MAX_BACKGROUND_BYTES = 5 * 1024 * 1024
const MAX_SIGNATURE_BYTES = 1 * 1024 * 1024
const MAX_SIGNATURES = 3

export interface UploadResult {
  path: string
  publicUrl: string
  warning?: string
}

function formatDateLong(date: Date | string): string {
  const d = new Date(date)
  return d.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })
}

function escapeHtml(unsafe: string): string {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

@Injectable()
export class CertificatesService {
  constructor(
    @Inject(CertificatesRepository) private readonly repository: CertificatesRepository,
    @InjectQueue('certificates') private readonly certificatesQueue: Queue,
    @Inject(AuditService) private readonly auditService: AuditService,
    @Inject(STORAGE_SERVICE) private readonly storageService: IStorageService,
    @InjectPinoLogger(CertificatesService.name) private readonly logger: PinoLogger,
    @Inject(PrismaService) private readonly prisma: PrismaService,
  ) {}

  async getConfig(eventId: string, managerId: string) {
    const event = await this.repository.findEventWithConfig(eventId, managerId)
    if (!event) throw new NotFoundException('Evento não encontrado')

    return {
      id: event.certificateConfig?.id ?? null,
      eventId: event.id,
      backgroundPath: event.certificateConfig?.backgroundPath ?? null,
      signatures: event.certificateConfig?.signatures ?? [],
      certificateText: event.certificateText ?? '',
    }
  }

  async updateText(eventId: string, managerId: string, dto: UpdateCertificateConfigDto) {
    const event = await this.repository.findEventWithConfig(eventId, managerId)
    if (!event) throw new NotFoundException('Evento não encontrado')

    const warnings: string[] = []
    const knownPlaceholders = ['participante', 'evento', 'data', 'local', 'organizador']
    const matches = dto.certificateText.match(/\{\{(\w+)\}\}/g) ?? []
    for (const match of matches) {
      const key = match.replace(/[{}]/g, '')
      if (!knownPlaceholders.includes(key)) {
        warnings.push('UNKNOWN_PLACEHOLDER')
      }
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const result = await this.repository.updateEventCertificateText(eventId, dto.certificateText, tx)
      await this.auditService.record({
        action: 'CERTIFICATE_TEXT_UPDATED',
        entityType: 'JudgingEvent',
        entityId: eventId,
        actorId: managerId,
        payload: { eventId },
      }, tx)
      return result
    })

    return { certificateText: updated.certificateText, warnings: warnings.length > 0 ? warnings : undefined }
  }

  async uploadBackground(eventId: string, managerId: string, buffer: Buffer, originalName: string): Promise<UploadResult> {
    const event = await this.repository.findEventWithConfig(eventId, managerId)
    if (!event) throw new NotFoundException('Evento não encontrado')

    if (buffer.length > MAX_BACKGROUND_BYTES) {
      throw new UnprocessableEntityException('Arquivo excede o tamanho máximo de 5 MB')
    }

    const uploaded = await this.storageService.upload({
      buffer,
      originalName,
      mimeType: 'image/jpeg', // Will be validated by magic bytes in storage
      category: 'certificate-background',
      eventId,
    })

    // Delete old background if exists
    if (event.certificateConfig?.backgroundPath) {
      try {
        await this.storageService.remove(event.certificateConfig.backgroundPath)
      } catch (err: unknown) {
        this.logger.warn({ err, path: event.certificateConfig.backgroundPath }, 'Falha ao remover background antigo')
      }
    }

    await this.prisma.$transaction(async (tx) => {
      await this.repository.upsertConfig(eventId, { backgroundPath: uploaded.path }, tx)
      await this.auditService.record({
        action: 'CERTIFICATE_BACKGROUND_UPLOADED',
        entityType: 'CertificateConfig',
        entityId: event.certificateConfig?.id ?? eventId,
        actorId: managerId,
        payload: { eventId, fileSize: buffer.length },
      }, tx)
    })

    return { path: uploaded.path, publicUrl: uploaded.publicUrl }
  }

  async removeBackground(eventId: string, managerId: string) {
    const event = await this.repository.findEventWithConfig(eventId, managerId)
    if (!event) throw new NotFoundException('Evento não encontrado')

    await this.prisma.$transaction(async (tx) => {
      await this.repository.upsertConfig(eventId, { backgroundPath: '' }, tx)
      await this.auditService.record({
        action: 'CERTIFICATE_BACKGROUND_REMOVED',
        entityType: 'CertificateConfig',
        entityId: event.certificateConfig?.id ?? eventId,
        actorId: managerId,
        payload: { eventId },
      }, tx)
    })

    if (event.certificateConfig?.backgroundPath) {
      await this.storageService.remove(event.certificateConfig.backgroundPath)
    }
  }

  async addSignature(
    eventId: string,
    managerId: string,
    buffer: Buffer,
    originalName: string,
    personName: string,
    personRole: string,
    displayOrder: number,
  ): Promise<UploadResult & { id: string; displayOrder: number }> {
    const event = await this.repository.findEventWithConfig(eventId, managerId)
    if (!event) throw new NotFoundException('Evento não encontrado')

    if (!event.certificateConfig) {
      // Auto-create config if missing
      await this.repository.upsertConfig(eventId, { backgroundPath: '' })
    }

    const configId = event.certificateConfig?.id ?? (await this.repository.findConfigByEventId(eventId))!.id

    const count = await this.repository.countSignatures(configId)
    if (count >= MAX_SIGNATURES) {
      throw new UnprocessableEntityException('Máximo de 3 assinaturas permitido')
    }

    const existing = await this.repository.findSignatureByDisplayOrder(configId, displayOrder)
    if (existing) {
      throw new UnprocessableEntityException(`Ordem de exibição ${displayOrder} já está em uso`)
    }

    if (buffer.length > MAX_SIGNATURE_BYTES) {
      throw new UnprocessableEntityException('Arquivo excede o tamanho máximo de 1 MB')
    }

    const uploaded = await this.storageService.upload({
      buffer,
      originalName,
      mimeType: 'image/png',
      category: 'certificate-signature',
      eventId,
    })

    const signature = await this.prisma.$transaction(async (tx) => {
      const created = await this.repository.createSignature({
        certificateConfigId: configId,
        personName,
        personRole,
        imagePath: uploaded.path,
        displayOrder,
      }, tx)
      await this.auditService.record({
        action: 'CERTIFICATE_SIGNATURE_ADDED',
        entityType: 'CertificateSignature',
        entityId: created.id,
        actorId: managerId,
        payload: { eventId, signatureId: created.id, displayOrder },
      }, tx)
      return created
    })

    return {
      id: signature.id,
      path: uploaded.path,
      publicUrl: uploaded.publicUrl,
      displayOrder: signature.displayOrder,
    }
  }

  async updateSignature(
    eventId: string,
    managerId: string,
    signatureId: string,
    dto: UpdateSignatureDto,
  ) {
    const event = await this.repository.findEventWithConfig(eventId, managerId)
    if (!event) throw new NotFoundException('Evento não encontrado')

    if (dto.displayOrder !== undefined) {
      const configId = event.certificateConfig?.id
      if (!configId) throw new NotFoundException('Configuração não encontrada')
      const existing = await this.repository.findSignatureByDisplayOrder(configId, dto.displayOrder)
      if (existing && existing.id !== signatureId) {
        throw new UnprocessableEntityException(`Ordem de exibição ${dto.displayOrder} já está em uso`)
      }
    }

    return this.repository.updateSignature(signatureId, dto)
  }

  async removeSignature(eventId: string, managerId: string, signatureId: string) {
    const event = await this.repository.findEventWithConfig(eventId, managerId)
    if (!event) throw new NotFoundException('Evento não encontrado')

    const signature = event.certificateConfig?.signatures.find((s) => s.id === signatureId)
    if (!signature) throw new NotFoundException('Assinatura não encontrada')

    await this.prisma.$transaction(async (tx) => {
      await this.repository.deleteSignature(signatureId, tx)
      await this.auditService.record({
        action: 'CERTIFICATE_SIGNATURE_REMOVED',
        entityType: 'CertificateSignature',
        entityId: signatureId,
        actorId: managerId,
        payload: { eventId, signatureId },
      }, tx)
    })

    await this.storageService.remove(signature.imagePath)
  }

  async enqueueBatchGeneration(eventId: string, managerId: string) {
    const event = await this.repository.findEventWithConfig(eventId, managerId)
    if (!event) throw new NotFoundException('Evento não encontrado')

    if (!event.certificateConfig || !event.certificateConfig.backgroundPath) {
      throw new UnprocessableEntityException('Background do certificado não configurado')
    }

    if (!event.certificateText || event.certificateText.trim().length === 0) {
      throw new UnprocessableEntityException('Texto do certificado não configurado')
    }

    const participants = await this.repository.getParticipants(eventId)
    if (participants.length === 0) {
      throw new UnprocessableEntityException('Nenhum participante cadastrado no evento')
    }

    const job = await this.prisma.$transaction(async (tx) => {
      const created = await this.repository.createJob({ eventId, requestedBy: managerId }, tx)
      await this.auditService.record({
        action: 'CERTIFICATE_BATCH_QUEUED',
        entityType: 'ReportJob',
        entityId: created.id,
        actorId: managerId,
        payload: { eventId, jobId: created.id, totalParticipants: participants.length },
      }, tx)
      return created
    })

    await this.certificatesQueue.add(
      'generate',
      { jobId: job.id, eventId, managerId } satisfies GenerateCertificatesJobPayload,
      {
        attempts: 3,
        backoff: { type: 'exponential', delay: 1000 },
        removeOnComplete: { age: 3600 },
        removeOnFail: { age: 86400 },
      },
    )

    return { jobId: job.id, status: 'queued' as const }
  }

  async getJobStatus(jobId: string) {
    return this.repository.findJobById(jobId)
  }

  async download(eventId: string, managerId: string) {
    const event = await this.repository.findEventWithConfig(eventId, managerId)
    if (!event) throw new NotFoundException('Evento não encontrado')

    const job = await this.repository.findLastCompletedJob(eventId)
    if (!job || !job.filePath) {
      throw new NotFoundException('Nenhum PDF de certificados gerado')
    }

    const exists = await this.storageService.exists(job.filePath)
    if (!exists) throw new NotFoundException('Arquivo PDF não encontrado no storage')

    await this.auditService.record({
      action: 'CERTIFICATE_BATCH_DOWNLOADED',
      entityType: 'ReportJob',
      entityId: job.id,
      actorId: managerId,
      payload: { eventId, downloadedBy: managerId },
    })

    return job.filePath
  }

  // Called by processor
  async buildBatchData(eventId: string) {
    const event = await this.repository.findEventWithConfig(eventId, '')
    if (!event) throw new Error('Evento não encontrado')
    if (!event.certificateConfig) throw new Error('Configuração de certificado não encontrada')

    const participants = await this.repository.getParticipants(eventId)
    const signatures = event.certificateConfig.signatures.sort((a, b) => a.displayOrder - b.displayOrder)

    const processedParticipants = participants.map((p) => {
      let text = event.certificateText ?? ''
      const replacements: Record<string, string> = {
        participante: escapeHtml(p.name),
        evento: escapeHtml(event.name),
        data: formatDateLong(event.eventDate),
        local: escapeHtml(event.location),
        organizador: escapeHtml(event.organizer),
      }

      for (const [key, value] of Object.entries(replacements)) {
        text = text.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value)
      }

      return { id: p.id, name: escapeHtml(p.name), processedText: text }
    })

    return {
      eventName: escapeHtml(event.name),
      backgroundPath: event.certificateConfig.backgroundPath,
      participants: processedParticipants,
      signatures,
    }
  }
}
