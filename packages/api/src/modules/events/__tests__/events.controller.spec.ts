import { Test, TestingModule } from '@nestjs/testing'
import { EventsController } from '../events.controller'
import { EventsService } from '../events.service'
import { EventStatus, CalculationRule } from '@prisma/client'

const mockEvent = {
  id: 'event-1',
  name: 'Evento Teste',
  status: EventStatus.DRAFT,
  calculationRule: CalculationRule.R1,
  scoreMin: 0,
  scoreMax: 10,
  topN: 10,
  counts: { categories: 0, judges: 0, participants: 0 },
  tiebreaker: null,
}

describe('EventsController', () => {
  let controller: EventsController
  let service: any

  beforeEach(async () => {
    service = {
      create: vi.fn().mockResolvedValue(mockEvent),
      list: vi.fn().mockResolvedValue({ data: [mockEvent], meta: { page: 1, pageSize: 20, total: 1, totalPages: 1 } }),
      findById: vi.fn().mockResolvedValue(mockEvent),
      update: vi.fn().mockResolvedValue(mockEvent),
      softDelete: vi.fn().mockResolvedValue(undefined),
      transition: vi.fn().mockResolvedValue({ ...mockEvent, status: EventStatus.REGISTERING }),
      updateTiebreaker: vi.fn().mockResolvedValue(mockEvent),
      removeTiebreaker: vi.fn().mockResolvedValue(undefined),
      updateCertificateText: vi.fn().mockResolvedValue(mockEvent),
    }

    const module: TestingModule = await Test.createTestingModule({
      controllers: [EventsController],
      providers: [{ provide: EventsService, useValue: service }],
    }).compile()

    controller = module.get<EventsController>(EventsController)
  })

  it('create: chama service.create com managerId do usuário logado', async () => {
    const res = await controller.create({} as never, { sub: 'manager-1' } as never)
    expect(res.id).toBe('event-1')
    expect(service.create).toHaveBeenCalledWith(expect.anything(), 'manager-1')
  })

  it('list: retorna lista paginada', async () => {
    const res = await controller.list({}, { sub: 'manager-1' } as never)
    expect(res.data).toHaveLength(1)
    expect(service.list).toHaveBeenCalledWith(expect.anything(), 'manager-1')
  })

  it('findOne: chama service.findById com id e managerId', async () => {
    const res = await controller.findOne('event-1', { sub: 'manager-1' } as never)
    expect(res.id).toBe('event-1')
    expect(service.findById).toHaveBeenCalledWith('event-1', 'manager-1')
  })

  it('update: chama service.update', async () => {
    const res = await controller.update('event-1', {}, { sub: 'manager-1' } as never)
    expect(res).toBeDefined()
    expect(service.update).toHaveBeenCalledWith('event-1', {}, 'manager-1')
  })

  it('remove: chama service.softDelete', async () => {
    await controller.remove('event-1', { sub: 'manager-1' } as never)
    expect(service.softDelete).toHaveBeenCalledWith('event-1', 'manager-1')
  })

  it('transition: chama service.transition e retorna novo status', async () => {
    const res = await controller.transition(
      'event-1',
      { targetStatus: EventStatus.REGISTERING },
      { sub: 'manager-1' } as never,
    )
    expect(res.status).toBe(EventStatus.REGISTERING)
    expect(service.transition).toHaveBeenCalled()
  })

  it('updateTiebreaker: chama service.updateTiebreaker', async () => {
    await controller.updateTiebreaker(
      'event-1',
      { firstCategoryId: 'cat-1' },
      { sub: 'manager-1' } as never,
    )
    expect(service.updateTiebreaker).toHaveBeenCalledWith('event-1', { firstCategoryId: 'cat-1' }, 'manager-1')
  })

  it('removeTiebreaker: chama service.removeTiebreaker', async () => {
    await controller.removeTiebreaker('event-1', { sub: 'manager-1' } as never)
    expect(service.removeTiebreaker).toHaveBeenCalledWith('event-1', 'manager-1')
  })

  it('updateCertificateText: chama service.updateCertificateText', async () => {
    await controller.updateCertificateText(
      'event-1',
      { text: 'Certificamos que {{participante}} participou.' },
      { sub: 'manager-1' } as never,
    )
    expect(service.updateCertificateText).toHaveBeenCalledWith(
      'event-1',
      'Certificamos que {{participante}} participou.',
      'manager-1',
    )
  })
})
