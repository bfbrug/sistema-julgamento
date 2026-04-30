'use client'

import { useState } from 'react'
import { PageHeader } from '@/components/admin/PageHeader'
import { AuditFilters, type AuditFilterValues } from '@/components/admin/audit/AuditFilters'
import { AuditTable } from '@/components/admin/audit/AuditTable'
import { AuditDetailDrawer } from '@/components/admin/audit/AuditDetailDrawer'
import { useAuditLogs } from '@/hooks/useAudit'
import { Button } from '@/components/ui/Button'
import type { AuditLogEntry } from '@judging/shared'

export default function AuditPage() {
  const [filters, setFilters] = useState<AuditFilterValues>({
    action: '',
    actorId: '',
    entityType: '',
    startDate: '',
    endDate: '',
  })

  const [selectedLogId, setSelectedLogId] = useState<string | null>(null)

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } = useAuditLogs({
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
      <PageHeader title="Auditoria Global" description="Histórico completo de operações do sistema" />

      <AuditFilters values={filters} onChange={setFilters} />

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
