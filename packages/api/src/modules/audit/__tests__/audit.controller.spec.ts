import { Test, TestingModule } from '@nestjs/testing'
import { AuditController } from '../audit.controller'
import { AuditService } from '../audit.service'

describe('AuditController', () => {
  let controller: AuditController
  let service: any

  beforeEach(async () => {
    service = {
      list: vi.fn().mockResolvedValue({ data: [], nextCursor: null }),
      findById: vi.fn().mockResolvedValue({ id: 'log-1', action: 'TEST' }),
    }

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuditController],
      providers: [{ provide: AuditService, useValue: service }],
    }).compile()

    controller = module.get<AuditController>(AuditController)
  })

  it('should be defined', () => {
    expect(controller).toBeDefined()
  })

  describe('list', () => {
    it('should return paginated audit logs', async () => {
      service.list.mockResolvedValue({
        data: [{ id: 'log-1', action: 'LOGIN_SUCCESS', actor: { name: 'Admin' } }],
        nextCursor: null,
      })

      const res = await controller.list({})

      expect(res.data).toHaveLength(1)
      expect(res.hasMore).toBe(false)
      expect(res.nextCursor).toBeNull()
      expect(service.list).toHaveBeenCalledWith(expect.objectContaining({ limit: 50 }))
    })

    it('should pass filters to service', async () => {
      await controller.list({
        action: 'LOGIN_FAILED',
        actorId: 'user-1',
        startDate: '2024-01-01',
        endDate: '2024-12-31',
        limit: 100,
      })

      expect(service.list).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'LOGIN_FAILED',
          actorId: 'user-1',
          startDate: '2024-01-01',
          endDate: '2024-12-31',
          limit: 100,
        }),
      )
    })

    it('should set hasMore when nextCursor exists', async () => {
      service.list.mockResolvedValue({
        data: [{ id: 'log-1' }],
        nextCursor: 'log-1',
      })

      const res = await controller.list({})
      expect(res.hasMore).toBe(true)
    })
  })

  describe('listByEvent', () => {
    it('should filter by eventId', async () => {
      await controller.listByEvent('event-1', {})
      expect(service.list).toHaveBeenCalledWith(
        expect.objectContaining({ entityId: 'event-1' }),
      )
    })
  })

  describe('listByActor', () => {
    it('should filter by actorId', async () => {
      await controller.listByActor('user-1', {})
      expect(service.list).toHaveBeenCalledWith(
        expect.objectContaining({ actorId: 'user-1' }),
      )
    })
  })

  describe('findOne', () => {
    it('should return audit log by id', async () => {
      const res = await controller.findOne('log-1')
      expect(res).toBeDefined()
      expect(service.findById).toHaveBeenCalledWith('log-1')
    })

    it('should throw NotFoundException when log not found', async () => {
      service.findById.mockResolvedValue(null)
      await expect(controller.findOne('missing')).rejects.toThrow('Registro de auditoria não encontrado')
    })
  })
})
