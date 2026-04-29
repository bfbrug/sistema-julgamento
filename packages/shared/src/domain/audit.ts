export interface AuditLog {
  id: string
  actorId: string | null
  actorType: 'USER' | 'SYSTEM'
  action: string
  entityType: string
  entityId: string
  payload: any
  ipAddress: string | null
  userAgent: string | null
  createdAt: string
}
