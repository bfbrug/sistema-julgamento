import type { AuditLogEntry } from '../domain/audit'

export type AuditLogResponse = AuditLogEntry

export interface ListAuditQuery {
  cursor?: string
  limit?: number
  action?: string
  actorId?: string
  entityType?: string
  entityId?: string
  startDate?: string
  endDate?: string
}

export interface ListAuditResponse {
  data: AuditLogResponse[]
  nextCursor: string | null
  hasMore: boolean
}
