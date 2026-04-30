export interface AuditLogEntry {
  id: string
  actorId: string | null
  actorType: 'USER' | 'SYSTEM'
  actorName?: string
  action: string
  entityType: string
  entityId: string
  payload: unknown
  ipAddress: string | null
  userAgent: string | null
  createdAt: string
}

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
