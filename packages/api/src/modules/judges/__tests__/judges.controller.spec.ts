import { describe, it, expect, beforeEach, vi } from 'vitest'
import { Test, TestingModule } from '@nestjs/testing'
import { JudgesController } from '../judges.controller'
import { JudgesService } from '../judges.service'

const makeJudgeResponse = (overrides: Record<string, unknown> = {}) => ({
  id: 'judge-1',
  userId: 'user-1',
  displayName: 'Jurado 1',
  user: { id: 'user-1', email: 'j1@test.com', name: 'Jurado 1' },
  categories: [],
  ...overrides,
})

const mockUser = { sub: 'manager-1', role: 'GESTOR', email: 'g@test.com' }

describe('JudgesController', () => {
  let controller: JudgesController
  let service: Record<string, ReturnType<typeof vi.fn>>

  beforeEach(async () => {
    service = {
      add: vi.fn().mockResolvedValue(makeJudgeResponse()),
      list: vi.fn().mockResolvedValue([makeJudgeResponse()]),
      findById: vi.fn().mockResolvedValue(makeJudgeResponse()),
      update: vi.fn().mockResolvedValue(makeJudgeResponse()),
      remove: vi.fn().mockResolvedValue(undefined),
    }

    const module: TestingModule = await Test.createTestingModule({
      controllers: [JudgesController],
      providers: [{ provide: JudgesService, useValue: service }],
    }).compile()

    controller = module.get<JudgesController>(JudgesController)
  })

  it('POST /judges → chama service.add', async () => {
    const dto = { userId: 'user-1' }
    const result = await controller.add('event-1', dto, mockUser as never)
    expect(service.add).toHaveBeenCalledWith('event-1', dto, 'manager-1')
    expect(result.id).toBe('judge-1')
  })

  it('GET /judges → chama service.list', async () => {
    const result = await controller.list('event-1', mockUser as never)
    expect(service.list).toHaveBeenCalledWith('event-1', 'manager-1')
    expect(result).toHaveLength(1)
  })

  it('GET /judges/:id → chama service.findById', async () => {
    const result = await controller.findOne('event-1', 'judge-1', mockUser as never)
    expect(service.findById).toHaveBeenCalledWith('judge-1', 'event-1', 'manager-1')
    expect(result.id).toBe('judge-1')
  })

  it('PATCH /judges/:id → chama service.update', async () => {
    const dto = { displayName: 'Novo Nome' }
    const result = await controller.update('event-1', 'judge-1', dto, mockUser as never)
    expect(service.update).toHaveBeenCalledWith('judge-1', 'event-1', dto, 'manager-1')
    expect(result).toBeDefined()
  })

  it('DELETE /judges/:id → chama service.remove', async () => {
    await controller.remove('event-1', 'judge-1', mockUser as never)
    expect(service.remove).toHaveBeenCalledWith('judge-1', 'event-1', 'manager-1')
  })
})
