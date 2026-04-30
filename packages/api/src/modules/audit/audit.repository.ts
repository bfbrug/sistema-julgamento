import { Injectable, Inject } from '@nestjs/common'
import { PrismaService } from '../../config/prisma.service'
import { Prisma, AuditLog } from '@prisma/client'

export interface AuditListFilters {
  cursor?: string
  limit?: number
  action?: string
  actorId?: string
  entityType?: string
  entityId?: string
  startDate?: string
  endDate?: string
}

export interface AuditListOptions {
  limit?: number
  cursor?: string
}

@Injectable()
export class AuditRepository {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async create(
    data: Prisma.AuditLogUncheckedCreateInput,
    tx?: Prisma.TransactionClient,
  ): Promise<AuditLog> {
    const client = tx ?? this.prisma
    return client.auditLog.create({ data })
  }

  async findByEntity(
    entityType: string,
    entityId: string,
    options?: AuditListOptions,
    tx?: Prisma.TransactionClient,
  ): Promise<AuditLog[]> {
    const client = tx ?? this.prisma
    return client.auditLog.findMany({
      where: { entityType, entityId },
      orderBy: { createdAt: 'desc' },
      take: options?.limit ?? 50,
      cursor: options?.cursor ? { id: options.cursor } : undefined,
      skip: options?.cursor ? 1 : undefined,
    })
  }

  async findByActor(
    actorId: string,
    options?: AuditListOptions,
    tx?: Prisma.TransactionClient,
  ): Promise<AuditLog[]> {
    const client = tx ?? this.prisma
    return client.auditLog.findMany({
      where: { actorId },
      orderBy: { createdAt: 'desc' },
      take: options?.limit ?? 50,
      cursor: options?.cursor ? { id: options.cursor } : undefined,
      skip: options?.cursor ? 1 : undefined,
    })
  }

  async findById(id: string, tx?: Prisma.TransactionClient): Promise<AuditLog | null> {
    const client = tx ?? this.prisma
    return client.auditLog.findUnique({
      where: { id },
      include: { actor: { select: { name: true } } },
    })
  }

  async list(
    filters: AuditListFilters,
    tx?: Prisma.TransactionClient,
  ): Promise<{ data: AuditLog[]; nextCursor: string | null }> {
    const client = tx ?? this.prisma
    const limit = Math.min(filters.limit ?? 50, 200)

    const where: Prisma.AuditLogWhereInput = {}

    if (filters.action) {
      where.action = filters.action
    }

    if (filters.actorId) {
      where.actorId = filters.actorId
    }

    if (filters.entityType) {
      where.entityType = filters.entityType
    }

    if (filters.entityId) {
      where.entityId = filters.entityId
    }

    if (filters.startDate || filters.endDate) {
      where.createdAt = {}
      if (filters.startDate) {
        where.createdAt.gte = new Date(filters.startDate)
      }
      if (filters.endDate) {
        where.createdAt.lte = new Date(filters.endDate)
      }
    }

    const data = await client.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit + 1,
      cursor: filters.cursor ? { id: filters.cursor } : undefined,
      skip: filters.cursor ? 1 : undefined,
      include: { actor: { select: { name: true } } },
    })

    const hasMore = data.length > limit
    const trimmed = hasMore ? data.slice(0, limit) : data
    const nextCursor = hasMore && trimmed.length > 0 ? trimmed[trimmed.length - 1]!.id : null

    return { data: trimmed, nextCursor }
  }
}
