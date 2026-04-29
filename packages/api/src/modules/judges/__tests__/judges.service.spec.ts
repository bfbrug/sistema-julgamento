import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NotFoundException, ConflictException } from '@nestjs/common'
import { Test, TestingModule } from '@nestjs/testing'
import { EventStatus } from '@prisma/client'
import { JudgesService } from '../judges.service'
import { JudgesRepository } from '../judges.repository'
import { EventsRepository } from '../../events/events.repository'
import { UsersRepository } from '../../users/users.repository'
import { AuditService } from '../../audit/audit.service'

const makeEvent = (overrides: Record<string, unknown> = {}) => ({
  id: 'event-1',
  managerId: 'manager-1',
  status: EventStatus.DRAFT,
  ...overrides,
})

const makeUser = (overrides: Record<string, unknown> = {}) => ({
  id: 'user-1',
  name: 'Fulano',
  email: 'fulano@test.com',
  role: 'JURADO',
  ...overrides,
})

const makeJudge = (overrides: Record<string, unknown> = {}) => ({
  id: 'judge-1',
  userId: 'user-1',
  eventId: 'event-1',
  displayName: 'Fulano',
  user: { id: 'user-1', email: 'fulano@test.com', name: 'Fulano' },
  judgeCategories: [],
  ...overrides,
})

describe('JudgesService', () => {
  let service: JudgesService
   
  let repository: any
   
  let eventsRepository: any
   
  let usersRepository: any
   
  let auditService: any

  beforeEach(async () => {
    repository = {
      create: vi.fn(),
      createWithCategories: vi.fn(),
      findById: vi.fn(),
      findByEventId: vi.fn(),
      findByUserAndEvent: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      countScores: vi.fn().mockResolvedValue(0),
      countScoresForCell: vi.fn().mockResolvedValue(0),
      findJudgeCategoriesByEventId: vi.fn().mockResolvedValue([]),
      replaceJudgeCategoriesAtomically: vi.fn(),
    }

    eventsRepository = { findById: vi.fn() }
    usersRepository = { findById: vi.fn() }
    auditService = { record: vi.fn() }

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JudgesService,
        { provide: JudgesRepository, useValue: repository },
        { provide: EventsRepository, useValue: eventsRepository },
        { provide: UsersRepository, useValue: usersRepository },
        { provide: AuditService, useValue: auditService },
      ],
    }).compile()

    service = module.get<JudgesService>(JudgesService)
  })

  describe('add', () => {
    it('adiciona jurado em evento DRAFT com sucesso', async () => {
      eventsRepository.findById.mockResolvedValue(makeEvent())
      usersRepository.findById.mockResolvedValue(makeUser())
      repository.findByUserAndEvent.mockResolvedValue(null)
      repository.create.mockResolvedValue(makeJudge())
      repository.findById.mockResolvedValue(makeJudge())

      const result = await service.add('event-1', { userId: 'user-1' }, 'manager-1')

      expect(result.id).toBe('judge-1')
      expect(auditService.record).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'JUDGE_ADDED' }),
      )
    })

    it('adiciona jurado com categoryIds → chama createWithCategories', async () => {
      eventsRepository.findById.mockResolvedValue(makeEvent())
      usersRepository.findById.mockResolvedValue(makeUser())
      repository.findByUserAndEvent.mockResolvedValue(null)
      repository.createWithCategories.mockResolvedValue(makeJudge())

      await service.add(
        'event-1',
        { userId: 'user-1', categoryIds: ['cat-1', 'cat-2'] },
        'manager-1',
      )

      expect(repository.createWithCategories).toHaveBeenCalled()
    })

    it('bloqueia add em evento IN_PROGRESS → EVENT_IN_PROGRESS_LOCK', async () => {
      eventsRepository.findById.mockResolvedValue(makeEvent({ status: EventStatus.IN_PROGRESS }))

      await expect(
        service.add('event-1', { userId: 'user-1' }, 'manager-1'),
      ).rejects.toSatisfy((e: unknown) => (e as { response?: { code?: string } })?.response?.code === 'EVENT_IN_PROGRESS_LOCK')
    })

    it('bloqueia add em evento FINISHED → EVENT_FINISHED', async () => {
      eventsRepository.findById.mockResolvedValue(makeEvent({ status: EventStatus.FINISHED }))

      await expect(
        service.add('event-1', { userId: 'user-1' }, 'manager-1'),
      ).rejects.toSatisfy((e: unknown) => (e as { response?: { code?: string } })?.response?.code === 'EVENT_FINISHED')
    })

    it('RN-09.6 — user com role GESTOR → INVALID_USER_ROLE', async () => {
      eventsRepository.findById.mockResolvedValue(makeEvent())
      usersRepository.findById.mockResolvedValue(makeUser({ role: 'GESTOR' }))

      await expect(
        service.add('event-1', { userId: 'user-gestor' }, 'manager-1'),
      ).rejects.toSatisfy((e: unknown) => (e as { response?: { code?: string } })?.response?.code === 'INVALID_USER_ROLE')
    })

    it('RN-09.7 — jurado já existe no evento → 409 JUDGE_ALREADY_IN_EVENT', async () => {
      eventsRepository.findById.mockResolvedValue(makeEvent())
      usersRepository.findById.mockResolvedValue(makeUser())
      repository.findByUserAndEvent.mockResolvedValue(makeJudge())

      await expect(
        service.add('event-1', { userId: 'user-1' }, 'manager-1'),
      ).rejects.toBeInstanceOf(ConflictException)
    })

    it('lança NotFoundException para evento de outro gestor', async () => {
      eventsRepository.findById.mockResolvedValue(null)

      await expect(
        service.add('event-1', { userId: 'user-1' }, 'outro-manager'),
      ).rejects.toThrow(NotFoundException)
    })

    it('usa User.name como displayName quando não informado', async () => {
      eventsRepository.findById.mockResolvedValue(makeEvent())
      usersRepository.findById.mockResolvedValue(makeUser({ name: 'Carlos Silva' }))
      repository.findByUserAndEvent.mockResolvedValue(null)
      repository.create.mockResolvedValue(makeJudge({ displayName: 'Carlos Silva' }))
      repository.findById.mockResolvedValue(makeJudge({ displayName: 'Carlos Silva' }))

      const result = await service.add('event-1', { userId: 'user-1' }, 'manager-1')
      expect(result.displayName).toBe('Carlos Silva')
    })
  })

  describe('remove', () => {
    it('remove jurado em evento DRAFT com sucesso', async () => {
      eventsRepository.findById.mockResolvedValue(makeEvent())
      repository.findById.mockResolvedValue(makeJudge())
      repository.countScores.mockResolvedValue(0)
      repository.delete.mockResolvedValue(undefined)

      await service.remove('judge-1', 'event-1', 'manager-1')

      expect(repository.delete).toHaveBeenCalledWith('judge-1')
      expect(auditService.record).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'JUDGE_REMOVED' }),
      )
    })

    it('bloqueia remove em evento IN_PROGRESS → EVENT_IN_PROGRESS_LOCK', async () => {
      eventsRepository.findById.mockResolvedValue(makeEvent({ status: EventStatus.IN_PROGRESS }))

      await expect(
        service.remove('judge-1', 'event-1', 'manager-1'),
      ).rejects.toSatisfy((e: unknown) => (e as { response?: { code?: string } })?.response?.code === 'EVENT_IN_PROGRESS_LOCK')
    })

    it('bloqueia remove quando jurado tem scores → JUDGE_HAS_SCORES', async () => {
      eventsRepository.findById.mockResolvedValue(makeEvent())
      repository.findById.mockResolvedValue(makeJudge())
      repository.countScores.mockResolvedValue(5)

      await expect(
        service.remove('judge-1', 'event-1', 'manager-1'),
      ).rejects.toSatisfy((e: unknown) => (e as { response?: { code?: string } })?.response?.code === 'JUDGE_HAS_SCORES')
    })
  })

  describe('update', () => {
    it('atualiza displayName em evento IN_PROGRESS → permitido', async () => {
      eventsRepository.findById.mockResolvedValue(makeEvent({ status: EventStatus.IN_PROGRESS }))
      repository.findById
        .mockResolvedValueOnce(makeJudge())
        .mockResolvedValueOnce(makeJudge({ displayName: 'Novo Nome' }))
      repository.update.mockResolvedValue(makeJudge({ displayName: 'Novo Nome' }))

      const result = await service.update(
        'judge-1',
        'event-1',
        { displayName: 'Novo Nome' },
        'manager-1',
      )

      expect(result.displayName).toBe('Novo Nome')
      expect(auditService.record).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'JUDGE_UPDATED' }),
      )
    })

    it('atualiza displayName em evento FINISHED → permitido (cosmético)', async () => {
      eventsRepository.findById.mockResolvedValue(makeEvent({ status: EventStatus.FINISHED }))
      repository.findById
        .mockResolvedValueOnce(makeJudge())
        .mockResolvedValueOnce(makeJudge({ displayName: 'Novo Nome' }))
      repository.update.mockResolvedValue(makeJudge({ displayName: 'Novo Nome' }))

      const result = await service.update(
        'judge-1',
        'event-1',
        { displayName: 'Novo Nome' },
        'manager-1',
      )

      expect(result.displayName).toBe('Novo Nome')
    })
  })

  describe('list / findById', () => {
    it('lista jurados do evento', async () => {
      eventsRepository.findById.mockResolvedValue(makeEvent())
      repository.findByEventId.mockResolvedValue([makeJudge()])

      const result = await service.list('event-1', 'manager-1')
      expect(result).toHaveLength(1)
    })

    it('findById lança NotFoundException para jurado de outro evento', async () => {
      eventsRepository.findById.mockResolvedValue(makeEvent())
      repository.findById.mockResolvedValue(makeJudge({ eventId: 'outro-evento' }))

      await expect(
        service.findById('judge-1', 'event-1', 'manager-1'),
      ).rejects.toThrow(NotFoundException)
    })
  })
})
