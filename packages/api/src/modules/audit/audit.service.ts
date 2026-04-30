import { Injectable, Inject } from '@nestjs/common'
import { PrismaService } from '../../config/prisma.service'
import { Prisma, AuditLog } from '@prisma/client'
import { AuditRepository, AuditListFilters, AuditListOptions } from './audit.repository'
import { PinoLogger, InjectPinoLogger } from 'nestjs-pino'

export interface RecordAuditInput {
  action: string
  entityType: string
  entityId: string
  actorId?: string
  actorType?: 'USER' | 'SYSTEM'
  payload?: unknown
  ipAddress?: string
  userAgent?: string
}

const SENSITIVE_KEYS = [
  'password',
  'passwordhash',
  'currentpassword',
  'newpassword',
  'accesstoken',
  'refreshtoken',
  'token',
  'secret',
  'apikey',
]

function sanitizePayload(value: unknown): unknown {
  if (typeof value !== 'object' || value === null) return value
  if (Array.isArray(value)) return value.map(sanitizePayload)

  const result: Record<string, unknown> = {}
  for (const [key, val] of Object.entries(value)) {
    const lowerKey = key.toLowerCase()
    if (SENSITIVE_KEYS.some((s) => lowerKey.includes(s))) {
      result[key] = '[REDACTED]'
    } else {
      result[key] = sanitizePayload(val)
    }
  }
  return result
}

@Injectable()
export class AuditService {
  constructor(
    @Inject(AuditRepository) private readonly repository: AuditRepository,
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @InjectPinoLogger(AuditService.name) private readonly logger: PinoLogger,
  ) {}

  async record(input: RecordAuditInput, tx?: Prisma.TransactionClient): Promise<AuditLog> {
    const log = await this.repository.create(
      {
        actorId: input.actorId ?? null,
        actorType: input.actorType ?? 'USER',
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId,
        payload: sanitizePayload(input.payload) as Prisma.InputJsonValue,
        ipAddress: input.ipAddress ?? null,
        userAgent: input.userAgent ?? null,
        createdAt: new Date(),
      },
      tx,
    )

    this.logger.info({ auditId: log.id, action: input.action }, 'Audit event recorded')
    return log
  }

  async findByEntity(
    entityType: string,
    entityId: string,
    options?: AuditListOptions,
    tx?: Prisma.TransactionClient,
  ): Promise<AuditLog[]> {
    return this.repository.findByEntity(entityType, entityId, options, tx)
  }

  async findByActor(
    actorId: string,
    options?: AuditListOptions,
    tx?: Prisma.TransactionClient,
  ): Promise<AuditLog[]> {
    return this.repository.findByActor(actorId, options, tx)
  }

  async list(
    filters: AuditListFilters,
    tx?: Prisma.TransactionClient,
  ): Promise<{ data: AuditLog[]; nextCursor: string | null }> {
    return this.repository.list(filters, tx)
  }

  async findById(id: string, tx?: Prisma.TransactionClient): Promise<AuditLog | null> {
    return this.repository.findById(id, tx)
  }
}
