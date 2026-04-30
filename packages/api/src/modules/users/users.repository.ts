import { Injectable, Inject } from '@nestjs/common'
import { PrismaService } from '../../config/prisma.service'
import { Prisma, User } from '@prisma/client'
import { ListUsersDto } from './dto/list-users.dto'

@Injectable()
export class UsersRepository {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async create(data: Prisma.UserCreateInput, tx?: Prisma.TransactionClient): Promise<User> {
    const client = tx ?? this.prisma
    return client.user.create({ data })
  }

  async findById(id: string, options?: { includeDeleted?: boolean }): Promise<User | null> {
    const where: Prisma.UserWhereInput = { id }
    if (options?.includeDeleted) {
      where.deletedAt = undefined // Bypass middleware
    }
    return this.prisma.user.findFirst({ where })
  }

  async findByEmail(email: string, options?: { includeDeleted?: boolean }): Promise<User | null> {
    const where: Prisma.UserWhereInput = { email }
    if (options?.includeDeleted) {
      where.deletedAt = undefined // Bypass middleware
    }
    return this.prisma.user.findFirst({ where })
  }

  async list(filters: ListUsersDto): Promise<{ data: User[]; total: number }> {
    const { page = 1, pageSize = 20, search, role, isActive, includeDeleted } = filters
    const skip = (page - 1) * pageSize
    const take = pageSize

    const where: Prisma.UserWhereInput = {}

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ]
    }

    if (role) {
      where.role = role
    }

    if (isActive !== undefined) {
      where.isActive = isActive
    }

    if (includeDeleted) {
      where.deletedAt = undefined // Bypass middleware
    }

    const [data, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.user.count({ where }),
    ])

    return { data, total }
  }

  async update(id: string, data: Prisma.UserUpdateInput, tx?: Prisma.TransactionClient): Promise<User> {
    const client = tx ?? this.prisma
    return client.user.update({ where: { id }, data })
  }

  async softDelete(id: string, tx?: Prisma.TransactionClient): Promise<User> {
    const client = tx ?? this.prisma
    return client.user.update({
      where: { id },
      data: { deletedAt: new Date() },
    })
  }

  async restore(id: string, tx?: Prisma.TransactionClient): Promise<User> {
    const client = tx ?? this.prisma
    return client.user.update({
      where: { id },
      data: { deletedAt: null },
    })
  }

  async countActiveGestores(): Promise<number> {
    return this.prisma.user.count({
      where: { role: 'GESTOR', isActive: true },
    })
  }
}
