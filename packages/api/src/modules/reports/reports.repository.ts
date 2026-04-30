import { Injectable, Inject, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../../config/prisma.service'
import { ReportJobStatus, ReportType, Prisma } from '@prisma/client'

export interface CreateReportJobInput {
  eventId: string
  type: ReportType
  requestedBy: string
}

export interface UpdateReportJobInput {
  status?: ReportJobStatus
  progress?: number
  filePath?: string
  verificationCode?: string
  error?: string
  completedAt?: Date
}

@Injectable()
export class ReportsRepository {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async create(input: CreateReportJobInput, tx?: Prisma.TransactionClient) {
    const client = tx ?? this.prisma
    return client.reportJob.create({ data: input })
  }

  async findById(id: string) {
    const job = await this.prisma.reportJob.findUnique({ where: { id } })
    if (!job) throw new NotFoundException(`ReportJob ${id} não encontrado`)
    return job
  }

  async update(id: string, input: UpdateReportJobInput, tx?: Prisma.TransactionClient) {
    const client = tx ?? this.prisma
    return client.reportJob.update({ where: { id }, data: input })
  }

  async findLastCompleted(eventId: string, type: ReportType) {
    return this.prisma.reportJob.findFirst({
      where: { eventId, type, status: ReportJobStatus.COMPLETED },
      orderBy: { completedAt: 'desc' },
    })
  }

  async countFinishedScores(eventId: string): Promise<number> {
    return this.prisma.score.count({
      where: { participant: { eventId }, isFinalized: true },
    })
  }

  async countPendingJudges(eventId: string): Promise<number> {
    const total = await this.prisma.judge.count({ where: { eventId } })
    const finished = await this.prisma.judgeParticipantSession.groupBy({
      by: ['judgeId'],
      where: { judge: { eventId }, status: 'FINISHED' },
    })
    return total - finished.length
  }

  async getEventStatus(eventId: string, managerId: string) {
    return this.prisma.judgingEvent.findFirst({
      where: { id: eventId, managerId },
      select: { status: true, topN: true, name: true, eventDate: true, location: true, organizer: true },
    })
  }
}
