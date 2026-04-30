import { Test, TestingModule } from '@nestjs/testing'
import { UsersService } from '../users.service'
import { UsersRepository } from '../users.repository'
import { AuditService } from '../../audit/audit.service'
import { PrismaService } from '../../../config/prisma.service'
import { ConflictException, NotFoundException, UnauthorizedException } from '@nestjs/common'
import { AppException } from '../../../common/exceptions/app.exception'
import * as bcrypt from 'bcrypt'

vi.mock('bcrypt')

describe('UsersService', () => {
  let service: UsersService
  let repository: any
  let auditService: any
  let prisma: any

  beforeEach(async () => {
    repository = {
      findByEmail: vi.fn(),
      findById: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      softDelete: vi.fn(),
      restore: vi.fn(),
      list: vi.fn(),
      countActiveGestores: vi.fn(),
    }

    auditService = {
      record: vi.fn(),
    }

    prisma = {
      refreshToken: {
        updateMany: vi.fn(),
      },
    }
    prisma.$transaction = vi.fn(async (cb: any) => cb(prisma))

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: UsersRepository, useValue: repository },
        { provide: AuditService, useValue: auditService },
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile()

    service = module.get<UsersService>(UsersService)
  })

  it('should create user', async () => {
    repository.findByEmail.mockResolvedValue(null)
    vi.mocked(bcrypt.hash).mockResolvedValue('hashed' as never)
    repository.create.mockResolvedValue({ id: '1', email: 'test@test.com' })

    const res = await service.create({ email: 'test@test.com', name: 'Test', password: 'pass', role: 'GESTOR' }, 'actor')
    expect(res.id).toBe('1')
    expect(auditService.record).toHaveBeenCalled()
  })

  it('should throw ConflictException if email exists', async () => {
    repository.findByEmail.mockResolvedValue({ id: '1' })
    await expect(service.create({ email: 'test', name: 't', password: 'p', role: 'GESTOR' }, 'actor')).rejects.toThrow(ConflictException)
  })

  it('should prevent deleting last gestor', async () => {
    repository.findById.mockResolvedValue({ id: '1', role: 'GESTOR', isActive: true })
    repository.countActiveGestores.mockResolvedValue(1)
    await expect(service.softDelete('1', 'another-actor')).rejects.toThrow(AppException)
  })

  it('should prevent self deactivation', async () => {
    repository.findById.mockResolvedValue({ id: 'actor', role: 'GESTOR', isActive: true })
    await expect(service.softDelete('actor', 'actor')).rejects.toThrow(AppException)
  })

  it('should prevent self deactivation in update', async () => {
    repository.findById.mockResolvedValue({ id: 'actor', role: 'GESTOR', isActive: true })
    await expect(service.update('actor', { isActive: false }, 'actor')).rejects.toThrow(AppException)
  })

  it('should change password', async () => {
    repository.findById.mockResolvedValue({ id: '1', passwordHash: 'oldhash' })
    vi.mocked(bcrypt.compare).mockResolvedValue(true as never)
    vi.mocked(bcrypt.hash).mockResolvedValue('newhash' as never)

    await service.changePassword('1', { currentPassword: 'old', newPassword: 'new' })
    expect(repository.update).toHaveBeenCalledWith('1', { passwordHash: 'newhash' }, prisma)
    expect(prisma.refreshToken.updateMany).toHaveBeenCalled()
  })

  it('should throw UnauthorizedException on wrong password', async () => {
    repository.findById.mockResolvedValue({ id: '1', passwordHash: 'oldhash' })
    vi.mocked(bcrypt.compare).mockResolvedValue(false as never)

    await expect(service.changePassword('1', { currentPassword: 'wrong', newPassword: 'new' })).rejects.toThrow(UnauthorizedException)
  })

  it('should return user from findById', async () => {
    repository.findById.mockResolvedValue({ id: '1' })
    const user = await service.findById('1')
    expect(user.id).toBe('1')
  })

  it('should throw NotFoundException on findById not found', async () => {
    repository.findById.mockResolvedValue(null)
    await expect(service.findById('1')).rejects.toThrow(NotFoundException)
  })

  it('should list users', async () => {
    repository.list.mockResolvedValue({ data: [], total: 0 })
    const res = await service.list({})
    expect(res.data).toEqual([])
    expect(res.meta.total).toBe(0)
  })

  it('should update user', async () => {
    repository.findById.mockResolvedValue({ id: '1', role: 'JURADO' })
    repository.update.mockResolvedValue({ id: '1', name: 'new' })
    const res = await service.update('1', { name: 'new' }, 'actor')
    expect(res.name).toBe('new')
    expect(auditService.record).toHaveBeenCalled()
  })

  it('should restore user', async () => {
    repository.findById.mockResolvedValue({ id: '1', deletedAt: new Date() })
    repository.restore.mockResolvedValue({ id: '1', deletedAt: null })
    const res = await service.restore('1', 'actor')
    expect(res.deletedAt).toBeNull()
    expect(auditService.record).toHaveBeenCalled()
  })

  it('should skip restore if already active', async () => {
    repository.findById.mockResolvedValue({ id: '1', deletedAt: null })
    const res = await service.restore('1', 'actor')
    expect(res.deletedAt).toBeNull()
    expect(repository.restore).not.toHaveBeenCalled()
  })

  it('should update me', async () => {
    repository.findById.mockResolvedValue({ id: '1' })
    repository.update.mockResolvedValue({ id: '1', name: 'new' })
    const res = await service.updateMe('1', { name: 'new' })
    expect(res.name).toBe('new')
  })
})
