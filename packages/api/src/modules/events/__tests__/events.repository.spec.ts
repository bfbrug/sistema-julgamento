import { Test, TestingModule } from '@nestjs/testing'
import { EventsRepository } from '../events.repository'
import { PrismaService } from '../../../config/prisma.service'
import { EventStatus } from '@prisma/client'

const includeRelations = {
  tiebreakerConfig: true,
  _count: { select: { categories: true, judges: true, participants: true } },
}

describe('EventsRepository', () => {
  let repository: EventsRepository
  let prisma: any

  beforeEach(async () => {
    prisma = {
      judgingEvent: {
        create: vi.fn(),
        findFirst: vi.fn(),
        findMany: vi.fn(),
        count: vi.fn(),
        update: vi.fn(),
      },
      tiebreakerConfig: {
        upsert: vi.fn(),
        deleteMany: vi.fn(),
      },
      category: {
        count: vi.fn(),
        findMany: vi.fn(),
      },
      judge: {
        count: vi.fn(),
      },
      participant: {
        count: vi.fn(),
        findMany: vi.fn(),
      },
    }

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EventsRepository,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile()

    repository = module.get<EventsRepository>(EventsRepository)
  })

  it('create chama prisma.judgingEvent.create com include', async () => {
    const event = { id: 'e-1', managerId: 'm-1' }
    prisma.judgingEvent.create.mockResolvedValue(event)
    const res = await repository.create({ manager: { connect: { id: 'm-1' } } } as never)
    expect(prisma.judgingEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({ include: includeRelations }),
    )
    expect(res).toEqual(event)
  })

  it('findById busca por id e managerId com deletedAt null', async () => {
    prisma.judgingEvent.findFirst.mockResolvedValue(null)
    await repository.findById('e-1', 'm-1')
    expect(prisma.judgingEvent.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'e-1', managerId: 'm-1', deletedAt: null } }),
    )
  })

  it('list aplica filtro de managerId', async () => {
    prisma.judgingEvent.findMany.mockResolvedValue([])
    prisma.judgingEvent.count.mockResolvedValue(0)
    await repository.list({ page: 1, pageSize: 20 }, 'm-1')
    expect(prisma.judgingEvent.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ managerId: 'm-1' }) }),
    )
  })

  it('softDelete seta deletedAt', async () => {
    prisma.judgingEvent.update.mockResolvedValue({})
    await repository.softDelete('e-1')
    expect(prisma.judgingEvent.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ deletedAt: expect.any(Date) }) }),
    )
  })

  it('updateStatus atualiza status', async () => {
    prisma.judgingEvent.update.mockResolvedValue({ id: 'e-1', status: EventStatus.IN_PROGRESS })
    const res = await repository.updateStatus('e-1', EventStatus.IN_PROGRESS)
    expect(res.status).toBe(EventStatus.IN_PROGRESS)
  })

  it('categoryBelongsToEvent retorna true quando count > 0', async () => {
    prisma.category.count.mockResolvedValue(1)
    const res = await repository.categoryBelongsToEvent('cat-1', 'e-1')
    expect(res).toBe(true)
  })

  it('categoryBelongsToEvent retorna false quando count = 0', async () => {
    prisma.category.count.mockResolvedValue(0)
    const res = await repository.categoryBelongsToEvent('cat-outra', 'e-1')
    expect(res).toBe(false)
  })

  it('findPendingParticipants retorna ids de participantes pendentes', async () => {
    prisma.participant.findMany.mockResolvedValue([{ id: 'p-1' }, { id: 'p-2' }])
    const res = await repository.findPendingParticipants('e-1')
    expect(res).toEqual(['p-1', 'p-2'])
  })

  it('findCategoriesWithFewJudges filtra categorias com jurados abaixo do mínimo', async () => {
    prisma.category.findMany.mockResolvedValue([
      { id: 'cat-1', _count: { judgeCategories: 2 } },
      { id: 'cat-2', _count: { judgeCategories: 3 } },
    ])
    const res = await repository.findCategoriesWithFewJudges('e-1', 3)
    expect(res).toEqual(['cat-1'])
  })
})
