import { Injectable, Inject } from '@nestjs/common'
import { PrismaService } from '../../config/prisma.service'
import {
  Participant,
  JudgeParticipantSession,
  ParticipantState,
  Score,
  Prisma,
} from '@prisma/client'

@Injectable()
export class ScoringRepository {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async findActiveParticipant(eventId: string): Promise<Participant | null> {
    return this.prisma.participant.findFirst({
      where: {
        eventId,
        currentState: {
          in: ['PREVIEW', 'SCORING', 'REVIEW'],
        },
      },
    })
  }

  async findParticipantById(id: string): Promise<Participant | null> {
    return this.prisma.participant.findUnique({ where: { id } })
  }

  async findSession(
    judgeId: string,
    participantId: string,
  ): Promise<JudgeParticipantSession | null> {
    return this.prisma.judgeParticipantSession.findUnique({
      where: {
        judgeId_participantId: { judgeId, participantId },
      },
    })
  }

  async createSessions(
    sessions: Prisma.JudgeParticipantSessionCreateManyInput[],
    tx?: Prisma.TransactionClient,
  ): Promise<void> {
    const client = tx ?? this.prisma
    await client.judgeParticipantSession.createMany({
      data: sessions,
      skipDuplicates: true,
    })
  }

  async updateSession(
    id: string,
    data: Prisma.JudgeParticipantSessionUpdateInput,
    tx?: Prisma.TransactionClient,
  ): Promise<JudgeParticipantSession> {
    const client = tx ?? this.prisma
    return client.judgeParticipantSession.update({
      where: { id },
      data,
    })
  }

  async getSessionsByParticipant(
    participantId: string,
  ): Promise<JudgeParticipantSession[]> {
    return this.prisma.judgeParticipantSession.findMany({
      where: { participantId },
    })
  }

  async getActiveJudgesCount(eventId: string): Promise<number> {
    // Conta jurados que estão vinculados a pelo menos uma categoria no evento
    const result = await this.prisma.judge.count({
      where: {
        eventId,
        judgeCategories: { some: {} },
      },
    })
    return result
  }

  async upsertScore(
    data: Prisma.ScoreUncheckedCreateInput,
    tx?: Prisma.TransactionClient,
  ): Promise<Score> {
    const client = tx ?? this.prisma
    return client.score.upsert({
      where: {
        participantId_judgeId_categoryId: {
          participantId: data.participantId,
          judgeId: data.judgeId,
          categoryId: data.categoryId,
        },
      },
      update: {
        value: data.value,
        isFinalized: false,
      },
      create: {
        ...data,
        isFinalized: false,
      },
    })
  }

  async findScoresByJudgeAndParticipant(
    judgeId: string,
    participantId: string,
  ): Promise<Score[]> {
    return this.prisma.score.findMany({
      where: { judgeId, participantId },
    })
  }

  async finalizeScores(
    judgeId: string,
    participantId: string,
    finalizedAt: Date,
    tx?: Prisma.TransactionClient,
  ): Promise<void> {
    const client = tx ?? this.prisma
    await client.score.updateMany({
      where: { judgeId, participantId },
      data: {
        isFinalized: true,
        finalizedAt,
      },
    })
  }

  async updateParticipantState(
    id: string,
    state: ParticipantState,
    changedByUserId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<void> {
    const client = tx || this.prisma
    await client.participant.update({
      where: { id },
      data: {
        currentState: state,
        isAbsent: state === 'ABSENT',
      },
    })

    await client.participantStateLog.create({
      data: {
        participantId: id,
        state,
        changedByUserId,
      },
    })
  }

  async getEventScoringState(eventId: string) {
    return this.prisma.judgingEvent.findUnique({
      where: { id: eventId },
      include: {
        participants: {
          orderBy: { presentationOrder: 'asc' },
          include: {
            sessions: {
              select: { status: true },
            },
          },
        },
      },
    })
  }

  async getJudgeCategories(judgeId: string) {
    return this.prisma.judgeCategory.findMany({
      where: { judgeId },
      include: {
        category: true,
      },
    })
  }
}
