import { Injectable, Inject, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../../config/prisma.service'
import { decimalToNumber } from './helpers/numeric'

@Injectable()
export class CalculationRepository {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async getEventForCalculation(eventId: string, managerId: string) {
    const event = await this.prisma.judgingEvent.findFirst({
      where: {
        id: eventId,
        managerId,
      },
      include: {
        categories: {
          select: { id: true, name: true },
        },
      },
    })

    if (!event) {
      throw new NotFoundException('Evento não encontrado ou acesso negado')
    }

    return {
      id: event.id,
      name: event.name,
      calculationRule: event.calculationRule,
      scoreMin: decimalToNumber(event.scoreMin),
      scoreMax: decimalToNumber(event.scoreMax),
      status: event.status,
      categories: event.categories,
      topN: event.topN,
    }
  }

  async getTiebreakerConfig(eventId: string) {
    return this.prisma.tiebreakerConfig.findUnique({
      where: { eventId },
    })
  }

  async getCategoryNamesMap(eventId: string): Promise<Map<string, string>> {
    const categories = await this.prisma.category.findMany({
      where: { eventId },
      select: { id: true, name: true },
    })
    return new Map(categories.map((c) => [c.id, c.name]))
  }

  async getEligibleParticipants(eventId: string) {
    return this.prisma.participant.findMany({
      where: {
        eventId,
        isAbsent: false,
      },
      select: {
        id: true,
        name: true,
        presentationOrder: true,
        scores: {
          where: { isFinalized: true },
          select: {
            judgeId: true,
            categoryId: true,
            value: true,
          },
        },
      },
      orderBy: { presentationOrder: 'asc' },
    })
  }

  async getExcludedParticipants(eventId: string) {
    return this.prisma.participant.findMany({
      where: {
        eventId,
        isAbsent: true,
      },
      select: {
        id: true,
        name: true,
      },
    })
  }

  async getJudgesActiveInEvent(eventId: string) {
    const judges = await this.prisma.judge.findMany({
      where: { eventId },
      include: {
        judgeCategories: {
          select: { categoryId: true },
        },
      },
    })

    return judges.map((j) => ({
      id: j.id,
      name: j.displayName,
      categoriesIds: j.judgeCategories.map((c) => c.categoryId),
    }))
  }
}
