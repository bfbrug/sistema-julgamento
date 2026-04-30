import { Test, TestingModule } from '@nestjs/testing'
import { AuditService } from '../audit.service'
import { AuditRepository } from '../audit.repository'
import { PrismaService } from '../../../config/prisma.service'
import { Prisma } from '@prisma/client'
describe('AuditService', () => {
  let service: AuditService
  let repository: Record<string, unknown>
  let prisma: Record<string, unknown>

  beforeEach(async () => {
    repository = {
      create: vi.fn(),
      findByEntity: vi.fn(),
      findByActor: vi.fn(),
      list: vi.fn(),
      findById: vi.fn(),
    }

    prisma = {}

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditService,
        { provide: AuditRepository, useValue: repository },
        { provide: PrismaService, useValue: prisma },
        { provide: 'PinoLogger:AuditService', useValue: { info: vi.fn(), debug: vi.fn(), warn: vi.fn(), error: vi.fn() } },
      ],
    }).compile()

    service = module.get<AuditService>(AuditService)
  })

  describe('record', () => {
    it('should persist audit log', async () => {
      repository.create.mockResolvedValue({ id: 'log-1', action: 'TEST' })

      const result = await service.record({
        action: 'TEST',
        entityType: 'User',
        entityId: 'user-1',
        actorId: 'actor-1',
        payload: { name: 'Test' },
      })

      expect(result.id).toBe('log-1')
      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'TEST', entityType: 'User' }),
        undefined,
      )
    })

    it('should pass transaction client when provided', async () => {
      repository.create.mockResolvedValue({ id: 'log-1' })
      const tx = { auditLog: { create: vi.fn() } } as unknown as Prisma.TransactionClient

      await service.record({ action: 'TEST', entityType: 'User', entityId: '1' }, tx)

      expect(repository.create).toHaveBeenCalledWith(expect.anything(), tx)
    })

    it('should sanitize password in payload', async () => {
      repository.create.mockResolvedValue({ id: 'log-1' })

      await service.record({
        action: 'USER_CREATED',
        entityType: 'User',
        entityId: 'user-1',
        payload: { email: 'test@test.com', password: 'secret123' },
      })

      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          payload: { email: 'test@test.com', password: '[REDACTED]' },
        }),
        undefined,
      )
    })

    it('should sanitize nested sensitive fields', async () => {
      repository.create.mockResolvedValue({ id: 'log-1' })

      await service.record({
        action: 'TEST',
        entityType: 'User',
        entityId: '1',
        payload: {
          user: { name: 'Test', passwordHash: 'hash' },
          tokens: { accessToken: 'at', refreshToken: 'rt' },
          config: { apiKey: 'key', secret: 'shh' },
        },
      })

      const callArg = repository.create.mock.calls[0][0]
      expect(callArg.payload.user.passwordHash).toBe('[REDACTED]')
      expect(callArg.payload.tokens).toBe('[REDACTED]')
      expect(callArg.payload.config.apiKey).toBe('[REDACTED]')
      expect(callArg.payload.config.secret).toBe('[REDACTED]')
      expect(callArg.payload.user.name).toBe('Test')
    })

    it('should sanitize array items', async () => {
      repository.create.mockResolvedValue({ id: 'log-1' })

      await service.record({
        action: 'TEST',
        entityType: 'User',
        entityId: '1',
        payload: [
          { name: 'A', password: 'p1' },
          { name: 'B', password: 'p2' },
        ],
      })

      const callArg = repository.create.mock.calls[0][0]
      expect(callArg.payload[0].password).toBe('[REDACTED]')
      expect(callArg.payload[1].password).toBe('[REDACTED]')
      expect(callArg.payload[0].name).toBe('A')
    })
  })

  describe('read methods', () => {
    it('findByEntity delegates to repository', async () => {
      repository.findByEntity.mockResolvedValue([{ id: 'log-1' }])
      const res = await service.findByEntity('User', 'user-1')
      expect(res).toHaveLength(1)
      expect(repository.findByEntity).toHaveBeenCalledWith('User', 'user-1', undefined, undefined)
    })

    it('findByActor delegates to repository', async () => {
      repository.findByActor.mockResolvedValue([{ id: 'log-1' }])
      const res = await service.findByActor('actor-1')
      expect(res).toHaveLength(1)
      expect(repository.findByActor).toHaveBeenCalledWith('actor-1', undefined, undefined)
    })

    it('list delegates to repository', async () => {
      repository.list.mockResolvedValue({ data: [{ id: 'log-1' }], nextCursor: null })
      const res = await service.list({ limit: 10 })
      expect(res.data).toHaveLength(1)
      expect(repository.list).toHaveBeenCalledWith({ limit: 10 }, undefined)
    })

    it('findById delegates to repository', async () => {
      repository.findById.mockResolvedValue({ id: 'log-1' })
      const res = await service.findById('log-1')
      expect(res).toBeDefined()
      expect(repository.findById).toHaveBeenCalledWith('log-1', undefined)
    })
  })

  describe('immutability', () => {
    it('should not expose update method', () => {
      expect((service as any).update).toBeUndefined()
    })

    it('should not expose delete method', () => {
      expect((service as any).delete).toBeUndefined()
    })

    it('should not expose remove method', () => {
      expect((service as any).remove).toBeUndefined()
    })
  })
})
