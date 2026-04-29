import { Injectable, Inject, NotFoundException, UnprocessableEntityException } from '@nestjs/common'
import { InjectQueue } from '@nestjs/bullmq'
import { Queue } from 'bullmq'
import { ReportType, EventStatus, ReportJobStatus } from '@prisma/client'
import { ReportsRepository } from './reports.repository'
import { AuditService } from '../audit/audit.service'
import { IStorageService, STORAGE_SERVICE } from '../storage/storage.service.interface'
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino'

export interface GenerateReportJobPayload {
  jobId: string
  eventId: string
  managerId: string
  type: ReportType
}

@Injectable()
export class ReportsService {
  constructor(
    private readonly repository: ReportsRepository,
    @InjectQueue('reports') private readonly reportsQueue: Queue,
    private readonly auditService: AuditService,
    @Inject(STORAGE_SERVICE) private readonly storageService: IStorageService,
    @InjectPinoLogger(ReportsService.name) private readonly logger: PinoLogger,
  ) {}

  async enqueue(eventId: string, managerId: string, type: ReportType) {
    const event = await this.repository.getEventStatus(eventId, managerId)
    if (!event) throw new NotFoundException('Evento não encontrado')

    if (event.status === EventStatus.DRAFT || event.status === EventStatus.REGISTERING) {
      throw new UnprocessableEntityException(
        'Relatórios só podem ser gerados para eventos em andamento ou finalizados',
      )
    }

    const scoreCount = await this.repository.countFinishedScores(eventId)
    if (scoreCount === 0) {
      throw new UnprocessableEntityException('Nenhuma nota finalizada encontrada para este evento')
    }

    let pendingJudgesWarning: string | undefined
    if (event.status === EventStatus.IN_PROGRESS) {
      const pending = await this.repository.countPendingJudges(eventId)
      if (pending > 0) {
        pendingJudgesWarning = `${pending} jurado(s) ainda não finalizaram. O relatório pode estar incompleto.`
      }
    }

    const job = await this.repository.create({ eventId, type, requestedBy: managerId })

    await this.reportsQueue.add(
      'generate',
      { jobId: job.id, eventId, managerId, type } satisfies GenerateReportJobPayload,
      {
        attempts: 3,
        backoff: { type: 'exponential', delay: 1000 },
        removeOnComplete: { age: 3600 },
        removeOnFail: { age: 86400 },
      },
    )

    await this.auditService.record({
      action: 'REPORT_GENERATION_QUEUED',
      entityType: 'ReportJob',
      entityId: job.id,
      actorId: managerId,
      payload: { eventId, type, jobId: job.id, requestedBy: managerId },
    })

    return { jobId: job.id, status: 'queued' as const, warning: pendingJudgesWarning }
  }

  async getJobStatus(jobId: string) {
    return this.repository.findById(jobId)
  }

  async download(eventId: string, managerId: string, type: ReportType) {
    const event = await this.repository.getEventStatus(eventId, managerId)
    if (!event) throw new NotFoundException('Evento não encontrado')

    const job = await this.repository.findLastCompleted(eventId, type)
    if (!job || !job.filePath) {
      throw new NotFoundException('Nenhum PDF gerado para este tipo de relatório')
    }

    await this.auditService.record({
      action: 'REPORT_DOWNLOADED',
      entityType: 'ReportJob',
      entityId: job.id,
      actorId: managerId,
      payload: { eventId, type, downloadedBy: managerId, filePath: job.filePath },
    })

    const exists = await this.storageService.exists(job.filePath)
    if (!exists) throw new NotFoundException('Arquivo PDF não encontrado no storage')

    return job.filePath
  }

  async listJobsByEvent(eventId: string) {
    // Returns last job per type for display in UI
    const types: ReportType[] = [ReportType.TOP_N, ReportType.GENERAL, ReportType.DETAILED_BY_JUDGE]
    const result: Record<string, unknown> = {}
    for (const type of types) {
      result[type] = await this.repository.findLastCompleted(eventId, type)
    }
    return result
  }
}
