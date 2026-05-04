import { Test, TestingModule } from '@nestjs/testing'
import { UsersRepository } from '../users.repository'
import { PrismaService } from '../../../config/prisma.service'

describe('UsersRepository', () => {
  let repository: UsersRepository
  let prisma: any

  beforeEach(async () => {
    prisma = {
      user: {
        create: vi.fn(),
        findFirst: vi.fn(),
        findMany: vi.fn(),
        count: vi.fn(),
        update: vi.fn(),
      },
    }

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersRepository,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile()

    repository = module.get<UsersRepository>(UsersRepository)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('should findById and bypass soft delete', async () => {
    prisma.user.findFirst.mockResolvedValue({ id: '1' })
    await repository.findById('1', { includeDeleted: true })
    expect(prisma.user.findFirst).toHaveBeenCalledWith({
      where: { id: '1', deletedAt: undefined },
    })
  })

  it('should findById without bypass', async () => {
    prisma.user.findFirst.mockResolvedValue({ id: '1' })
    await repository.findById('1')
    expect(prisma.user.findFirst).toHaveBeenCalledWith({
      where: { id: '1' },
    })
  })

  it('should findByEmail and bypass soft delete', async () => {
    prisma.user.findFirst.mockResolvedValue({ id: '1' })
    await repository.findByEmail('test@test.com', { includeDeleted: true })
    expect(prisma.user.findFirst).toHaveBeenCalledWith({
      where: { email: 'test@test.com', deletedAt: undefined },
    })
  })

  it('should findByEmail without bypass', async () => {
    prisma.user.findFirst.mockResolvedValue({ id: '1' })
    await repository.findByEmail('test@test.com')
    expect(prisma.user.findFirst).toHaveBeenCalledWith({
      where: { email: 'test@test.com' },
    })
  })

  it('should list users with filters', async () => {
    prisma.user.findMany.mockResolvedValue([])
    prisma.user.count.mockResolvedValue(0)
    await repository.list({ page: 2, pageSize: 10, search: 'test', role: 'GESTOR', isActive: true, includeDeleted: true })
    expect(prisma.user.findMany).toHaveBeenCalledWith({
      where: {
        OR: [
          { name: { contains: 'test', mode: 'insensitive' } },
          { email: { contains: 'test', mode: 'insensitive' } },
        ],
        role: 'GESTOR',
        isActive: true,
        deletedAt: undefined,
      },
      skip: 10,
      take: 10,
      orderBy: { createdAt: 'desc' },
    })
  })

  it('should normalize string isActive=true to boolean', async () => {
    prisma.user.findMany.mockResolvedValue([])
    prisma.user.count.mockResolvedValue(0)
    await repository.list({ isActive: 'true' as unknown as boolean })
    expect(prisma.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { isActive: true },
      }),
    )
  })

  it('should normalize string isActive=false to boolean', async () => {
    prisma.user.findMany.mockResolvedValue([])
    prisma.user.count.mockResolvedValue(0)
    await repository.list({ isActive: 'false' as unknown as boolean })
    expect(prisma.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { isActive: false },
      }),
    )
  })

  it('should list users with default filters', async () => {
    prisma.user.findMany.mockResolvedValue([])
    prisma.user.count.mockResolvedValue(0)
    await repository.list({})
    expect(prisma.user.findMany).toHaveBeenCalledWith({
      where: {},
      skip: 0,
      take: 20,
      orderBy: { createdAt: 'desc' },
    })
  })

  it('should create user', async () => {
    prisma.user.create.mockResolvedValue({ id: '1' })
    await repository.create({ email: 't', name: 't', passwordHash: 'p', role: 'GESTOR' })
    expect(prisma.user.create).toHaveBeenCalled()
  })

  it('should update user', async () => {
    prisma.user.update.mockResolvedValue({ id: '1' })
    await repository.update('1', { name: 'n' })
    expect(prisma.user.update).toHaveBeenCalled()
  })

  it('should soft delete user', async () => {
    prisma.user.update.mockResolvedValue({ id: '1' })
    await repository.softDelete('1')
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: '1' },
      data: { deletedAt: expect.any(Date) },
    })
  })

  it('should restore user', async () => {
    prisma.user.update.mockResolvedValue({ id: '1' })
    await repository.restore('1')
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: '1' },
      data: { deletedAt: null },
    })
  })

  it('should count active gestores', async () => {
    prisma.user.count.mockResolvedValue(1)
    await repository.countActiveGestores()
    expect(prisma.user.count).toHaveBeenCalledWith({
      where: { role: 'GESTOR', isActive: true },
    })
  })
})
