import { Test, TestingModule } from '@nestjs/testing'
import { UsersController } from '../users.controller'
import { UsersService } from '../users.service'

describe('UsersController', () => {
  let controller: UsersController
  let service: any

  beforeEach(async () => {
    service = {
      create: vi.fn().mockResolvedValue({ id: '1' }),
      list: vi.fn().mockResolvedValue({ data: [{ id: '1' }], meta: { page: 1, pageSize: 20, total: 1, totalPages: 1 } }),
      findById: vi.fn().mockResolvedValue({ id: '1' }),
      updateMe: vi.fn().mockResolvedValue({ id: '1' }),
      changePassword: vi.fn().mockResolvedValue(undefined),
      update: vi.fn().mockResolvedValue({ id: '1' }),
      softDelete: vi.fn().mockResolvedValue(undefined),
      restore: vi.fn().mockResolvedValue({ id: '1' }),
    }

    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [{ provide: UsersService, useValue: service }],
    }).compile()

    controller = module.get<UsersController>(UsersController)
  })

  it('should be defined', () => {
    expect(controller).toBeDefined()
  })

  it('should create user', async () => {
    const res = await controller.create({} as any, { sub: 'actor' } as any)
    expect(res).toBeDefined()
    expect(service.create).toHaveBeenCalled()
  })

  it('should list users', async () => {
    const res = await controller.list({})
    expect(res.data.length).toBe(1)
    expect(service.list).toHaveBeenCalled()
  })

  it('should update me', async () => {
    const res = await controller.updateMe({ name: 'test' }, { sub: 'actor' } as any)
    expect(res).toBeDefined()
    expect(service.updateMe).toHaveBeenCalled()
  })

  it('should change password', async () => {
    await controller.changePassword({ currentPassword: '1', newPassword: '2' }, { sub: 'actor' } as any)
    expect(service.changePassword).toHaveBeenCalled()
  })

  it('should find one', async () => {
    const res = await controller.findOne('1')
    expect(res).toBeDefined()
    expect(service.findById).toHaveBeenCalled()
  })

  it('should update user', async () => {
    const res = await controller.update('1', { name: 'test' }, { sub: 'actor' } as any)
    expect(res).toBeDefined()
    expect(service.update).toHaveBeenCalled()
  })

  it('should remove user', async () => {
    await controller.remove('1', { sub: 'actor' } as any)
    expect(service.softDelete).toHaveBeenCalled()
  })

  it('should restore user', async () => {
    const res = await controller.restore('1', { sub: 'actor' } as any)
    expect(res).toBeDefined()
    expect(service.restore).toHaveBeenCalled()
  })
})
