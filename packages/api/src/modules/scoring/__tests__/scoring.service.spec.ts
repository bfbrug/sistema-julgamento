import { Test, TestingModule } from '@nestjs/testing'
import { ScoringService } from '../scoring.service'
import { ScoringRepository } from '../scoring.repository'
import { AuditService } from '../../audit/audit.service'
import { PrismaService } from '../../../config/prisma.service'
import { ScoringGateway } from '../scoring.gateway'
import { ConflictException, UnprocessableEntityException, NotFoundException } from '@nestjs/common'
import { ParticipantState, JudgeSessionStatus } from '@judging/shared'

describe('ScoringService', () => {
  let service: ScoringService
  let repository: ScoringRepository
  let prisma: PrismaService
  let gateway: ScoringGateway

  const mockAuditService = {
    log: vi.fn(),
  }

  const mockGateway = {
    emitToEvent: vi.fn(),
  }

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ScoringService,
        {
          provide: ScoringRepository,
          useValue: {
            findActiveParticipant: vi.fn(),
            findParticipantById: vi.fn(),
            updateParticipantState: vi.fn(),
            findSession: vi.fn(),
            getJudgeCategories: vi.fn(),
            findScoresByJudgeAndParticipant: vi.fn(),
            getActiveJudgesCount: vi.fn(),
            getEventScoringState: vi.fn(),
          },
        },
        { provide: AuditService, useValue: mockAuditService },
        {
          provide: PrismaService,
          useValue: {
            judge: { findMany: vi.fn(), findUnique: vi.fn(), count: vi.fn() },
            judgingEvent: { findUnique: vi.fn() },
            judgeParticipantSession: { createMany: vi.fn(), update: vi.fn(), findMany: vi.fn() },
            participant: { findUnique: vi.fn(), update: vi.fn() },
            participantStateLog: { create: vi.fn() },
            score: { upsert: vi.fn(), updateMany: vi.fn() },
            $transaction: vi.fn((cb) => cb(prisma)),
            $executeRaw: vi.fn(),
          },
        },
        { provide: ScoringGateway, useValue: mockGateway },
      ],
    }).compile()

    service = module.get<ScoringService>(ScoringService)
    repository = module.get<ScoringRepository>(ScoringRepository)
    prisma = module.get<PrismaService>(PrismaService)
    gateway = module.get<ScoringGateway>(ScoringGateway)
  })

  describe('activateParticipant', () => {
    it('should throw ConflictException if another participant is already active', async () => {
      vi.spyOn(repository, 'findActiveParticipant').mockResolvedValue({ id: 'other' } as any)
      
      await expect(
        service.activateParticipant('event-1', 'part-1', 'manager-1')
      ).rejects.toThrow(ConflictException)
    })

    it('should activate participant and create sessions', async () => {
      vi.spyOn(repository, 'findActiveParticipant').mockResolvedValue(null)
      vi.spyOn(repository, 'findParticipantById').mockResolvedValue({
        id: 'part-1',
        eventId: 'event-1',
        currentState: 'WAITING',
        presentationOrder: 1,
        name: 'John'
      } as any)
      vi.spyOn(prisma.judge, 'findMany').mockResolvedValue([{ id: 'judge-1' }] as any)

      await service.activateParticipant('event-1', 'part-1', 'manager-1')

      expect(repository.updateParticipantState).toHaveBeenCalledWith('part-1', 'PREVIEW', 'manager-1', expect.anything())
      expect(prisma.judgeParticipantSession.createMany).toHaveBeenCalled()
      expect(gateway.emitToEvent).toHaveBeenCalledWith('event-1', 'participant_activated', expect.anything())
    })
  })

  describe('confirmScores', () => {
    it('should throw UnprocessableEntityException if scores are missing', async () => {
      vi.spyOn(repository, 'findSession').mockResolvedValue({ status: 'IN_SCORING' } as any)
      vi.spyOn(repository, 'getJudgeCategories').mockResolvedValue([{ categoryId: 'cat-1' }, { categoryId: 'cat-2' }] as any)
      vi.spyOn(repository, 'findScoresByJudgeAndParticipant').mockResolvedValue([{ categoryId: 'cat-1' }] as any)

      await expect(
        service.confirmScores('event-1', 'part-1', 'judge-1', 'user-1')
      ).rejects.toThrow(UnprocessableEntityException)
    })
  })

  describe('finalizeScores', () => {
    it('should finalize scores and update participant state if last judge', async () => {
      vi.spyOn(repository, 'findSession').mockResolvedValue({ id: 'sess-1', status: 'IN_REVIEW' } as any)
      vi.spyOn(prisma.judge, 'findUnique').mockResolvedValue({ displayName: 'Judge' } as any)
      
      // Mock recomputeColetiveState logic
      vi.spyOn(prisma.participant, 'findUnique').mockResolvedValue({ id: 'part-1', eventId: 'event-1', currentState: 'REVIEW' } as any)
      vi.spyOn(prisma.judgeParticipantSession, 'findMany').mockResolvedValue([{ status: 'FINISHED' }] as any)
      vi.spyOn(prisma.judge, 'count').mockResolvedValue(1)

      await service.finalizeScores('event-1', 'part-1', 'judge-1', 'user-1')

      expect(prisma.score.updateMany).toHaveBeenCalledWith({
        where: { judgeId: 'judge-1', participantId: 'part-1' },
        data: { isFinalized: true, finalizedAt: expect.anything() }
      })
      expect(prisma.participant.update).toHaveBeenCalledWith({
        where: { id: 'part-1' },
        data: { currentState: 'FINISHED' }
      })
      expect(gateway.emitToEvent).toHaveBeenCalledWith('event-1', 'participant_finished', expect.anything())
    })
  })
})
