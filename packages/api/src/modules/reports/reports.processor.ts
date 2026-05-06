/* global __dirname */
import { Processor, WorkerHost } from '@nestjs/bullmq'
import { Inject } from '@nestjs/common'
import { Job } from 'bullmq'
import { randomUUID } from 'crypto'
import * as fs from 'fs'
import * as path from 'path'
import * as Handlebars from 'handlebars'
import { ReportType, ReportJobStatus } from '@prisma/client'
import { PdfService } from '../../services/pdf.service'
import { RankingBuilderService } from './ranking-builder.service'
import { ReportsRepository } from './reports.repository'
import { AuditService } from '../audit/audit.service'
import { IStorageService, STORAGE_SERVICE } from '../storage/storage.service.interface'
import { GenerateReportJobPayload } from './reports.service'

interface EventData {
  name: string
  eventDate: string
  location: string
  organizer: string
}

@Processor('reports')
export class ReportsProcessor extends WorkerHost {
  private readonly templatesDir = path.join(__dirname, 'templates')
  private readonly partialsRegistered: boolean

  constructor(
    @Inject(PdfService) private readonly pdfService: PdfService,
    @Inject(RankingBuilderService) private readonly rankingBuilder: RankingBuilderService,
    @Inject(ReportsRepository) private readonly repository: ReportsRepository,
    @Inject(AuditService) private readonly auditService: AuditService,
    @Inject(STORAGE_SERVICE) private readonly storageService: IStorageService,
  ) {
    super()
    this.partialsRegistered = false
    this.registerPartials()
  }

  private registerPartials(): void {
    const partialsDir = path.join(this.templatesDir, 'partials')
    if (fs.existsSync(partialsDir)) {
      for (const file of fs.readdirSync(partialsDir)) {
        if (file.endsWith('.hbs')) {
          const name = path.basename(file, '.hbs')
          const content = fs.readFileSync(path.join(partialsDir, file), 'utf-8')
          Handlebars.registerPartial(name, content)
        }
      }
    }
  }

  private loadTemplate(name: string): Handlebars.TemplateDelegate {
    const filePath = path.join(this.templatesDir, `${name}.hbs`)
    const source = fs.readFileSync(filePath, 'utf-8')
    return Handlebars.compile(source)
  }

  private formatDate(date: Date | string): string {
    const d = new Date(date)
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })
  }

  private formatDateTime(date: Date): string {
    return date.toLocaleString('pt-BR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
    })
  }

  async process(job: Job<GenerateReportJobPayload>): Promise<{ pdfPath: string }> {
    const { jobId, eventId, managerId, type } = job.data

    await this.repository.update(jobId, { status: ReportJobStatus.PROCESSING, progress: 0 })
    await job.updateProgress(0)

    try {
      const eventInfo = await this.repository.getEventStatus(eventId, managerId)
      if (!eventInfo) throw new Error('Evento não encontrado')

      const event: EventData = {
        name: eventInfo.name,
        eventDate: this.formatDate(eventInfo.eventDate),
        location: eventInfo.location,
        organizer: eventInfo.organizer,
      }

      const generatedAt = this.formatDateTime(new Date())
      const verificationCode = randomUUID()

      await this.repository.update(jobId, { progress: 30 })
      await job.updateProgress(30)

      let html: string

      if (type === ReportType.TOP_N) {
        const entries = await this.rankingBuilder.buildTopN(eventId, managerId)
        const topN = eventInfo.topN
        const template = this.loadTemplate('top-n')
        const tied = entries.some((e, i, arr) => i > 0 && arr[i - 1]!.position === e.position)
        html = template({ event, entries, topN, generatedAt, verificationCode, tied })

      } else if (type === ReportType.GENERAL) {
        const entries = await this.rankingBuilder.buildClassification(eventId, managerId)
        const absents = await this.rankingBuilder.buildAbsents(eventId, managerId)
        const template = this.loadTemplate('general')
        const tied = entries.some((e, i, arr) => i > 0 && arr[i - 1]!.position === e.position)
        html = template({ event, entries, absents, generatedAt, verificationCode, tied })

      } else {
        const judgeEntries = await this.rankingBuilder.buildDetailedByJudge(eventId, managerId)
        const template = this.loadTemplate('detailed-by-judge')
        html = template({ event, judgeEntries, generatedAt, verificationCode })
      }

      await this.repository.update(jobId, { progress: 50 })
      await job.updateProgress(50)

      const isLandscape = type === ReportType.DETAILED_BY_JUDGE
      const buffer = await this.pdfService.render(html, { landscape: isLandscape })

      await this.repository.update(jobId, { progress: 80 })
      await job.updateProgress(80)

      const fileId = randomUUID()
      const uploaded = await this.storageService.upload({
        buffer,
        originalName: `${type.toLowerCase()}-${fileId}.pdf`,
        mimeType: 'application/pdf',
        category: 'reports',
        eventId,
      })

      await this.repository.update(jobId, { progress: 90 })
      await job.updateProgress(90)

      await this.repository.update(jobId, {
        status: ReportJobStatus.COMPLETED,
        progress: 100,
        filePath: uploaded.path,
        verificationCode,
        completedAt: new Date(),
      })
      await job.updateProgress(100)

      await this.auditService.record({
        action: 'REPORT_GENERATION_COMPLETED',
        entityType: 'ReportJob',
        entityId: jobId,
        actorId: managerId,
        payload: { eventId, type, jobId, filePath: uploaded.path, verificationCode },
      })

      return { pdfPath: uploaded.path }

    } catch (err) {
      const error = err instanceof Error ? err.message : String(err)
      await this.repository.update(jobId, {
        status: ReportJobStatus.FAILED,
        error,
        completedAt: new Date(),
      })

      await this.auditService.record({
        action: 'REPORT_GENERATION_FAILED',
        entityType: 'ReportJob',
        entityId: jobId,
        actorId: managerId,
        payload: { eventId, type, jobId, error },
      })

      throw err
    }
  }
}
