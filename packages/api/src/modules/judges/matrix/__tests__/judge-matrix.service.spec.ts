import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NotFoundException } from '@nestjs/common'
import { Test, TestingModule } from '@nestjs/testing'
import { CalculationRule, EventStatus } from '@prisma/client'
import { JudgeMatrixService } from '../judge-matrix.service'
import { JudgesRepository } from '../../judges.repository'
import { EventsRepository } from '../../../events/events.repository'
import { CategoriesRepository } from '../../../categories/categories.repository'
import { AuditService } from '../../../audit/audit.service'

const makeEvent = (overrides: Record<string, unknown> = {}) => ({
  id: 'event-1',
  name: 'Festival 2026',
  managerId: 'manager-1',
  status: EventStatus.DRAFT,
  calculationRule: CalculationRule.R1,
  ...overrides,
})

const makeJudge = (overrides: Record<string, unknown> = {}) => ({
  id: 'judge-1',
  userId: 'user-1',
  eventId: 'event-1',
  displayName: 'Jurado 1',
  user: { id: 'user-1', email: 'j1@test.com', name: 'Jurado 1' },
  judgeCategories: [],
  ...overrides,
})

const makeCategory = (overrides: Record<string, unknown> = {}) => ({
  id: 'cat-1',
  name: 'Técnica',
  displayOrder: 1,
  eventId: 'event-1',
  _count: { judgeCategories: 0, scores: 0 },
  ...overrides,
})

describe('JudgeMatrixService', () => {
  let service: JudgeMatrixService
   
  let judgesRepository: any
   
  let eventsRepository: any
   
  let categoriesRepository: any
   
  let auditService: any

  beforeEach(async () => {
    judgesRepository = {
      findByEventId: vi.fn().mockResolvedValue([]),
      findJudgeCategoriesByEventId: vi.fn().mockResolvedValue([]),
      countScoresForCell: vi.fn().mockResolvedValue(0),
      replaceJudgeCategoriesAtomically: vi.fn().mockResolvedValue(undefined),
    }

    eventsRepository = {
      findById: vi.fn(),
    }

    categoriesRepository = {
      findByEventId: vi.fn().mockResolvedValue([]),
    }

    auditService = { record: vi.fn() }

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JudgeMatrixService,
        { provide: JudgesRepository, useValue: judgesRepository },
        { provide: EventsRepository, useValue: eventsRepository },
        { provide: CategoriesRepository, useValue: categoriesRepository },
        { provide: AuditService, useValue: auditService },
      ],
    }).compile()

    service = module.get<JudgeMatrixService>(JudgeMatrixService)
  })

  describe('getMatrix', () => {
    it('retorna estrutura completa com totals corretos', async () => {
      const judge = makeJudge()
      const category = makeCategory()
      eventsRepository.findById.mockResolvedValue(makeEvent())
      judgesRepository.findByEventId.mockResolvedValue([judge])
      categoriesRepository.findByEventId.mockResolvedValue([category])
      judgesRepository.findJudgeCategoriesByEventId.mockResolvedValue([
        { judgeId: 'judge-1', categoryId: 'cat-1' },
      ])

      const result = await service.getMatrix('event-1', 'manager-1')

      expect(result.event.id).toBe('event-1')
      expect(result.judges).toHaveLength(1)
      expect(result.categories).toHaveLength(1)
      expect(result.cells).toHaveLength(1)
      expect(result.totals.byCategoryId['cat-1']).toBe(1)
      expect(result.totals.byJudgeId['judge-1']).toBe(1)
      expect(result.validation).toBeDefined()
    })

    it('lança NotFoundException para evento não encontrado', async () => {
      eventsRepository.findById.mockResolvedValue(null)

      await expect(
        service.getMatrix('event-1', 'manager-1'),
      ).rejects.toThrow(NotFoundException)
    })
  })

  describe('updateMatrix', () => {
    it('adiciona cells novos e persiste atomicamente', async () => {
      eventsRepository.findById.mockResolvedValue(makeEvent())
      judgesRepository.findByEventId.mockResolvedValue([makeJudge()])
      categoriesRepository.findByEventId.mockResolvedValue([makeCategory()])
      judgesRepository.findJudgeCategoriesByEventId
        .mockResolvedValueOnce([]) // células atuais = vazias
        .mockResolvedValueOnce([{ judgeId: 'judge-1', categoryId: 'cat-1' }]) // após update (getMatrix)

      const dto = { cells: [{ judgeId: 'judge-1', categoryId: 'cat-1' }] }
      await service.updateMatrix('event-1', dto, 'manager-1')

      expect(judgesRepository.replaceJudgeCategoriesAtomically).toHaveBeenCalled()
      expect(auditService.record).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'JUDGE_MATRIX_UPDATED' }),
      )
    })

    it('remove cells ausentes do payload', async () => {
      eventsRepository.findById.mockResolvedValue(makeEvent())
      judgesRepository.findByEventId.mockResolvedValue([makeJudge()])
      categoriesRepository.findByEventId.mockResolvedValue([makeCategory()])
      // Célula atual existente que será removida
      judgesRepository.findJudgeCategoriesByEventId
        .mockResolvedValueOnce([{ judgeId: 'judge-1', categoryId: 'cat-1' }])
        .mockResolvedValueOnce([]) // após update

      const dto = { cells: [] } // payload vazio = remover tudo
      await service.updateMatrix('event-1', dto, 'manager-1')

      expect(judgesRepository.replaceJudgeCategoriesAtomically).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        expect.arrayContaining([{ judgeId: 'judge-1', categoryId: 'cat-1' }]),
        expect.any(Array),
      )
    })

    it('bloqueia updateMatrix em evento IN_PROGRESS → EVENT_IN_PROGRESS_LOCK', async () => {
      eventsRepository.findById.mockResolvedValue(makeEvent({ status: EventStatus.IN_PROGRESS }))

      await expect(
        service.updateMatrix('event-1', { cells: [] }, 'manager-1'),
      ).rejects.toSatisfy((e: unknown) => (e as { response?: { code?: string } })?.response?.code === 'EVENT_IN_PROGRESS_LOCK')
    })

    it('bloqueia remoção de cell com scores → CELL_HAS_SCORES', async () => {
      eventsRepository.findById.mockResolvedValue(makeEvent())
      judgesRepository.findByEventId.mockResolvedValue([makeJudge()])
      categoriesRepository.findByEventId.mockResolvedValue([makeCategory()])
      // Célula atual que seria removida
      judgesRepository.findJudgeCategoriesByEventId.mockResolvedValue([
        { judgeId: 'judge-1', categoryId: 'cat-1' },
      ])
      // Célula tem scores
      judgesRepository.countScoresForCell.mockResolvedValue(3)

      const dto = { cells: [] } // payload vazio → tentativa de remover
      await expect(
        service.updateMatrix('event-1', dto, 'manager-1'),
      ).rejects.toSatisfy((e: unknown) => (e as { response?: { code?: string } })?.response?.code === 'CELL_HAS_SCORES')
    })

    it('rejeita payload com judgeId de outro evento → JUDGE_NOT_IN_EVENT', async () => {
      eventsRepository.findById.mockResolvedValue(makeEvent())
      judgesRepository.findByEventId.mockResolvedValue([makeJudge()]) // apenas judge-1
      categoriesRepository.findByEventId.mockResolvedValue([makeCategory()])
      judgesRepository.findJudgeCategoriesByEventId.mockResolvedValue([])

      const dto = { cells: [{ judgeId: 'judge-de-outro-evento', categoryId: 'cat-1' }] }
      await expect(
        service.updateMatrix('event-1', dto, 'manager-1'),
      ).rejects.toSatisfy((e: unknown) => (e as { response?: { code?: string } })?.response?.code === 'JUDGE_NOT_IN_EVENT')
    })

    it('rejeita payload com cells duplicadas → DUPLICATE_MATRIX_CELLS', async () => {
      eventsRepository.findById.mockResolvedValue(makeEvent())
      judgesRepository.findByEventId.mockResolvedValue([makeJudge()])
      categoriesRepository.findByEventId.mockResolvedValue([makeCategory()])
      judgesRepository.findJudgeCategoriesByEventId.mockResolvedValue([])

      const dto = {
        cells: [
          { judgeId: 'judge-1', categoryId: 'cat-1' },
          { judgeId: 'judge-1', categoryId: 'cat-1' }, // duplicata
        ],
      }
      await expect(
        service.updateMatrix('event-1', dto, 'manager-1'),
      ).rejects.toSatisfy((e: unknown) => (e as { response?: { code?: string } })?.response?.code === 'DUPLICATE_MATRIX_CELLS')
    })
  })

  describe('validateMatrix', () => {
    it('retorna report sem persistir', async () => {
      eventsRepository.findById.mockResolvedValue(
        makeEvent({ calculationRule: CalculationRule.R2 }),
      )
      judgesRepository.findByEventId.mockResolvedValue([])
      categoriesRepository.findByEventId.mockResolvedValue([])

      const dto = { cells: [] }
      const report = await service.validateMatrix('event-1', dto, 'manager-1')

      expect(report.isValid).toBe(false)
      expect(judgesRepository.replaceJudgeCategoriesAtomically).not.toHaveBeenCalled()
    })
  })
})
