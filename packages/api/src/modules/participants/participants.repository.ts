import { Injectable, Inject } from '@nestjs/common'
import { Participant, Prisma, ParticipantState } from '@prisma/client'
import { PrismaService } from '../../config/prisma.service'

export type ParticipantWithCounts = Participant & {
  _count: {
    scores: number
  }
  scoresFinalized: number
}

@Injectable()
export class ParticipantsRepository {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async create(data: Prisma.ParticipantCreateInput): Promise<Participant> {
    return this.prisma.participant.create({ data })
  }

  async findById(id: string): Promise<ParticipantWithCounts | null> {
    const participant = await this.prisma.participant.findUnique({
      where: { id },
      include: {
        _count: { select: { scores: true } },
      },
    })
    if (!participant) return null

    const finalized = await this.prisma.score.count({
      where: { participantId: id, isFinalized: true },
    })

    return { ...participant, scoresFinalized: finalized }
  }

  async findByEventId(eventId: string): Promise<ParticipantWithCounts[]> {
    const participants = await this.prisma.participant.findMany({
      where: { eventId },
      orderBy: { presentationOrder: 'asc' },
      include: {
        _count: { select: { scores: true } },
      },
    })

    const withCounts = await Promise.all(
      participants.map(async (p) => {
        const finalized = await this.prisma.score.count({
          where: { participantId: p.id, isFinalized: true },
        })
        return { ...p, scoresFinalized: finalized }
      }),
    )

    return withCounts
  }

  async update(id: string, data: Prisma.ParticipantUpdateInput): Promise<Participant> {
    return this.prisma.participant.update({ where: { id }, data })
  }

  async delete(id: string): Promise<void> {
    await this.prisma.participant.delete({ where: { id } })
  }

  async countScores(participantId: string): Promise<number> {
    return this.prisma.score.count({ where: { participantId } })
  }

  async maxPresentationOrder(eventId: string): Promise<number> {
    const result = await this.prisma.participant.aggregate({
      where: { eventId },
      _max: { presentationOrder: true },
    })
    return result._max.presentationOrder ?? 0
  }

  async shiftPresentationOrderUp(eventId: string, fromOrder: number): Promise<void> {
    await this.prisma.participant.updateMany({
      where: { eventId, presentationOrder: { gte: fromOrder } },
      data: { presentationOrder: { increment: 1 } },
    })
  }

  async compactPresentationOrder(eventId: string): Promise<void> {
    const participants = await this.prisma.participant.findMany({
      where: { eventId },
      orderBy: { presentationOrder: 'asc' },
      select: { id: true },
    })
    await this.prisma.$transaction(
      participants.map((p, index) =>
        this.prisma.participant.update({
          where: { id: p.id },
          data: { presentationOrder: index + 1 },
        }),
      ),
    )
  }

  async reorderInTransaction(
    items: Array<{ id: string; presentationOrder: number }>,
  ): Promise<void> {
    await this.prisma.$transaction(
      items.map(({ id, presentationOrder }) =>
        this.prisma.participant.update({ where: { id }, data: { presentationOrder } }),
      ),
    )
  }

  async createStateLog(
    participantId: string,
    state: ParticipantState,
    changedByUserId: string,
  ): Promise<void> {
    await this.prisma.participantStateLog.create({
      data: {
        participantId,
        state,
        changedByUserId,
      },
    })
  }
}
