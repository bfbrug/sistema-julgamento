import { Test, TestingModule } from '@nestjs/testing'
import { BadRequestException, NotFoundException, UnprocessableEntityException } from '@nestjs/common'
import { EventsService } from '../events.service'
import { EventsRepository } from '../events.repository'
import { AuditService } from '../../audit/audit.service'
import { ScoringGateway } from '../../scoring/scoring.gateway'
import { PublicLiveGateway } from '../../scoring/public-live.gateway'
import { EventStatus, CalculationRule } from '@prisma/client'
import { PrismaService } from '../../../config/prisma.service'

const makeEvent = (overrides: Record<string, unknown> = {}) => ({
  id: 'event-1',
  name: 'Evento Teste',
  eventDate: new Date('2026-06-01'),
  location: 'São Paulo',
  organizer: 'Org',
  managerId: 'manager-1',
  calculationRule: CalculationRule.R1,
  scoreMin: 0 as unknown,
  scoreMax: 10 as unknown,
  topN: 10,
  status: EventStatus.DRAFT,
  certificateText: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  deletedAt: null,
  tiebreakerConfig: null,
  _count: { categories: 0, judges: 0, participants: 0 },
  ...overrides,
})

describe('EventsService', () => {
  let service: EventsService
  let repository: any
  let auditService: any

  beforeEach(async () => {
    repository = {
      create: vi.fn(),
      findById: vi.fn(),
      findByIdRaw: vi.fn(),
      list: vi.fn(),
      update: vi.fn(),
      softDelete: vi.fn(),
      updateStatus: vi.fn(),
      upsertTiebreaker: vi.fn(),
      deleteTiebreaker: vi.fn(),
      countCategoriesForEvent: vi.fn().mockResolvedValue(1),
      countJudgesForEvent: vi.fn().mockResolvedValue(1),
      countParticipantsForEvent: vi.fn().mockResolvedValue(1),
      findPendingParticipants: vi.fn().mockResolvedValue([]),
      findCategoriesWithFewJudges: vi.fn().mockResolvedValue([]),
      categoryBelongsToEvent: vi.fn().mockResolvedValue(true),
    }

    auditService = { record: vi.fn() }
    const scoringGateway = { emitToEvent: vi.fn() }
    const publicLiveGateway = { emitToEvent: vi.fn() }
    const prisma = { $transaction: vi.fn(async (cb: any) => cb({ auditLog: { create: vi.fn() } })) }

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EventsService,
        { provide: EventsRepository, useValue: repository },
        { provide: AuditService, useValue: auditService },
        { provide: ScoringGateway, useValue: scoringGateway },
        { provide: PublicLiveGateway, useValue: publicLiveGateway },
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile()

    service = module.get<EventsService>(EventsService)
  })

  describe('create', () => {
    it('cria evento com payload válido e chama audit EVENT_CREATED', async () => {
      repository.create.mockResolvedValue(makeEvent())
      const res = await service.create(
        {
          name: 'Evento',
          eventDate: new Date(),
          location: 'SP',
          organizer: 'Org',
          calculationRule: CalculationRule.R1,
          scoreMin: 0,
          scoreMax: 10,
          topN: 5,
        },
        'manager-1',
      )
      expect(res.id).toBe('event-1')
      expect(auditService.record).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'EVENT_CREATED' }),
        expect.anything(),
      )
    })

    it('lança BadRequestException quando scoreMin >= scoreMax', async () => {
      await expect(
        service.create(
          {
            name: 'Evento',
            eventDate: new Date(),
            location: 'SP',
            organizer: 'Org',
            calculationRule: CalculationRule.R1,
            scoreMin: 10,
            scoreMax: 10,
            topN: 5,
          },
          'manager-1',
        ),
      ).rejects.toThrow(BadRequestException)
    })
  })

  describe('findById', () => {
    it('retorna evento quando gestor é o dono', async () => {
      repository.findById.mockResolvedValue(makeEvent())
      const res = await service.findById('event-1', 'manager-1')
      expect(res.id).toBe('event-1')
    })

    it('lança NotFoundException quando evento não encontrado (gestor diferente retorna 404)', async () => {
      repository.findById.mockResolvedValue(null)
      await expect(service.findById('event-1', 'outro-gestor')).rejects.toThrow(NotFoundException)
    })
  })

  describe('update', () => {
    it('atualiza nome com evento IN_PROGRESS: ok', async () => {
      repository.findById.mockResolvedValue(makeEvent({ status: EventStatus.IN_PROGRESS }))
      repository.update.mockResolvedValue(makeEvent({ status: EventStatus.IN_PROGRESS, name: 'Novo Nome' }))
      const res = await service.update('event-1', { name: 'Novo Nome' }, 'manager-1')
      expect(res.name).toBe('Novo Nome')
    })

    it('lança BadRequestException ao mudar calculationRule com evento IN_PROGRESS', async () => {
      repository.findById.mockResolvedValue(makeEvent({ status: EventStatus.IN_PROGRESS }))
      await expect(
        service.update('event-1', { calculationRule: CalculationRule.R2 }, 'manager-1'),
      ).rejects.toThrow(BadRequestException)
    })

    it('lança BadRequestException para qualquer mudança com evento FINISHED', async () => {
      repository.findById.mockResolvedValue(makeEvent({ status: EventStatus.FINISHED }))
      await expect(
        service.update('event-1', { name: 'Novo' }, 'manager-1'),
      ).rejects.toThrow(BadRequestException)
    })
  })

  describe('softDelete', () => {
    it('soft delete em status DRAFT: ok', async () => {
      repository.findById.mockResolvedValue(makeEvent({ status: EventStatus.DRAFT }))
      await service.softDelete('event-1', 'manager-1')
      expect(repository.softDelete).toHaveBeenCalled()
      expect(auditService.record).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'EVENT_DELETED' }),
        expect.anything(),
      )
    })

    it('soft delete em status FINISHED: ok (preserva histórico)', async () => {
      repository.findById.mockResolvedValue(makeEvent({ status: EventStatus.FINISHED }))
      await service.softDelete('event-1', 'manager-1')
      expect(repository.softDelete).toHaveBeenCalled()
    })

    it('soft delete em status IN_PROGRESS: lança BadRequestException', async () => {
      repository.findById.mockResolvedValue(makeEvent({ status: EventStatus.IN_PROGRESS }))
      await expect(service.softDelete('event-1', 'manager-1')).rejects.toThrow(BadRequestException)
    })
  })

  describe('transition', () => {
    it('transição válida atualiza status e chama audit EVENT_STATUS_CHANGED', async () => {
      repository.findById.mockResolvedValue(makeEvent({ status: EventStatus.DRAFT, _count: { categories: 1, judges: 1, participants: 1 } }))
      repository.countCategoriesForEvent.mockResolvedValue(1)
      repository.countJudgesForEvent.mockResolvedValue(1)
      repository.countParticipantsForEvent.mockResolvedValue(1)
      repository.updateStatus.mockResolvedValue(makeEvent({ status: EventStatus.REGISTERING }))
      const res = await service.transition(
        'event-1',
        { targetStatus: EventStatus.REGISTERING },
        'manager-1',
      )
      expect(res.status).toBe(EventStatus.REGISTERING)
      expect(auditService.record).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'EVENT_STATUS_CHANGED' }),
        expect.anything(),
      )
    })

    it('transição inválida lança UnprocessableEntityException com código INVALID_TRANSITION', async () => {
      repository.findById.mockResolvedValue(makeEvent({ status: EventStatus.DRAFT }))
      await expect(
        service.transition('event-1', { targetStatus: EventStatus.FINISHED }, 'manager-1'),
      ).rejects.toThrow(UnprocessableEntityException)
    })

    it('DRAFT → REGISTERING sem categorias: lança UnprocessableEntityException com NO_CATEGORIES', async () => {
      repository.findById.mockResolvedValue(makeEvent({ status: EventStatus.DRAFT }))
      repository.countCategoriesForEvent.mockResolvedValue(0)
      repository.countJudgesForEvent.mockResolvedValue(1)
      repository.countParticipantsForEvent.mockResolvedValue(1)
      await expect(
        service.transition('event-1', { targetStatus: EventStatus.REGISTERING }, 'manager-1'),
      ).rejects.toThrow(UnprocessableEntityException)
    })
  })

  describe('updateTiebreaker', () => {
    it('lança BadRequestException se secondCategoryId sem firstCategoryId', async () => {
      repository.findById.mockResolvedValue(makeEvent())
      await expect(
        service.updateTiebreaker('event-1', { secondCategoryId: 'cat-2' }, 'manager-1'),
      ).rejects.toThrow(BadRequestException)
    })

    it('lança BadRequestException se firstCategoryId === secondCategoryId', async () => {
      repository.findById.mockResolvedValue(makeEvent())
      await expect(
        service.updateTiebreaker(
          'event-1',
          { firstCategoryId: 'cat-1', secondCategoryId: 'cat-1' },
          'manager-1',
        ),
      ).rejects.toThrow(BadRequestException)
    })

    it('lança BadRequestException se categoria não pertence ao evento', async () => {
      repository.findById.mockResolvedValue(makeEvent())
      repository.categoryBelongsToEvent.mockResolvedValue(false)
      await expect(
        service.updateTiebreaker('event-1', { firstCategoryId: 'cat-outra' }, 'manager-1'),
      ).rejects.toThrow(BadRequestException)
    })

    it('atualiza tiebreaker com dados válidos e chama audit', async () => {
      repository.findById.mockResolvedValue(makeEvent())
      repository.upsertTiebreaker.mockResolvedValue({})
      repository.findById.mockResolvedValueOnce(makeEvent())
        .mockResolvedValueOnce(makeEvent({ tiebreakerConfig: { id: 't-1', eventId: 'event-1', firstCategoryId: 'cat-1', secondCategoryId: null } }))
      const res = await service.updateTiebreaker(
        'event-1',
        { firstCategoryId: 'cat-1' },
        'manager-1',
      )
      expect(auditService.record).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'EVENT_TIEBREAKER_UPDATED' }),
        expect.anything(),
      )
      expect(res).toBeDefined()
    })
  })
})
