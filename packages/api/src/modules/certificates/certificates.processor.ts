/* global __dirname */
import { Processor, WorkerHost } from '@nestjs/bullmq'
import { Inject } from '@nestjs/common'
import { Job } from 'bullmq'
import { randomUUID } from 'crypto'
import * as fs from 'fs'
import * as path from 'path'
import * as Handlebars from 'handlebars'
import { CertificatesService, GenerateCertificatesJobPayload } from './certificates.service'
import { CertificatesRepository } from './certificates.repository'
import { AuditService } from '../audit/audit.service'
import { IStorageService, STORAGE_SERVICE } from '../storage/storage.service.interface'
import { PdfService } from '../../services/pdf.service'
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino'
// ReportJobStatus imported via Prisma but not used directly in this file
import { env } from '../../config/env'

@Processor('certificates')
export class CertificatesProcessor extends WorkerHost {
  private readonly templatesDir = path.join(__dirname, 'templates')

  constructor(
    @Inject(PdfService) private readonly pdfService: PdfService,
    @Inject(CertificatesService) private readonly certificatesService: CertificatesService,
    @Inject(CertificatesRepository) private readonly repository: CertificatesRepository,
    @Inject(AuditService) private readonly auditService: AuditService,
    @Inject(STORAGE_SERVICE) private readonly storageService: IStorageService,
    @InjectPinoLogger(CertificatesProcessor.name) private readonly logger: PinoLogger,
  ) {
    super()
  }

  private loadTemplate(name: string): Handlebars.TemplateDelegate {
    const filePath = path.join(this.templatesDir, `${name}.hbs`)
    const source = fs.readFileSync(filePath, 'utf-8')
    return Handlebars.compile(source)
  }

  private async fileToDataUri(filePath: string): Promise<string> {
    const absPath = path.resolve(env.STORAGE_LOCAL_ROOT, filePath)
    const buffer = fs.readFileSync(absPath)
    const ext = path.extname(absPath).toLowerCase()
    const mime = ext === '.png' ? 'image/png' : 'image/jpeg'
    return `data:${mime};base64,${buffer.toString('base64')}`
  }

  private formatDateTime(date: Date): string {
    return date.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
  }

  async process(job: Job<GenerateCertificatesJobPayload>): Promise<{ pdfPath: string }> {
    const { jobId, eventId, managerId } = job.data

    await this.repository.updateJob(jobId, { status: 'QUEUED', progress: 0 })
    await job.updateProgress(0)

    try {
      // 10% — validation
      const batchData = await this.certificatesService.buildBatchData(eventId)
      if (!batchData.backgroundPath) {
        throw new Error('Background do certificado não configurado')
      }

      await this.repository.updateJob(jobId, { status: 'PROCESSING', progress: 10 })
      await job.updateProgress(10)

      // 30% — participants loaded
      const participants = batchData.participants
      const signatures = batchData.signatures

      await this.repository.updateJob(jobId, { progress: 30, totalParticipants: participants.length })
      await job.updateProgress(30)

      // Prepare images as data URIs so Puppeteer can render them without a server
      const backgroundUrl = await this.fileToDataUri(batchData.backgroundPath)
      const signaturesWithUrls = await Promise.all(
        signatures.map(async (s) => ({
          personName: s.personName,
          personRole: s.personRole,
          imageUrl: await this.fileToDataUri(s.imagePath),
          displayOrder: s.displayOrder,
        })),
      )

      const verificationCode = randomUUID()
      const generatedAt = this.formatDateTime(new Date())

      const template = this.loadTemplate('certificate')
      const html = template({
        backgroundUrl,
        participants,
        signatures: signaturesWithUrls,
        verificationCode,
        generatedAt,
      })

      // 60% — HTML rendered
      await this.repository.updateJob(jobId, { progress: 60 })
      await job.updateProgress(60)

      // 90% — PDF generated
      const buffer = await this.pdfService.render(html, {
        format: 'A4',
        landscape: true,
        margin: { top: '0mm', right: '0mm', bottom: '0mm', left: '0mm' },
      })

      await this.repository.updateJob(jobId, { progress: 90 })
      await job.updateProgress(90)

      const fileId = randomUUID()
      const uploaded = await this.storageService.upload({
        buffer,
        originalName: `certificates-${fileId}.pdf`,
        mimeType: 'application/pdf',
        category: 'reports',
        eventId,
      })

      // 100% — saved
      await this.repository.updateJob(jobId, {
        status: 'COMPLETED',
        progress: 100,
        filePath: uploaded.path,
        completedAt: new Date(),
      })
      await job.updateProgress(100)

      await this.auditService.record({
        action: 'CERTIFICATE_BATCH_COMPLETED',
        entityType: 'ReportJob',
        entityId: jobId,
        actorId: managerId,
        payload: { eventId, jobId, filePath: uploaded.path },
      })

      return { pdfPath: uploaded.path }
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err)
      this.logger.error({ err, jobId, eventId }, 'Falha na geração de certificados')

      await this.repository.updateJob(jobId, {
        status: 'FAILED',
        error,
        completedAt: new Date(),
      })

      await this.auditService.record({
        action: 'CERTIFICATE_BATCH_FAILED',
        entityType: 'ReportJob',
        entityId: jobId,
        actorId: managerId,
        payload: { eventId, jobId, error },
      })

      throw err
    }
  }
}
