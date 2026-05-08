import { Injectable, Inject, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../../config/prisma.service'
import { EventStatus, Gender } from '@prisma/client'
import { CalculationService } from '../calculation/calculation.service'
import { RankingBuilderService, OverallRankingResult } from '../reports/ranking-builder.service'

@Injectable()
export class PublicEventsService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(CalculationService) private readonly calculationService: CalculationService,
    @Inject(RankingBuilderService) private readonly rankingBuilder: RankingBuilderService,
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
        user: { deletedAt: null },
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

  async getPublicResults(id: string) {
    const event = await this.prisma.judgingEvent.findFirst({
      where: { id, deletedAt: null },
      select: { id: true, status: true, managerId: true, genderMode: true },
    })

    if (!event) throw new NotFoundException('Evento não encontrado')

    const ranking = await this.rankingBuilder.computeOverallRanking(id, event.managerId)
    const releases = await this.prisma.resultRelease.findMany({ where: { eventId: id } })

    const released: { MIXED?: any[]; MALE?: any[]; FEMALE?: any[] } = {}
    const pickEntry = (gender: Gender | null, position: number) => {
      if (ranking.mode === 'UNISEX_SPLIT') {
        const arr = gender === Gender.MALE ? ranking.male : ranking.female
        return arr.find((e) => e.position === position)
      }
      return ranking.entries.find((e) => e.position === position)
    }
    for (const r of releases) {
      const key = r.gender ?? 'MIXED'
      const entry = pickEntry(r.gender, r.position)
      if (!entry) continue
      ;(released[key] ??= []).push({
        position: entry.position,
        participantId: entry.participantId,
        name: entry.name,
        totalScore: entry.totalScore,
      })
    }
    return { eventGenderMode: event.genderMode, released }
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
