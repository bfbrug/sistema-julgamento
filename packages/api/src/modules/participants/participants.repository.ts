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

  async create(data: Prisma.ParticipantCreateInput, tx?: Prisma.TransactionClient): Promise<Participant> {
    const client = tx ?? this.prisma
    return client.participant.create({ data })
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

  async update(id: string, data: Prisma.ParticipantUpdateInput, tx?: Prisma.TransactionClient): Promise<Participant> {
    const client = tx ?? this.prisma
    return client.participant.update({ where: { id }, data })
  }

  async delete(id: string, tx?: Prisma.TransactionClient): Promise<void> {
    const client = tx ?? this.prisma
    await client.participant.delete({ where: { id } })
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

  async shiftPresentationOrderUp(eventId: string, fromOrder: number, tx?: Prisma.TransactionClient): Promise<void> {
    const client = tx ?? this.prisma
    await client.participant.updateMany({
      where: { eventId, presentationOrder: { gte: fromOrder } },
      data: { presentationOrder: { increment: 1 } },
    })
  }

  async compactPresentationOrder(eventId: string, tx?: Prisma.TransactionClient): Promise<void> {
    const run = async (client: Prisma.TransactionClient) => {
      const participants = await client.participant.findMany({
        where: { eventId },
        orderBy: { presentationOrder: 'asc' },
        select: { id: true },
      })
      for (let i = 0; i < participants.length; i++) {
        await client.participant.update({
          where: { id: participants[i].id },
          data: { presentationOrder: i + 1 },
        })
      }
    }
    if (tx) {
      await run(tx)
    } else {
      await this.prisma.$transaction((client) => run(client))
    }
  }

  async reorderInTransaction(
    items: Array<{ id: string; presentationOrder: number }>,
    tx?: Prisma.TransactionClient,
  ): Promise<void> {
    const run = async (client: Prisma.TransactionClient) => {
      const offset = 100000
      for (const { id, presentationOrder } of items) {
        await client.participant.update({ where: { id }, data: { presentationOrder: presentationOrder + offset } })
      }
      for (const { id, presentationOrder } of items) {
        await client.participant.update({ where: { id }, data: { presentationOrder } })
      }
    }
    if (tx) {
      await run(tx)
    } else {
      await this.prisma.$transaction((client) => run(client))
    }
  }

  async createStateLog(
    participantId: string,
    state: ParticipantState,
    changedByUserId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<void> {
    const client = tx ?? this.prisma
    await client.participantStateLog.create({
      data: {
        participantId,
        state,
        changedByUserId,
      },
    })
  }
}
