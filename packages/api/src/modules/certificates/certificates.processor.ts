/* global __dirname */
import { Processor, WorkerHost } from '@nestjs/bullmq'
import { Inject } from '@nestjs/common'
import { Job } from 'bullmq'
import { randomUUID } from 'crypto'
import * as fs from 'fs'
import * as os from 'os'
import * as path from 'path'
import * as Handlebars from 'handlebars'
import { PDFDocument } from 'pdf-lib'
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

  private async fileToUrl(filePath: string): Promise<string> {
    const absPath = path.resolve(env.STORAGE_LOCAL_ROOT, filePath)
    // Puppeteer can load local images via file://, avoiding massive base64 duplication
    // in the HTML for every participant page. Convert Windows backslashes to forward slashes.
    const normalized = absPath.replace(/\\/g, '/')
    return `file:///${normalized}`
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
      const batchData = await this.certificatesService.buildBatchData(eventId, managerId)
      if (!batchData.backgroundPath) {
        throw new Error('Background do certificado não configurado')
      }

      await this.repository.updateJob(jobId, { status: 'PROCESSING', progress: 10 })
      await job.updateProgress(10)

      // 30% — participants loaded
      const participants = batchData.participants
      const signatures = batchData.signatures

      await this.repository.updateJob(jobId, { progress: 30 })
      await job.updateProgress(30)

      // Use file:// URLs so Puppeteer loads images from disk instead of embedding
      // massive base64 strings repeated for every participant page.
      const backgroundUrl = await this.fileToUrl(batchData.backgroundPath)
      const signaturesWithUrls = await Promise.all(
        signatures.map(async (s) => ({
          personName: s.personName,
          personRole: s.personRole,
          imageUrl: await this.fileToUrl(s.imagePath),
          displayOrder: s.displayOrder,
        })),
      )

      const verificationCode = randomUUID()
      const generatedAt = this.formatDateTime(new Date())

      const template = this.loadTemplate('certificate')

      // 60% — HTML rendered
      await this.repository.updateJob(jobId, { progress: 60 })
      await job.updateProgress(60)

      // Generate PDFs in small chunks to avoid overwhelming Chromium with 77 pages at once
      const chunkSize = 5
      const chunks: Array<Array<{ id: string; name: string; processedText: string }>> = []
      for (let i = 0; i < participants.length; i += chunkSize) {
        chunks.push(participants.slice(i, i + chunkSize))
      }

      const pdfBuffers: Buffer[] = []
      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i]
        const html = template({
          backgroundUrl,
          participants: chunk,
          signatures: signaturesWithUrls,
          verificationCode,
          generatedAt,
        })

        const tempFile = path.join(os.tmpdir(), `cert-${job.id}-${i}.html`)
        fs.writeFileSync(tempFile, html, 'utf-8')
        try {
          const chunkBuffer = await this.pdfService.renderFile(tempFile, {
            format: 'A4',
            landscape: true,
            margin: { top: '0mm', right: '0mm', bottom: '0mm', left: '0mm' },
          })
          pdfBuffers.push(chunkBuffer)
        } finally {
          try { fs.unlinkSync(tempFile) } catch { /* ignore */ }
        }

        const progress = 60 + Math.round(((i + 1) / chunks.length) * 30)
        await this.repository.updateJob(jobId, { progress })
        await job.updateProgress(progress)
      }

      // Merge all chunk PDFs into a single document
      const mergedPdf = await PDFDocument.create()
      for (const pdfBuffer of pdfBuffers) {
        const pdf = await PDFDocument.load(pdfBuffer)
        const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices())
        for (const page of copiedPages) {
          mergedPdf.addPage(page)
        }
      }
      const buffer = Buffer.from(await mergedPdf.save())

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
