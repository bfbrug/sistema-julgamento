'use client'

import { useState } from 'react'
import { useParams } from 'next/navigation'
import { PageHeader } from '@/components/admin/PageHeader'
import { AuditFilters, type AuditFilterValues } from '@/components/admin/audit/AuditFilters'
import { AuditTable } from '@/components/admin/audit/AuditTable'
import { AuditDetailDrawer } from '@/components/admin/audit/AuditDetailDrawer'
import { useEventAuditLogs } from '@/hooks/useAudit'
import { Button } from '@/components/ui/Button'
import type { AuditLogEntry } from '@judging/shared'

export default function EventAuditPage() {
  const { id } = useParams() as { id: string }

  const [filters, setFilters] = useState<AuditFilterValues>({
    action: '',
    actorId: '',
    entityType: '',
    startDate: '',
    endDate: '',
  })

  const [selectedLogId, setSelectedLogId] = useState<string | null>(null)

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } = useEventAuditLogs(id, {
    action: filters.action || undefined,
    actorId: filters.actorId || undefined,
    entityType: filters.entityType || undefined,
    startDate: filters.startDate || undefined,
    endDate: filters.endDate || undefined,
    limit: 50,
  })

  const allLogs = data?.pages.flatMap((page) => page.data) ?? []

  const handleRowClick = (log: AuditLogEntry) => {
    setSelectedLogId(log.id)
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Auditoria do Evento" description="Histórico de operações relacionadas a este evento" />

      <AuditFilters values={filters} onChange={setFilters} hideEntityType />

      <AuditTable data={allLogs} isLoading={isLoading} onRowClick={handleRowClick} />

      {hasNextPage && (
        <div className="flex justify-center">
          <Button variant="secondary" onClick={() => fetchNextPage()} disabled={isFetchingNextPage}>
            {isFetchingNextPage ? 'Carregando...' : 'Carregar mais'}
          </Button>
        </div>
      )}

      <AuditDetailDrawer logId={selectedLogId} onClose={() => setSelectedLogId(null)} />
    </div>
  )
}
