import { Injectable, Inject } from '@nestjs/common'
import { PrismaService } from '../../config/prisma.service'
import { Prisma, JudgingEvent, EventStatus, TiebreakerConfig } from '@prisma/client'
import { ListEventsDto } from './dto/list-events.dto'

export type EventWithRelations = JudgingEvent & {
  tiebreakerConfig: TiebreakerConfig | null
  _count: {
    categories: number
    judges: number
    participants: number
  }
}

@Injectable()
export class EventsRepository {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async create(data: Prisma.JudgingEventCreateInput): Promise<EventWithRelations> {
    return this.prisma.judgingEvent.create({
      data,
      include: {
        tiebreakerConfig: true,
        _count: { select: { categories: true, judges: true, participants: true } },
      },
    })
  }

  async findById(id: string, managerId: string): Promise<EventWithRelations | null> {
    return this.prisma.judgingEvent.findFirst({
      where: { id, managerId, deletedAt: null },
      include: {
        tiebreakerConfig: true,
        _count: { select: { categories: true, judges: true, participants: true } },
      },
    })
  }

  async findByIdRaw(id: string): Promise<JudgingEvent | null> {
    return this.prisma.judgingEvent.findFirst({ where: { id, deletedAt: null } })
  }

  async list(
    filters: ListEventsDto,
    managerId: string,
  ): Promise<{ data: EventWithRelations[]; total: number }> {
    const { page = 1, pageSize = 20, search, status, includeDeleted } = filters
    const skip = (page - 1) * pageSize

    const where: Prisma.JudgingEventWhereInput = { managerId }

    if (!includeDeleted) {
      where.deletedAt = null
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { organizer: { contains: search, mode: 'insensitive' } },
        { location: { contains: search, mode: 'insensitive' } },
      ]
    }

    if (status) {
      where.status = status
    }

    const [data, total] = await Promise.all([
      this.prisma.judgingEvent.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: {
          tiebreakerConfig: true,
          _count: { select: { categories: true, judges: true, participants: true } },
        },
      }),
      this.prisma.judgingEvent.count({ where }),
    ])

    return { data, total }
  }

  async update(id: string, data: Prisma.JudgingEventUpdateInput): Promise<EventWithRelations> {
    return this.prisma.judgingEvent.update({
      where: { id },
      data,
      include: {
        tiebreakerConfig: true,
        _count: { select: { categories: true, judges: true, participants: true } },
      },
    })
  }

  async softDelete(id: string): Promise<void> {
    await this.prisma.judgingEvent.update({
      where: { id },
      data: { deletedAt: new Date() },
    })
  }

  async updateStatus(id: string, status: EventStatus): Promise<EventWithRelations> {
    return this.prisma.judgingEvent.update({
      where: { id },
      data: { status },
      include: {
        tiebreakerConfig: true,
        _count: { select: { categories: true, judges: true, participants: true } },
      },
    })
  }

  async upsertTiebreaker(
    eventId: string,
    data: { firstCategoryId?: string | null; secondCategoryId?: string | null },
  ): Promise<TiebreakerConfig> {
    return this.prisma.tiebreakerConfig.upsert({
      where: { eventId },
      create: { eventId, ...data },
      update: data,
    })
  }

  async deleteTiebreaker(eventId: string): Promise<void> {
    await this.prisma.tiebreakerConfig.deleteMany({ where: { eventId } })
  }

  async countCategoriesForEvent(eventId: string): Promise<number> {
    return this.prisma.category.count({ where: { eventId } })
  }

  async countJudgesForEvent(eventId: string): Promise<number> {
    return this.prisma.judge.count({ where: { eventId } })
  }

  async countParticipantsForEvent(eventId: string): Promise<number> {
    return this.prisma.participant.count({ where: { eventId } })
  }

  async findPendingParticipants(eventId: string): Promise<string[]> {
    const pending = await this.prisma.participant.findMany({
      where: {
        eventId,
        currentState: { in: ['PREVIEW', 'SCORING', 'REVIEW', 'WAITING'] },
      },
      select: { id: true },
    })
    return pending.map(p => p.id)
  }

  async findCategoriesWithFewJudges(eventId: string, minJudges: number): Promise<string[]> {
    const categories = await this.prisma.category.findMany({
      where: { eventId },
      select: {
        id: true,
        _count: { select: { judgeCategories: true } },
      },
    })
    return categories
      .filter(c => c._count.judgeCategories < minJudges)
      .map(c => c.id)
  }

  async categoryBelongsToEvent(categoryId: string, eventId: string): Promise<boolean> {
    const count = await this.prisma.category.count({ where: { id: categoryId, eventId } })
    return count > 0
  }
}
