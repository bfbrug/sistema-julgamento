import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NotFoundException } from '@nestjs/common'
import { Test, TestingModule } from '@nestjs/testing'
import { EventStatus } from '@prisma/client'
import { CategoriesService } from '../categories.service'
import { CategoriesRepository } from '../categories.repository'
import { EventsRepository } from '../../events/events.repository'
import { AuditService } from '../../audit/audit.service'
import { PrismaService } from '../../../config/prisma.service'

const makeEvent = (overrides: Record<string, unknown> = {}) => ({
  id: 'event-1',
  managerId: 'manager-1',
  status: EventStatus.DRAFT,
  ...overrides,
})

const makeCategory = (overrides: Record<string, unknown> = {}) => ({
  id: 'cat-1',
  eventId: 'event-1',
  name: 'Técnica Vocal',
  displayOrder: 1,
  _count: { judgeCategories: 0, scores: 0 },
  ...overrides,
})

describe('CategoriesService', () => {
  let service: CategoriesService
  let repository: any
  let eventsRepository: any
  let auditService: any

  beforeEach(async () => {
    repository = {
      create: vi.fn(),
      findById: vi.fn(),
      findByEventId: vi.fn(),
      findByEventIdAndName: vi.fn(),
      maxDisplayOrder: vi.fn().mockResolvedValue(0),
      update: vi.fn(),
      delete: vi.fn(),
      countScores: vi.fn().mockResolvedValue(0),
      countTiebreakerRefs: vi.fn().mockResolvedValue(0),
      reorderInTransaction: vi.fn(),
      shiftDisplayOrderUp: vi.fn(),
      compactDisplayOrder: vi.fn(),
    }

    eventsRepository = {
      findById: vi.fn(),
    }

    auditService = { record: vi.fn() }
    const prisma = { $transaction: vi.fn(async (cb: any) => cb({ auditLog: { create: vi.fn() } })) }

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CategoriesService,
        { provide: CategoriesRepository, useValue: repository },
        { provide: EventsRepository, useValue: eventsRepository },
        { provide: AuditService, useValue: auditService },
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile()

    service = module.get<CategoriesService>(CategoriesService)
  })

  describe('create', () => {
    it('cria categoria em evento DRAFT sem displayOrder → atribui MAX+1', async () => {
      eventsRepository.findById.mockResolvedValue(makeEvent())
      repository.findByEventIdAndName.mockResolvedValue(null)
      repository.maxDisplayOrder.mockResolvedValue(2)
      const created = { id: 'cat-new', eventId: 'event-1', name: 'Nova', displayOrder: 3 }
      repository.create.mockResolvedValue(created)
      repository.findById.mockResolvedValue({ ...created, _count: { judgeCategories: 0, scores: 0 } })

      const res = await service.create('event-1', { name: 'Nova' }, 'manager-1')

      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({ displayOrder: 3 }),
        expect.anything(),
      )
      expect(res.displayOrder).toBe(3)
    })

    it('cria com displayOrder fornecido → chama shiftDisplayOrderUp', async () => {
      eventsRepository.findById.mockResolvedValue(makeEvent())
      repository.findByEventIdAndName.mockResolvedValue(null)
      const created = { id: 'cat-new', eventId: 'event-1', name: 'Nova', displayOrder: 1 }
      repository.create.mockResolvedValue(created)
      repository.findById.mockResolvedValue({ ...created, _count: { judgeCategories: 0, scores: 0 } })

      await service.create('event-1', { name: 'Nova', displayOrder: 1 }, 'manager-1')

      expect(repository.shiftDisplayOrderUp).toHaveBeenCalledWith('event-1', 1, expect.anything())
    })

    it('lança AppException EVENT_IN_PROGRESS_LOCK em evento IN_PROGRESS', async () => {
      eventsRepository.findById.mockResolvedValue(makeEvent({ status: EventStatus.IN_PROGRESS }))

      await expect(
        service.create('event-1', { name: 'Nova' }, 'manager-1'),
      ).rejects.toSatisfy((e: any) => e?.response?.code === 'EVENT_IN_PROGRESS_LOCK')
    })

    it('lança AppException EVENT_FINISHED em evento FINISHED', async () => {
      eventsRepository.findById.mockResolvedValue(makeEvent({ status: EventStatus.FINISHED }))

      await expect(
        service.create('event-1', { name: 'Nova' }, 'manager-1'),
      ).rejects.toSatisfy((e: any) => e?.response?.code === 'EVENT_FINISHED')
    })

    it('lança AppException CATEGORY_NAME_CONFLICT com nome duplicado', async () => {
      eventsRepository.findById.mockResolvedValue(makeEvent())
      repository.findByEventIdAndName.mockResolvedValue(makeCategory())

      await expect(
        service.create('event-1', { name: 'Técnica Vocal' }, 'manager-1'),
      ).rejects.toSatisfy((e: any) => e?.response?.code === 'CATEGORY_NAME_CONFLICT')
    })

    it('lança NotFoundException para evento de outro gestor', async () => {
      eventsRepository.findById.mockResolvedValue(null)

      await expect(
        service.create('event-1', { name: 'Nova' }, 'outro-manager'),
      ).rejects.toThrow(NotFoundException)
    })

    it('registra auditoria CATEGORY_CREATED após criação', async () => {
      eventsRepository.findById.mockResolvedValue(makeEvent())
      repository.findByEventIdAndName.mockResolvedValue(null)
      repository.maxDisplayOrder.mockResolvedValue(0)
      const created = { id: 'cat-new', eventId: 'event-1', name: 'Nova', displayOrder: 1 }
      repository.create.mockResolvedValue(created)
      repository.findById.mockResolvedValue({ ...created, _count: { judgeCategories: 0, scores: 0 } })

      await service.create('event-1', { name: 'Nova' }, 'manager-1')

      expect(auditService.record).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'CATEGORY_CREATED' }),
        expect.anything(),
      )
    })
  })

  describe('list', () => {
    it('retorna categorias ordenadas por displayOrder', async () => {
      eventsRepository.findById.mockResolvedValue(makeEvent())
      repository.findByEventId.mockResolvedValue([
        makeCategory({ displayOrder: 1 }),
        makeCategory({ id: 'cat-2', name: 'Apresentação', displayOrder: 2 }),
      ])

      const result = await service.list('event-1', 'manager-1')

      expect(result).toHaveLength(2)
      expect(result[0]!.displayOrder).toBe(1)
      expect(result[1]!.displayOrder).toBe(2)
    })
  })

  describe('update', () => {
    it('atualiza nome com sucesso em evento DRAFT', async () => {
      eventsRepository.findById.mockResolvedValue(makeEvent())
      const original = makeCategory()
      repository.findById.mockResolvedValueOnce(original)
      repository.findByEventIdAndName.mockResolvedValue(null)
      const updatedRaw = { id: 'cat-1', eventId: 'event-1', name: 'Novo Nome', displayOrder: 1 }
      repository.update.mockResolvedValue(updatedRaw)
      repository.findById.mockResolvedValueOnce({ ...updatedRaw, _count: { judgeCategories: 0, scores: 0 } })

      const res = await service.update('cat-1', 'event-1', { name: 'Novo Nome' }, 'manager-1')

      expect(res.name).toBe('Novo Nome')
      expect(auditService.record).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'CATEGORY_UPDATED' }),
        expect.anything(),
      )
    })

    it('lança AppException EVENT_IN_PROGRESS_LOCK ao tentar atualizar em evento IN_PROGRESS', async () => {
      eventsRepository.findById.mockResolvedValue(makeEvent({ status: EventStatus.IN_PROGRESS }))

      await expect(
        service.update('cat-1', 'event-1', { name: 'X' }, 'manager-1'),
      ).rejects.toSatisfy((e: any) => e?.response?.code === 'EVENT_IN_PROGRESS_LOCK')
    })
  })

  describe('remove', () => {
    it('remove categoria sem scores e sem tiebreaker, recompacta displayOrder', async () => {
      eventsRepository.findById.mockResolvedValue(makeEvent())
      repository.findById.mockResolvedValue(makeCategory())
      repository.countScores.mockResolvedValue(0)
      repository.countTiebreakerRefs.mockResolvedValue(0)

      await service.remove('cat-1', 'event-1', 'manager-1')

      expect(repository.delete).toHaveBeenCalledWith('cat-1', expect.anything())
      expect(repository.compactDisplayOrder).toHaveBeenCalledWith('event-1', expect.anything())
      expect(auditService.record).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'CATEGORY_DELETED' }),
        expect.anything(),
      )
    })

    it('lança AppException CATEGORY_HAS_SCORES quando há scores', async () => {
      eventsRepository.findById.mockResolvedValue(makeEvent())
      repository.findById.mockResolvedValue(makeCategory())
      repository.countScores.mockResolvedValue(3)

      await expect(
        service.remove('cat-1', 'event-1', 'manager-1'),
      ).rejects.toSatisfy((e: any) => e?.response?.code === 'CATEGORY_HAS_SCORES')
    })

    it('lança AppException CATEGORY_REFERENCED_BY_TIEBREAKER quando referenciada', async () => {
      eventsRepository.findById.mockResolvedValue(makeEvent())
      repository.findById.mockResolvedValue(makeCategory())
      repository.countScores.mockResolvedValue(0)
      repository.countTiebreakerRefs.mockResolvedValue(1)

      await expect(
        service.remove('cat-1', 'event-1', 'manager-1'),
      ).rejects.toSatisfy((e: any) => e?.response?.code === 'CATEGORY_REFERENCED_BY_TIEBREAKER')
    })

    it('lança AppException EVENT_IN_PROGRESS_LOCK em evento IN_PROGRESS', async () => {
      eventsRepository.findById.mockResolvedValue(makeEvent({ status: EventStatus.IN_PROGRESS }))

      await expect(
        service.remove('cat-1', 'event-1', 'manager-1'),
      ).rejects.toSatisfy((e: any) => e?.response?.code === 'EVENT_IN_PROGRESS_LOCK')
    })
  })

  describe('reorder', () => {
    it('reordena com IDs válidos atomicamente e registra auditoria', async () => {
      eventsRepository.findById.mockResolvedValue(makeEvent())
      const cats = [
        makeCategory({ id: 'cat-1', displayOrder: 1 }),
        makeCategory({ id: 'cat-2', name: 'Apresentação', displayOrder: 2 }),
      ]
      repository.findByEventId
        .mockResolvedValueOnce(cats)  // validação dos IDs
        .mockResolvedValueOnce(cats)  // getEventOrThrow da list() interna
      eventsRepository.findById.mockResolvedValue(makeEvent())
      repository.reorderInTransaction.mockResolvedValue(undefined)
      repository.compactDisplayOrder.mockResolvedValue(undefined)

      const dto = { items: [{ id: 'cat-2', displayOrder: 1 }, { id: 'cat-1', displayOrder: 2 }] }
      await service.reorder('event-1', dto, 'manager-1')

      expect(repository.reorderInTransaction).toHaveBeenCalledWith(dto.items, expect.anything())
      expect(repository.compactDisplayOrder).toHaveBeenCalledWith('event-1', expect.anything())
      expect(auditService.record).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'CATEGORIES_REORDERED' }),
        expect.anything(),
      )
    })

    it('lança AppException CATEGORY_NOT_IN_EVENT para ID de outro evento', async () => {
      eventsRepository.findById.mockResolvedValue(makeEvent())
      repository.findByEventId.mockResolvedValue([
        makeCategory({ id: 'cat-1', displayOrder: 1 }),
      ])

      const dto = { items: [{ id: 'id-desconhecido', displayOrder: 1 }] }

      await expect(
        service.reorder('event-1', dto, 'manager-1'),
      ).rejects.toSatisfy((e: any) => e?.response?.code === 'CATEGORY_NOT_IN_EVENT')
    })
  })
})
