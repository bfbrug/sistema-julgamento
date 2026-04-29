import { Injectable, Inject, ConflictException, UnprocessableEntityException, ForbiddenException, NotFoundException } from '@nestjs/common'
import { Prisma } from '@prisma/client'
import { ScoringRepository } from './scoring.repository'
import { computeParticipantState } from './state-machine/participant-state.machine'
import { AuditService } from '../audit/audit.service'
import { PrismaService } from '../../config/prisma.service'
import { RegisterScoresDto } from './dto/register-scores.dto'
import { WS_EVENTS } from '@judging/shared'
import { ScoringGateway } from './scoring.gateway'

@Injectable()
export class ScoringService {
  constructor(
    @Inject(ScoringRepository) private readonly repository: ScoringRepository,
    @Inject(AuditService) private readonly auditService: AuditService,
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(ScoringGateway) private readonly gateway: ScoringGateway,
  ) {}

  async activateParticipant(eventId: string, participantId: string, managerId: string) {
    const active = await this.repository.findActiveParticipant(eventId)

    if (active) {
      throw new ConflictException({
        code: 'PARTICIPANT_ALREADY_ACTIVE',
        message: 'Já existe um participante ativo no evento',
        activeParticipantId: active.id,
      })
    }

    const participant = await this.repository.findParticipantById(participantId)
    if (!participant || participant.eventId !== eventId) {
      throw new NotFoundException('Participante não encontrado')
    }

    if (participant.currentState !== 'WAITING') {
      throw new UnprocessableEntityException({
        code: 'INVALID_PARTICIPANT_STATE',
        message: `Participante está em estado ${participant.currentState}, não pode ser ativado`,
      })
    }

    if (participant.isAbsent) {
      throw new UnprocessableEntityException({
        code: 'PARTICIPANT_IS_ABSENT',
        message: 'Participante está marcado como ausente',
      })
    }

    const judges = await this.repository.getActiveJudges(eventId)

    await this.prisma.$transaction(async (tx) => {
      await tx.participant.update({
        where: { id: participantId },
        data: { currentState: 'PREVIEW' },
      })

      await tx.participantStateLog.create({
        data: {
          participantId,
          state: 'PREVIEW',
          changedByUserId: managerId,
        },
      })

      for (const judge of judges) {
        await tx.judgeParticipantSession.upsert({
          where: {
            judgeId_participantId: {
              judgeId: judge.id,
              participantId,
            },
          },
          create: {
            judgeId: judge.id,
            participantId,
            eventId,
            status: 'NOT_STARTED',
          },
          update: {},
        })
      }
    })

    this.gateway.emitToEvent(eventId, WS_EVENTS.PARTICIPANT_ACTIVATED, {
      eventId,
      participantId,
      participantName: participant.name,
      judgeCount: judges.length,
    })

    await this.auditService.record({
      actorId: managerId,
      action: 'PARTICIPANT_ACTIVATED',
      entityType: 'PARTICIPANT',
      entityId: participantId,
      payload: { eventId },
    })
  }

  async startScoring(eventId: string, participantId: string, managerId: string) {
    const participant = await this.repository.findParticipantById(participantId)
    if (!participant || participant.eventId !== eventId) {
      throw new NotFoundException('Participante não encontrado')
    }

    if (participant.currentState !== 'PREVIEW') {
      throw new UnprocessableEntityException({
        code: 'INVALID_PARTICIPANT_STATE',
        message: `Participante está em estado ${participant.currentState}, não pode iniciar scoring`,
      })
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.participant.update({
        where: { id: participantId },
        data: { currentState: 'SCORING' },
      })

      await tx.participantStateLog.create({
        data: {
          participantId,
          state: 'SCORING',
          changedByUserId: managerId,
        },
      })

      await tx.judgeParticipantSession.updateMany({
        where: { participantId, status: 'NOT_STARTED' },
        data: { status: 'IN_SCORING', startedAt: new Date() },
      })
    })

    this.gateway.emitToEvent(eventId, WS_EVENTS.SCORING_STARTED, {
      eventId,
      participantId,
    })

    await this.auditService.record({
      actorId: managerId,
      action: 'SCORING_STARTED',
      entityType: 'PARTICIPANT',
      entityId: participantId,
      payload: { eventId },
    })
  }

  async registerScores(eventId: string, participantId: string, judgeId: string, dto: RegisterScoresDto, userId: string) {
    const session = await this.repository.findSession(judgeId, participantId)
    if (!session || !['IN_SCORING', 'IN_REVIEW'].includes(session.status)) {
      throw new ForbiddenException('Sessão de scoring não está ativa')
    }

    const judgeCategories = await this.repository.getJudgeCategories(judgeId)
    const allowedCategoryIds = new Set(judgeCategories.map((jc) => jc.categoryId))

    for (const score of dto.scores) {
      if (!allowedCategoryIds.has(score.categoryId)) {
        throw new ForbiddenException(`Categoria ${score.categoryId} não atribuída a este jurado`)
      }
    }

    await this.prisma.$transaction(async (tx) => {
      for (const score of dto.scores) {
        await tx.score.upsert({
          where: {
            judgeId_participantId_categoryId: {
              judgeId,
              participantId,
              categoryId: score.categoryId,
            },
          },
          create: {
            judgeId,
            participantId,
            categoryId: score.categoryId,
            eventId,
            value: score.value,
          },
          update: { value: score.value },
        })
      }
    })

    this.gateway.emitToEvent(eventId, WS_EVENTS.SCORES_UPDATED, {
      eventId,
      participantId,
      judgeId,
    })

    await this.auditService.record({
      actorId: userId,
      action: 'SCORES_REGISTERED',
      entityType: 'PARTICIPANT',
      entityId: participantId,
      payload: { judgeId, scores: dto.scores },
    })
  }

  async confirmScores(eventId: string, participantId: string, judgeId: string, userId: string) {
    const session = await this.repository.findSession(judgeId, participantId)
    if (!session || session.status !== 'IN_SCORING') {
      throw new UnprocessableEntityException('Sessão não está em fase de scoring')
    }

    const judgeCategories = await this.repository.getJudgeCategories(judgeId)
    const scores = await this.repository.findScoresByJudgeAndParticipant(judgeId, participantId)

    if (scores.length < judgeCategories.length) {
      throw new UnprocessableEntityException({
        code: 'INCOMPLETE_SCORES',
        message: 'Todas as categorias devem ser pontuadas antes de confirmar',
      })
    }

    const judge = await this.prisma.judge.findUnique({
      where: { id: judgeId },
      select: { displayName: true },
    })

    await this.prisma.$transaction(async (tx) => {
      await tx.judgeParticipantSession.update({
        where: { id: session.id },
        data: {
          status: 'IN_REVIEW',
          confirmedAt: new Date(),
        },
      })

      await this.recomputeColetiveState(participantId, userId, tx)
    })

    this.gateway.emitToEvent(eventId, WS_EVENTS.JUDGE_CONFIRMED, {
      eventId,
      participantId,
      judgeId,
      judgeDisplayName: judge?.displayName || 'Jurado',
      status: 'IN_REVIEW',
    })

    await this.auditService.record({
      actorId: userId,
      action: 'JUDGE_CONFIRMED_SCORES',
      entityType: 'PARTICIPANT',
      entityId: participantId,
      payload: { judgeId },
    })
  }

  async reviseScores(eventId: string, participantId: string, judgeId: string, userId: string) {
    const session = await this.repository.findSession(judgeId, participantId)
    if (!session || session.status !== 'IN_REVIEW') {
      throw new UnprocessableEntityException('Sessão não está em fase de revisão')
    }

    const judge = await this.prisma.judge.findUnique({
      where: { id: judgeId },
      select: { displayName: true },
    })

    await this.prisma.$transaction(async (tx) => {
      await tx.judgeParticipantSession.update({
        where: { id: session.id },
        data: {
          status: 'IN_SCORING',
          confirmedAt: null,
        },
      })

      await this.recomputeColetiveState(participantId, userId, tx)
    })

    this.gateway.emitToEvent(eventId, WS_EVENTS.JUDGE_REVISING, {
      eventId,
      participantId,
      judgeId,
      judgeDisplayName: judge?.displayName || 'Jurado',
      status: 'IN_SCORING',
    })

    await this.auditService.record({
      actorId: userId,
      action: 'JUDGE_REVISED_SCORES',
      entityType: 'PARTICIPANT',
      entityId: participantId,
      payload: { judgeId },
    })
  }

  async finalizeScores(eventId: string, participantId: string, judgeId: string, userId: string) {
    const session = await this.repository.findSession(judgeId, participantId)
    if (!session || session.status !== 'IN_REVIEW') {
      throw new UnprocessableEntityException('Sessão não está em fase de revisão')
    }

    const judge = await this.prisma.judge.findUnique({
      where: { id: judgeId },
      select: { displayName: true },
    })

    const now = new Date()

    await this.prisma.$transaction(async (tx) => {
      // Pessimistic Lock
      await tx.$executeRaw`SELECT 1 FROM participants WHERE id = ${participantId} FOR UPDATE`

      await tx.score.updateMany({
        where: { judgeId, participantId },
        data: { isFinalized: true, finalizedAt: now },
      })

      await tx.judgeParticipantSession.update({
        where: { id: session.id },
        data: {
          status: 'FINISHED',
          finalizedAt: now,
        },
      })

      const isLast = await this.recomputeColetiveState(participantId, userId, tx)
      
      if (isLast) {
        this.gateway.emitToEvent(eventId, WS_EVENTS.PARTICIPANT_FINISHED, {
          eventId,
          participantId,
        })
      }
    }, { isolationLevel: 'Serializable' })

    this.gateway.emitToEvent(eventId, WS_EVENTS.JUDGE_FINALIZED, {
      eventId,
      participantId,
      judgeId,
      judgeDisplayName: judge?.displayName || 'Jurado',
      status: 'FINISHED',
    })

    await this.auditService.record({
      actorId: userId,
      action: 'JUDGE_FINALIZED_SCORES',
      entityType: 'PARTICIPANT',
      entityId: participantId,
      payload: { judgeId },
    })
  }

  async markAbsent(eventId: string, participantId: string, managerId: string) {
    const participant = await this.repository.findParticipantById(participantId)
    if (!participant || participant.eventId !== eventId) {
      throw new NotFoundException('Participante não encontrado')
    }

    if (participant.currentState === 'FINISHED') {
      throw new UnprocessableEntityException({
        code: 'PARTICIPANT_ALREADY_FINISHED',
        message: 'Não é possível marcar ausência de um participante já finalizado',
      })
    }

    await this.repository.updateParticipantState(participantId, 'ABSENT', managerId)

    this.gateway.emitToEvent(eventId, WS_EVENTS.PARTICIPANT_ABSENT, {
      eventId,
      participantId,
    })

    await this.auditService.record({
      actorId: managerId,
      action: 'PARTICIPANT_MARKED_ABSENT',
      entityType: 'PARTICIPANT',
      entityId: participantId,
      payload: { eventId },
    })
  }

  private async recomputeColetiveState(
    participantId: string,
    userId: string,
    tx: Prisma.TransactionClient,
  ): Promise<boolean> {
    const participant = await tx.participant.findUnique({
      where: { id: participantId },
      include: { event: true },
    })

    const sessions = await tx.judgeParticipantSession.findMany({
      where: { participantId },
    })

    const activeJudgesCount = await tx.judge.count({
      where: {
        eventId: participant.eventId,
        judgeCategories: { some: {} },
      },
    })

    const newState = computeParticipantState(
      participant.currentState as Parameters<typeof computeParticipantState>[0],
      sessions as Parameters<typeof computeParticipantState>[1],
      activeJudgesCount,
    )

    if (newState !== participant.currentState) {
      await tx.participant.update({
        where: { id: participantId },
        data: { currentState: newState },
      })

      await tx.participantStateLog.create({
        data: {
          participantId,
          state: newState,
          changedByUserId: userId,
        },
      })
      
      if (newState === 'FINISHED') {
        await this.auditService.record({
          actorId: userId,
          action: 'PARTICIPANT_FINISHED',
          entityType: 'PARTICIPANT',
          entityId: participantId,
          payload: { eventId: participant.eventId },
        })
        return true
      }
    }
    return false
  }

  async getJudgeState(eventId: string, judgeId: string) {
    const activeParticipant = await this.repository.findActiveParticipant(eventId)
    if (!activeParticipant) {
      return { activeParticipant: null, message: 'Aguardando próximo participante' }
    }

    const session = await this.repository.findSession(judgeId, activeParticipant.id)
    const judgeCategories = await this.repository.getJudgeCategories(judgeId)
    const scores = await this.repository.findScoresByJudgeAndParticipant(judgeId, activeParticipant.id)

    const categoriesWithScore = judgeCategories.map((jc) => {
      const score = scores.find((s) => s.categoryId === jc.categoryId)
      return {
        id: jc.category.id,
        name: jc.category.name,
        displayOrder: jc.category.displayOrder,
        currentScore: score ? Number(score.value) : null,
      }
    })

    return {
      activeParticipant: {
        id: activeParticipant.id,
        name: activeParticipant.name,
        photoUrl: activeParticipant.photoPath,
        presentationOrder: activeParticipant.presentationOrder,
        currentState: activeParticipant.currentState,
        myCategoriesToScore: categoriesWithScore,
        mySessionStatus: session?.status || 'NOT_STARTED',
      },
    }
  }

  async getEventScoringState(eventId: string) {
    const state = await this.repository.getEventScoringState(eventId)
    if (!state) throw new NotFoundException('Evento não encontrado')

    const activeParticipant = state.participants.find((p) =>
      ['PREVIEW', 'SCORING', 'REVIEW'].includes(p.currentState),
    )

    const pendingNext = state.participants.find(
      (p) => p.currentState === 'WAITING' && !p.isAbsent,
    )

    const totalJudges = await this.repository.getActiveJudgesCount(eventId)

    return {
      event: { id: state.id, name: state.name, status: state.status },
      activeParticipant: activeParticipant
        ? {
            ...activeParticipant,
            sessionsProgress: {
              finished: activeParticipant.sessions.filter((s) => s.status === 'FINISHED').length,
              total: totalJudges,
            },
          }
        : null,
      participants: state.participants.map((p) => ({
        id: p.id,
        name: p.name,
        presentationOrder: p.presentationOrder,
        currentState: p.currentState,
        isAbsent: p.isAbsent,
        sessionsProgress: {
          finished: p.sessions.filter((s) => s.status === 'FINISHED').length,
          total: totalJudges,
        },
      })),
      pendingNext: pendingNext
        ? { id: pendingNext.id, name: pendingNext.name, presentationOrder: pendingNext.presentationOrder }
        : null,
    }
  }
}
