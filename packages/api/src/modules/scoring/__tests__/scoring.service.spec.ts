import { Test, TestingModule } from '@nestjs/testing'
import { ScoringService } from '../scoring.service'
import { ScoringRepository } from '../scoring.repository'
import { AuditService } from '../../audit/audit.service'
import { PrismaService } from '../../../config/prisma.service'
import { ScoringGateway } from '../scoring.gateway'
import { PublicLiveGateway } from '../public-live.gateway'
import { ConflictException, UnprocessableEntityException } from '@nestjs/common'
import { CalculationService } from '../../calculation/calculation.service'
import { STORAGE_SERVICE } from '../../storage/storage.service.interface'

describe('ScoringService', () => {
  let service: ScoringService
  let repository: ScoringRepository
  let prisma: PrismaService
  let gateway: ScoringGateway

  const mockAuditService = {
    record: vi.fn(),
  }

  const mockGateway = {
    emitToEvent: vi.fn(),
  }

  const mockPublicGateway = {
    emitToEvent: vi.fn(),
  }

  // Mock do cliente de transação (tx) — deve espelhar todos os modelos usados
  // dentro de $transaction no ScoringService
  const makeTxMock = () => ({
    participant: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    participantStateLog: {
      create: vi.fn(),
    },
    judgeParticipantSession: {
      upsert: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      findMany: vi.fn(),
    },
    judge: {
      findMany: vi.fn(),
      count: vi.fn(),
    },
    score: {
      upsert: vi.fn(),
      updateMany: vi.fn(),
    },
    $executeRaw: vi.fn(),
  })

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
            upsertScore: vi.fn(),
          },
        },
        { provide: AuditService, useValue: mockAuditService },
        {
          provide: PrismaService,
          useValue: {
            judge: { findMany: vi.fn(), findUnique: vi.fn(), count: vi.fn() },
            judgingEvent: { findUnique: vi.fn() },
            judgeParticipantSession: {
              createMany: vi.fn(),
              update: vi.fn(),
              updateMany: vi.fn(),
              findMany: vi.fn(),
              upsert: vi.fn(),
              count: vi.fn(),
            },
            participant: { findUnique: vi.fn(), update: vi.fn() },
            participantStateLog: { create: vi.fn() },
            score: { upsert: vi.fn(), updateMany: vi.fn() },
            // $transaction recebe um callback e o executa com um tx mock dedicado
            $transaction: vi.fn(),
            $executeRaw: vi.fn(),
          },
        },
        { provide: ScoringGateway, useValue: mockGateway },
        { provide: PublicLiveGateway, useValue: mockPublicGateway },
        { provide: CalculationService, useValue: { invalidateCache: vi.fn() } },
        { provide: STORAGE_SERVICE, useValue: { upload: vi.fn(), remove: vi.fn(), getPublicUrl: vi.fn(), exists: vi.fn() } },
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
        service.activateParticipant('event-1', 'part-1', 'manager-1'),
      ).rejects.toThrow(ConflictException)
    })

    it('should activate participant and create sessions', async () => {
      vi.spyOn(repository, 'findActiveParticipant').mockResolvedValue(null)
      vi.spyOn(repository, 'findParticipantById').mockResolvedValue({
        id: 'part-1',
        eventId: 'event-1',
        currentState: 'WAITING',
        isAbsent: false,
        presentationOrder: 1,
        name: 'John',
      } as any)
      vi.spyOn(repository, 'getActiveJudgesCount').mockResolvedValue(2)

      // Monta tx com todos os métodos usados pelo activateParticipant
      const tx = makeTxMock()
      tx.judge.findMany.mockResolvedValue([{ id: 'judge-1' }, { id: 'judge-2' }])
      tx.participant.update.mockResolvedValue({})
      tx.participantStateLog.create.mockResolvedValue({})
      tx.judgeParticipantSession.upsert.mockResolvedValue({})

      // $transaction chama o callback com nosso tx mock
      vi.spyOn(prisma, '$transaction').mockImplementation((cb: any) => cb(tx))

      await service.activateParticipant('event-1', 'part-1', 'manager-1')

      // Valida que o participante foi atualizado para PREVIEW
      expect(tx.participant.update).toHaveBeenCalledWith({
        where: { id: 'part-1' },
        data: { currentState: 'PREVIEW' },
      })

      // Valida que foram criadas sessões para cada jurado
      expect(tx.judgeParticipantSession.upsert).toHaveBeenCalledTimes(2)

      // Valida emissão do evento WebSocket
      expect(gateway.emitToEvent).toHaveBeenCalledWith(
        'event-1',
        'participant_activated',
        expect.objectContaining({ participantId: 'part-1' }),
      )
    })
  })

  describe('confirmScores', () => {
    it('should throw UnprocessableEntityException if scores are missing', async () => {
      vi.spyOn(repository, 'findSession').mockResolvedValue({ status: 'IN_SCORING' } as any)
      vi.spyOn(repository, 'getJudgeCategories').mockResolvedValue([
        { categoryId: 'cat-1' },
        { categoryId: 'cat-2' },
      ] as any)
      vi.spyOn(repository, 'findScoresByJudgeAndParticipant').mockResolvedValue([
        { categoryId: 'cat-1' },
      ] as any)

      await expect(
        service.confirmScores('event-1', 'part-1', 'judge-1', 'user-1'),
      ).rejects.toThrow(UnprocessableEntityException)
    })
  })

  describe('finalizeScores', () => {
    it('should finalize scores and update participant state if last judge', async () => {
      vi.spyOn(repository, 'findSession').mockResolvedValue({ id: 'sess-1', status: 'IN_REVIEW' } as any)
      vi.spyOn(prisma.judge, 'findUnique').mockResolvedValue({ displayName: 'Judge' } as any)

      // tx mock para finalizeScores + recomputeColetiveState
      const tx = makeTxMock()
      tx.$executeRaw.mockResolvedValue(1)
      tx.score.updateMany.mockResolvedValue({ count: 1 })
      tx.judgeParticipantSession.update.mockResolvedValue({})
      // recomputeColetiveState: participante encontrado, todas as sessões FINISHED → newState = FINISHED
      tx.participant.findUnique.mockResolvedValue({
        id: 'part-1',
        eventId: 'event-1',
        currentState: 'REVIEW',
      })
      tx.judgeParticipantSession.findMany.mockResolvedValue([{ status: 'FINISHED' }])
      tx.judge.count.mockResolvedValue(1)
      tx.participant.update.mockResolvedValue({})
      tx.participantStateLog.create.mockResolvedValue({})

      vi.spyOn(prisma, '$transaction').mockImplementation((cb: any) => cb(tx))

      await service.finalizeScores('event-1', 'part-1', 'judge-1', 'user-1')

      expect(tx.score.updateMany).toHaveBeenCalledWith({
        where: { judgeId: 'judge-1', participantId: 'part-1' },
        data: { isFinalized: true, finalizedAt: expect.any(Date) },
      })
      expect(tx.participant.update).toHaveBeenCalledWith({
        where: { id: 'part-1' },
        data: { currentState: 'FINISHED' },
      })
      expect(gateway.emitToEvent).toHaveBeenCalledWith(
        'event-1',
        'participant_finished',
        expect.anything(),
      )
    })
  })
})
