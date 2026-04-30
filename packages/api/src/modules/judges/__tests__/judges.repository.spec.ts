import { describe, it, expect, beforeEach, vi } from 'vitest'
import { Test, TestingModule } from '@nestjs/testing'
import { PrismaService } from '../../../config/prisma.service'
import { JudgesRepository } from '../judges.repository'

const mockPrisma = {
  judge: {
    create: vi.fn(),
    findUnique: vi.fn(),
    findUniqueOrThrow: vi.fn(),
    findMany: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  judgeCategory: {
    createMany: vi.fn(),
    findMany: vi.fn(),
    deleteMany: vi.fn(),
  },
  score: {
    count: vi.fn(),
  },
  $transaction: vi.fn(),
}

const makeJudge = (overrides: Record<string, unknown> = {}) => ({
  id: 'judge-1',
  userId: 'user-1',
  eventId: 'event-1',
  displayName: 'Jurado 1',
  createdAt: new Date(),
  ...overrides,
})

describe('JudgesRepository', () => {
  let repository: JudgesRepository

  beforeEach(async () => {
    vi.clearAllMocks()
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JudgesRepository,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile()

    repository = module.get<JudgesRepository>(JudgesRepository)
  })

  it('create → chama prisma.judge.create', async () => {
    const judge = makeJudge()
    mockPrisma.judge.create.mockResolvedValue(judge)

    const result = await repository.create({
      user: { connect: { id: 'user-1' } },
      displayName: 'Jurado 1',
      event: { connect: { id: 'event-1' } },
    })

    expect(result.id).toBe('judge-1')
    expect(mockPrisma.judge.create).toHaveBeenCalled()
  })

  it('findById → chama prisma.judge.findUnique com include', async () => {
    const judge = makeJudge()
    mockPrisma.judge.findUnique.mockResolvedValue({
      ...judge,
      user: { id: 'user-1', email: 'j@test.com', name: 'J' },
      judgeCategories: [],
    })

    const result = await repository.findById('judge-1')
    expect(result?.id).toBe('judge-1')
    expect(mockPrisma.judge.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'judge-1' } }),
    )
  })

  it('findByEventId → retorna lista ordenada', async () => {
    mockPrisma.judge.findMany.mockResolvedValue([
      { ...makeJudge(), user: { id: 'u1', email: 'j@test.com', name: 'J' }, judgeCategories: [] },
    ])

    const result = await repository.findByEventId('event-1')
    expect(result).toHaveLength(1)
    expect(mockPrisma.judge.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { eventId: 'event-1' } }),
    )
  })

  it('findByUserAndEvent → chama findUnique com unique compound key', async () => {
    mockPrisma.judge.findUnique.mockResolvedValue(makeJudge())

    const result = await repository.findByUserAndEvent('user-1', 'event-1')
    expect(result?.userId).toBe('user-1')
    expect(mockPrisma.judge.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId_eventId: { userId: 'user-1', eventId: 'event-1' } } }),
    )
  })

  it('update → chama prisma.judge.update', async () => {
    mockPrisma.judge.update.mockResolvedValue(makeJudge({ displayName: 'Novo' }))

    const result = await repository.update('judge-1', { displayName: 'Novo' })
    expect(result.displayName).toBe('Novo')
  })

  it('delete → chama prisma.judge.delete', async () => {
    mockPrisma.judge.delete.mockResolvedValue(makeJudge())

    await repository.delete('judge-1')
    expect(mockPrisma.judge.delete).toHaveBeenCalledWith({ where: { id: 'judge-1' } })
  })

  it('countScores → chama prisma.score.count com judgeId', async () => {
    mockPrisma.score.count.mockResolvedValue(3)

    const result = await repository.countScores('judge-1')
    expect(result).toBe(3)
    expect(mockPrisma.score.count).toHaveBeenCalledWith({ where: { judgeId: 'judge-1' } })
  })

  it('countScoresForCell → chama score.count com judgeId e categoryId', async () => {
    mockPrisma.score.count.mockResolvedValue(1)

    const result = await repository.countScoresForCell('judge-1', 'cat-1')
    expect(result).toBe(1)
    expect(mockPrisma.score.count).toHaveBeenCalledWith({
      where: { judgeId: 'judge-1', categoryId: 'cat-1' },
    })
  })

  it('findJudgeCategoriesByEventId → chama judgeCategory.findMany', async () => {
    mockPrisma.judgeCategory.findMany.mockResolvedValue([
      { id: 'jc-1', judgeId: 'judge-1', categoryId: 'cat-1' },
    ])

    const result = await repository.findJudgeCategoriesByEventId('event-1')
    expect(result).toHaveLength(1)
  })

  it('createWithCategories → cria juiz e vincula categorias', async () => {
    const judge = makeJudge()
    mockPrisma.judge.create.mockResolvedValue(judge)
    mockPrisma.judge.findUniqueOrThrow.mockResolvedValue({
      ...judge,
      user: { id: 'u1', email: 'j@t.com', name: 'J' },
      judgeCategories: [{ id: 'jc-1', categoryId: 'cat-1', category: { id: 'cat-1', name: 'C', displayOrder: 1 } }],
    })
    mockPrisma.judgeCategory.createMany.mockResolvedValue({ count: 1 })

    const result = await repository.createWithCategories(
      { user: { connect: { id: 'u1' } }, displayName: 'J', event: { connect: { id: 'event-1' } } },
      ['cat-1'],
    )

    expect(result.id).toBe('judge-1')
    expect(mockPrisma.judge.create).toHaveBeenCalled()
    expect(mockPrisma.judgeCategory.createMany).toHaveBeenCalled()
  })

  it('replaceJudgeCategoriesAtomically → executa delete e create', async () => {
    await repository.replaceJudgeCategoriesAtomically(
      'event-1',
      [{ judgeId: 'j1', categoryId: 'cat-2' }],
      [{ judgeId: 'j1', categoryId: 'cat-1' }],
      [{ judgeId: 'j1', categoryId: 'cat-2' }],
    )

    expect(mockPrisma.judgeCategory.deleteMany).toHaveBeenCalled()
    expect(mockPrisma.judgeCategory.createMany).toHaveBeenCalled()
  })

  it('replaceJudgeCategoriesAtomically sem remoções nem adições — não chama delete/create', async () => {
    await repository.replaceJudgeCategoriesAtomically('event-1', [], [], [])

    expect(mockPrisma.judgeCategory.deleteMany).not.toHaveBeenCalled()
    expect(mockPrisma.judgeCategory.createMany).not.toHaveBeenCalled()
  })
})
