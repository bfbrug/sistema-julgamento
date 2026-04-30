import { ConflictException, Injectable, NotFoundException, UnauthorizedException, Inject } from '@nestjs/common'
import { UsersRepository } from './users.repository'
import { CreateUserDto } from './dto/create-user.dto'
import { UpdateUserDto } from './dto/update-user.dto'
import { UpdateMeDto } from './dto/update-me.dto'
import { ChangePasswordDto } from './dto/change-password.dto'
import { ListUsersDto } from './dto/list-users.dto'
import { AuditService } from '../audit/audit.service'
import { PrismaService } from '../../config/prisma.service'
import * as bcrypt from 'bcrypt'
import { env } from '../../config/env'
import { Prisma, User, UserRole } from '@prisma/client'
import { AppException } from '../../common/exceptions/app.exception'

@Injectable()
export class UsersService {
  constructor(
    @Inject(UsersRepository) private readonly repository: UsersRepository,
    @Inject(AuditService) private readonly auditService: AuditService,
    @Inject(PrismaService) private readonly prisma: PrismaService,
  ) {}

  async create(dto: CreateUserDto, actorId: string): Promise<User> {
    const existing = await this.repository.findByEmail(dto.email, { includeDeleted: true })
    if (existing) {
      throw new ConflictException('Email já em uso')
    }

    const passwordHash = await bcrypt.hash(dto.password, env.BCRYPT_ROUNDS)

    return this.prisma.$transaction(async (tx) => {
      const user = await this.repository.create({
        email: dto.email,
        name: dto.name,
        role: dto.role,
        passwordHash,
      }, tx)

      await this.auditService.record({
        action: 'USER_CREATED',
        entityType: 'User',
        entityId: user.id,
        actorId,
        payload: { email: user.email, role: user.role },
      }, tx)

      return user
    })
  }

  async findById(id: string, includeDeleted = false): Promise<User> {
    const user = await this.repository.findById(id, { includeDeleted })
    if (!user) {
      throw new NotFoundException('Usuário não encontrado')
    }
    return user
  }

  async list(filters: ListUsersDto) {
    const { data, total } = await this.repository.list(filters)
    const page = filters.page || 1
    const pageSize = filters.pageSize || 20
    return {
      data,
      meta: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    }
  }

  async update(id: string, dto: UpdateUserDto, actorId: string): Promise<User> {
    const user = await this.findById(id)

    if (dto.isActive === false && user.id === actorId) {
      throw new AppException('Não é possível desativar a si mesmo', 400, 'SELF_DEACTIVATION_FORBIDDEN')
    }

    if (user.role === UserRole.GESTOR) {
      const willDemote = dto.role && dto.role !== UserRole.GESTOR
      const willDeactivate = dto.isActive === false

      if (willDemote || willDeactivate) {
        const activeGestores = await this.repository.countActiveGestores()
        if (activeGestores <= 1) {
          throw new AppException('Não é possível remover o último gestor ativo do sistema', 400, 'LAST_GESTOR_PROTECTION')
        }
      }
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await this.repository.update(id, dto, tx)

      await this.auditService.record({
        action: 'USER_UPDATED',
        entityType: 'User',
        entityId: user.id,
        actorId,
        payload: { before: user, after: updated },
      }, tx)

      return updated
    })
  }

  async softDelete(id: string, actorId: string): Promise<void> {
    const user = await this.findById(id)

    if (user.id === actorId) {
      throw new AppException('Não é possível desativar a si mesmo', 400, 'SELF_DEACTIVATION_FORBIDDEN')
    }

    if (user.role === UserRole.GESTOR && user.isActive) {
      const activeGestores = await this.repository.countActiveGestores()
      if (activeGestores <= 1) {
        throw new AppException('Não é possível remover o último gestor ativo do sistema', 400, 'LAST_GESTOR_PROTECTION')
      }
    }

    await this.prisma.$transaction(async (tx) => {
      await this.repository.softDelete(id, tx)
      await this.revokeAllTokens(id, tx)

      await this.auditService.record({
        action: 'USER_DELETED',
        entityType: 'User',
        entityId: user.id,
        actorId,
        payload: {},
      }, tx)
    })
  }

  async restore(id: string, actorId: string): Promise<User> {
    const user = await this.findById(id, true)
    if (!user.deletedAt) {
      return user
    }

    return this.prisma.$transaction(async (tx) => {
      const restored = await this.repository.restore(id, tx)

      await this.auditService.record({
        action: 'USER_RESTORED',
        entityType: 'User',
        entityId: restored.id,
        actorId,
        payload: {},
      }, tx)

      return restored
    })
  }

  async updateMe(userId: string, dto: UpdateMeDto): Promise<User> {
    const user = await this.findById(userId)

    return this.prisma.$transaction(async (tx) => {
      const updated = await this.repository.update(userId, dto, tx)

      await this.auditService.record({
        action: 'USER_SELF_UPDATED',
        entityType: 'User',
        entityId: userId,
        actorId: userId,
        payload: { before: user, after: updated },
      }, tx)

      return updated
    })
  }

  async changePassword(userId: string, dto: ChangePasswordDto): Promise<void> {
    const user = await this.findById(userId)
    const isValid = await bcrypt.compare(dto.currentPassword, user.passwordHash)

    if (!isValid) {
      throw new UnauthorizedException('Senha atual inválida')
    }

    const passwordHash = await bcrypt.hash(dto.newPassword, env.BCRYPT_ROUNDS)

    await this.prisma.$transaction(async (tx) => {
      await this.repository.update(userId, { passwordHash }, tx)
      await this.revokeAllTokens(userId, tx)

      await this.auditService.record({
        action: 'USER_PASSWORD_CHANGED',
        entityType: 'User',
        entityId: userId,
        actorId: userId,
        payload: { changedAt: new Date().toISOString() },
      }, tx)
    })
  }

  private async revokeAllTokens(userId: string, tx?: Prisma.TransactionClient): Promise<void> {
    const client = tx ?? this.prisma
    await client.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    })
  }
}
