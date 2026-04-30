'use client'

import { DataTable } from '../DataTable'
import { ActionLabel } from './ActionLabel'
import type { AuditLogEntry } from '@judging/shared'

interface AuditTableProps {
  data: AuditLogEntry[] | undefined
  isLoading: boolean
  onRowClick: (log: AuditLogEntry) => void
}

export function AuditTable({ data, isLoading, onRowClick }: AuditTableProps) {
  return (
    <DataTable
      columns={[
        {
          header: 'Data/Hora',
          accessor: (item) => (
            <span className="whitespace-nowrap text-xs text-secondary-500">
              {new Date(item.createdAt).toLocaleString('pt-BR')}
            </span>
          ),
        },
        {
          header: 'Ator',
          accessor: (item) => (
            <span className="text-sm text-secondary-700">
              {item.actorName ?? item.actorId ?? 'Sistema'}
            </span>
          ),
        },
        {
          header: 'Ação',
          accessor: (item) => (
            <span className="inline-flex items-center rounded-full bg-primary-50 px-2.5 py-0.5 text-xs font-medium text-primary-700">
              <ActionLabel action={item.action} />
            </span>
          ),
        },
        {
          header: 'Entidade',
          accessor: (item) => (
            <span className="text-xs text-secondary-500">
              {item.entityType}
            </span>
          ),
        },
      ]}
      data={data}
      isLoading={isLoading}
      emptyMessage="Nenhum registro de auditoria encontrado."
      onRowClick={onRowClick}
    />
  )
}
