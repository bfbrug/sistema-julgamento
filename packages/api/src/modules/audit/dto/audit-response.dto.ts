import { Expose } from 'class-transformer'

export class AuditResponseDto {
  @Expose()
  id!: string

  @Expose()
  actorId!: string | null

  @Expose()
  actorType!: string

  @Expose()
  actorName?: string

  @Expose()
  action!: string

  @Expose()
  entityType!: string

  @Expose()
  entityId!: string

  @Expose()
  payload!: unknown

  @Expose()
  ipAddress!: string | null

  @Expose()
  userAgent!: string | null

  @Expose()
  createdAt!: Date
}
