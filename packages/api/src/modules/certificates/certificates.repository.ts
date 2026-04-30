import { Injectable, Inject } from '@nestjs/common'
import { PrismaService } from '../../config/prisma.service'

export interface CreateCertificateJobInput {
  eventId: string
  requestedBy: string
}

export interface UpdateCertificateJobInput {
  status?: string
  progress?: number
  filePath?: string | null
  error?: string | null
  completedAt?: Date | null
  totalParticipants?: number
}

@Injectable()
export class CertificatesRepository {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async findConfigByEventId(eventId: string) {
    return this.prisma.certificateConfig.findUnique({
      where: { eventId },
      include: { signatures: { orderBy: { displayOrder: 'asc' } } },
    })
  }

  async findEventWithConfig(eventId: string, managerId: string) {
    return this.prisma.judgingEvent.findFirst({
      where: { id: eventId, managerId },
      include: {
        certificateConfig: {
          include: { signatures: { orderBy: { displayOrder: 'asc' } } },
        },
        _count: { select: { participants: true } },
      },
    })
  }

  async upsertConfig(eventId: string, data: { backgroundPath?: string }) {
    return this.prisma.certificateConfig.upsert({
      where: { eventId },
      create: { eventId, backgroundPath: data.backgroundPath ?? '' },
      update: data,
      include: { signatures: { orderBy: { displayOrder: 'asc' } } },
    })
  }

  async updateEventCertificateText(eventId: string, certificateText: string) {
    return this.prisma.judgingEvent.update({
      where: { id: eventId },
      data: { certificateText },
      include: { certificateConfig: { include: { signatures: true } } },
    })
  }

  async countSignatures(configId: string) {
    return this.prisma.certificateSignature.count({
      where: { certificateConfigId: configId },
    })
  }

  async findSignatureByDisplayOrder(configId: string, displayOrder: number) {
    return this.prisma.certificateSignature.findFirst({
      where: { certificateConfigId: configId, displayOrder },
    })
  }

  async createSignature(data: {
    certificateConfigId: string
    personName: string
    personRole: string
    imagePath: string
    displayOrder: number
  }) {
    return this.prisma.certificateSignature.create({ data })
  }

  async updateSignature(id: string, data: { personName?: string; personRole?: string; displayOrder?: number }) {
    return this.prisma.certificateSignature.update({ where: { id }, data })
  }

  async deleteSignature(id: string) {
    return this.prisma.certificateSignature.delete({ where: { id } })
  }

  async getParticipants(eventId: string) {
    return this.prisma.participant.findMany({
      where: { eventId },
      orderBy: { name: 'asc' },
      select: { id: true, name: true },
    })
  }

  async createJob(data: CreateCertificateJobInput) {
    // Reuse ReportJob model for simplicity, using a special type
    return this.prisma.reportJob.create({
      data: {
        eventId: data.eventId,
        type: 'GENERAL' as unknown as import('@prisma/client').ReportType, // Using existing enum; certificates jobs use this table too
        status: 'QUEUED',
        requestedBy: data.requestedBy,
      },
    })
  }

  async findJobById(id: string) {
    return this.prisma.reportJob.findUnique({ where: { id } })
  }

  async updateJob(id: string, input: UpdateCertificateJobInput) {
    return this.prisma.reportJob.update({ where: { id }, data: input as Record<string, unknown> })
  }

  async findLastCompletedJob(eventId: string) {
    return this.prisma.reportJob.findFirst({
      where: { eventId, status: 'COMPLETED', filePath: { not: null } },
      orderBy: { completedAt: 'desc' },
    })
  }
}
