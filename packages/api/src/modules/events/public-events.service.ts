import { Injectable, Inject, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../../config/prisma.service'
import { EventStatus } from '@prisma/client'
import { CalculationService } from '../calculation/calculation.service'

@Injectable()
export class PublicEventsService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(CalculationService) private readonly calculationService: CalculationService,
  ) {}

  async getPublicEvent(id: string) {
    const event = await this.prisma.judgingEvent.findFirst({
      where: { id, deletedAt: null },
      select: {
        id: true,
        name: true,
        eventDate: true,
        location: true,
        organizer: true,
        status: true,
        topN: true,
      },
    })

    if (!event) {
      throw new NotFoundException('Evento não encontrado')
    }

    return {
      id: event.id,
      name: event.name,
      eventDate: event.eventDate instanceof Date ? event.eventDate.toISOString() : event.eventDate,
      location: event.location,
      organizer: event.organizer,
      status: event.status,
      topN: event.topN,
    }
  }

  async getLiveState(id: string) {
    const event = await this.prisma.judgingEvent.findFirst({
      where: { id, deletedAt: null },
      select: {
        id: true,
        status: true,
      },
    })

    if (!event) {
      throw new NotFoundException('Evento não encontrado')
    }

    const currentParticipant = await this.prisma.participant.findFirst({
      where: {
        eventId: id,
        currentState: { in: ['PREVIEW', 'SCORING', 'REVIEW'] },
      },
      select: {
        id: true,
        name: true,
        photoPath: true,
        presentationOrder: true,
        currentState: true,
      },
    })

    const totalParticipants = await this.prisma.participant.count({
      where: { eventId: id },
    })

    const completedParticipants = await this.prisma.participant.count({
      where: { eventId: id, currentState: { in: ['FINISHED', 'ABSENT'] } },
    })

    const totalJudges = await this.prisma.judge.count({
      where: {
        eventId: id,
        judgeCategories: { some: {} },
      },
    })

    let judgesFinishedCurrentParticipant = 0
    if (currentParticipant) {
      judgesFinishedCurrentParticipant = await this.prisma.judgeParticipantSession.count({
        where: {
          participantId: currentParticipant.id,
          status: 'FINISHED',
        },
      })
    }

    const upcomingParticipants = await this.prisma.participant.findMany({
      where: {
        eventId: id,
        currentState: 'WAITING',
        isAbsent: false,
      },
      orderBy: { presentationOrder: 'asc' },
      take: 3,
      select: {
        name: true,
        presentationOrder: true,
      },
    })

    return {
      status: event.status,
      currentParticipant: currentParticipant
        ? {
            id: currentParticipant.id,
            name: currentParticipant.name,
            photoPath: currentParticipant.photoPath,
            presentationOrder: currentParticipant.presentationOrder,
            currentState: currentParticipant.currentState,
          }
        : null,
      totalParticipants,
      completedParticipants,
      totalJudges,
      judgesFinishedCurrentParticipant,
      upcomingParticipants,
    }
  }

  async getFinalResults(id: string) {
    const event = await this.prisma.judgingEvent.findFirst({
      where: { id, deletedAt: null },
      select: {
        id: true,
        status: true,
        managerId: true,
        topN: true,
      },
    })

    if (!event) {
      throw new NotFoundException('Evento não encontrado')
    }

    if (event.status !== EventStatus.FINISHED) {
      throw new NotFoundException('Resultados finais ainda não disponíveis')
    }

    const calculation = await this.calculationService.calculate(id, event.managerId)
    const rankings = calculation.data.rankings
    const topN = event.topN ?? 10

    if (rankings.length === 0 || topN <= 0) {
      return { ranking: [] }
    }

    const cutoffPosition = rankings[topN - 1]?.position
    if (cutoffPosition === undefined) {
      return { ranking: rankings.map((r) => ({ position: r.position, participantName: r.participant.name, finalScore: r.finalScore })) }
    }

    const topRankings = rankings.filter((r) => r.position <= cutoffPosition)

    return {
      ranking: topRankings.map((r) => ({
        position: r.position,
        participantName: r.participant.name,
        finalScore: r.finalScore,
      })),
    }
  }
}
