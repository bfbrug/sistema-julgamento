'use client'

import { useAuditLog } from '@/hooks/useAudit'
import { ActionLabel } from './ActionLabel'
import { X } from 'lucide-react'

interface AuditDetailDrawerProps {
  logId: string | null
  onClose: () => void
}

export function AuditDetailDrawer({ logId, onClose }: AuditDetailDrawerProps) {
  const { data: log, isLoading } = useAuditLog(logId ?? '')

  if (!logId) return null

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/30" onClick={onClose} />
      <div className="fixed right-0 top-0 z-50 h-full w-full max-w-md overflow-y-auto border-l border-secondary-200 bg-white p-6 shadow-xl">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-secondary-900">Detalhes da Auditoria</h2>
          <button onClick={onClose} className="rounded-md p-1 hover:bg-secondary-100">
            <X className="h-5 w-5 text-secondary-500" />
          </button>
        </div>

        {isLoading && <div className="animate-pulse space-y-3"><div className="h-4 w-3/4 bg-secondary-100 rounded" /></div>}

        {!isLoading && log && (
          <div className="space-y-5">
            <div>
              <label className="text-xs font-medium text-secondary-500">Ação</label>
              <p className="text-sm font-medium text-secondary-900">
                <ActionLabel action={log.action} />
              </p>
            </div>

            <div>
              <label className="text-xs font-medium text-secondary-500">Data/Hora</label>
              <p className="text-sm text-secondary-700">
                {new Date(log.createdAt).toLocaleString('pt-BR')}
              </p>
            </div>

            <div>
              <label className="text-xs font-medium text-secondary-500">Ator</label>
              <p className="text-sm text-secondary-700">
                {log.actorName ?? log.actorId ?? 'Sistema'}
              </p>
            </div>

            <div>
              <label className="text-xs font-medium text-secondary-500">Entidade</label>
              <p className="text-sm text-secondary-700">
                {log.entityType} — {log.entityId}
              </p>
            </div>

            {log.ipAddress && (
              <div>
                <label className="text-xs font-medium text-secondary-500">IP</label>
                <p className="text-sm text-secondary-700">{log.ipAddress}</p>
              </div>
            )}

            {log.userAgent && (
              <div>
                <label className="text-xs font-medium text-secondary-500">User-Agent</label>
                <p className="break-all text-xs text-secondary-600">{log.userAgent}</p>
              </div>
            )}

            <div>
              <label className="text-xs font-medium text-secondary-500">Payload</label>
              <pre className="mt-1 max-h-96 overflow-auto rounded-md bg-secondary-50 p-3 text-xs text-secondary-700">
                {JSON.stringify(log.payload, null, 2)}
              </pre>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
