import { Test, TestingModule } from '@nestjs/testing'
import { AuditRepository } from '../audit.repository'
import { PrismaService } from '../../../config/prisma.service'

describe('AuditRepository', () => {
  let repository: AuditRepository
  let prisma: any

  beforeEach(async () => {
    prisma = {
      auditLog: {
        create: vi.fn(),
        findMany: vi.fn(),
        findUnique: vi.fn(),
        count: vi.fn(),
      },
    }

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditRepository,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile()

    repository = module.get<AuditRepository>(AuditRepository)
  })

  describe('create', () => {
    it('should create audit log with default prisma client', async () => {
      prisma.auditLog.create.mockResolvedValue({ id: 'log-1' })
      const res = await repository.create({ action: 'TEST' } as any)
      expect(prisma.auditLog.create).toHaveBeenCalledWith({ data: { action: 'TEST' } })
      expect(res.id).toBe('log-1')
    })

    it('should use transaction client when provided', async () => {
      const tx = { auditLog: { create: vi.fn().mockResolvedValue({ id: 'log-1' }) } } as any
      const res = await repository.create({ action: 'TEST' } as any, tx)
      expect(tx.auditLog.create).toHaveBeenCalled()
      expect(prisma.auditLog.create).not.toHaveBeenCalled()
      expect(res.id).toBe('log-1')
    })
  })

  describe('findByEntity', () => {
    it('should find logs by entity with defaults', async () => {
      prisma.auditLog.findMany.mockResolvedValue([{ id: 'log-1' }])
      const res = await repository.findByEntity('User', 'user-1')
      expect(prisma.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { entityType: 'User', entityId: 'user-1' },
          orderBy: { createdAt: 'desc' },
          take: 50,
        }),
      )
      expect(res).toHaveLength(1)
    })

    it('should support cursor and limit', async () => {
      prisma.auditLog.findMany.mockResolvedValue([{ id: 'log-2' }])
      await repository.findByEntity('User', 'user-1', { limit: 10, cursor: 'log-1' })
      expect(prisma.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 10,
          cursor: { id: 'log-1' },
          skip: 1,
        }),
      )
    })
  })

  describe('findByActor', () => {
    it('should find logs by actor', async () => {
      prisma.auditLog.findMany.mockResolvedValue([{ id: 'log-1' }])
      const res = await repository.findByActor('actor-1')
      expect(prisma.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { actorId: 'actor-1' } }),
      )
      expect(res).toHaveLength(1)
    })
  })

  describe('findById', () => {
    it('should find log by id with actor join', async () => {
      prisma.auditLog.findUnique.mockResolvedValue({ id: 'log-1', actor: { name: 'Admin' } })
      const res = await repository.findById('log-1')
      expect(prisma.auditLog.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'log-1' },
          include: { actor: { select: { name: true } } },
        }),
      )
      expect((res as any)?.actor?.name).toBe('Admin')
    })
  })

  describe('list', () => {
    it('should list with pagination', async () => {
      prisma.auditLog.findMany.mockResolvedValue(
        Array.from({ length: 51 }, (_, i) => ({ id: `log-${i}`, createdAt: new Date() })),
      )
      const res = await repository.list({ limit: 50 })
      expect(res.data).toHaveLength(50)
      expect(res.nextCursor).toBe('log-49')
      expect(prisma.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 51 }),
      )
    })

    it('should return null nextCursor when no more data', async () => {
      prisma.auditLog.findMany.mockResolvedValue([{ id: 'log-1' }])
      const res = await repository.list({ limit: 50 })
      expect(res.data).toHaveLength(1)
      expect(res.nextCursor).toBeNull()
    })

    it('should apply action filter', async () => {
      prisma.auditLog.findMany.mockResolvedValue([{ id: 'log-1' }])
      await repository.list({ action: 'LOGIN_SUCCESS' })
      expect(prisma.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ action: 'LOGIN_SUCCESS' }),
        }),
      )
    })

    it('should apply date range filter', async () => {
      prisma.auditLog.findMany.mockResolvedValue([{ id: 'log-1' }])
      await repository.list({ startDate: '2024-01-01', endDate: '2024-12-31' })
      expect(prisma.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            createdAt: {
              gte: new Date('2024-01-01'),
              lte: new Date('2024-12-31'),
            },
          }),
        }),
      )
    })

    it('should include actor name', async () => {
      prisma.auditLog.findMany.mockResolvedValue([{ id: 'log-1', actor: { name: 'Admin' } }])
      await repository.list({})
      expect(prisma.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          include: { actor: { select: { name: true } } },
        }),
      )
    })
  })
})
