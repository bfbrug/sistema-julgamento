import { describe, it, expect, beforeEach, vi } from 'vitest'
import { Test, TestingModule } from '@nestjs/testing'
import { CalculationRule, EventStatus } from '@prisma/client'
import { JudgeMatrixController } from '../judge-matrix.controller'
import { JudgeMatrixService } from '../judge-matrix.service'

const mockUser = { sub: 'manager-1', role: 'GESTOR', email: 'g@test.com' }

const makeMatrixResponse = () => ({
  event: { id: 'event-1', name: 'Festival', calculationRule: CalculationRule.R1 },
  judges: [],
  categories: [],
  cells: [],
  totals: { byCategoryId: {}, byJudgeId: {} },
  validation: { isValid: true, errors: [], warnings: [] },
})

const makeValidationReport = (status: EventStatus = EventStatus.DRAFT) => ({
  isValid: status === EventStatus.DRAFT,
  errors: [],
  warnings: [],
})

describe('JudgeMatrixController', () => {
  let controller: JudgeMatrixController
  let service: Record<string, ReturnType<typeof vi.fn>>

  beforeEach(async () => {
    service = {
      getMatrix: vi.fn().mockResolvedValue(makeMatrixResponse()),
      updateMatrix: vi.fn().mockResolvedValue(makeMatrixResponse()),
      validateMatrix: vi.fn().mockResolvedValue(makeValidationReport()),
    }

    const module: TestingModule = await Test.createTestingModule({
      controllers: [JudgeMatrixController],
      providers: [{ provide: JudgeMatrixService, useValue: service }],
    }).compile()

    controller = module.get<JudgeMatrixController>(JudgeMatrixController)
  })

  it('GET /judge-matrix → chama service.getMatrix', async () => {
    const result = await controller.getMatrix('event-1', mockUser as never)
    expect(service.getMatrix).toHaveBeenCalledWith('event-1', 'manager-1')
    expect(result.event.id).toBe('event-1')
  })

  it('PUT /judge-matrix → chama service.updateMatrix', async () => {
    const dto = { cells: [{ judgeId: 'j1', categoryId: 'cat-1' }] }
    const result = await controller.updateMatrix('event-1', dto, mockUser as never)
    expect(service.updateMatrix).toHaveBeenCalledWith('event-1', dto, 'manager-1')
    expect(result).toBeDefined()
  })

  it('POST /judge-matrix/validate → chama service.validateMatrix sem persistir', async () => {
    const dto = { cells: [] }
    const result = await controller.validateMatrix('event-1', dto, mockUser as never)
    expect(service.validateMatrix).toHaveBeenCalledWith('event-1', dto, 'manager-1')
    expect(result.isValid).toBe(true)
    expect(service.updateMatrix).not.toHaveBeenCalled()
  })
})
