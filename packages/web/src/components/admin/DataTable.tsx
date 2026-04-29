'use client'

import { ReactNode } from 'react'
import { EmptyState } from './EmptyState'
import { cn } from '@/lib/utils'

interface Column<T> {
  header: string
  accessor: keyof T | ((item: T) => ReactNode)
  className?: string
}

interface DataTableProps<T> {
  columns: Column<T>[]
  data: T[] | undefined
  isLoading?: boolean
  emptyMessage?: string
  onRowClick?: (item: T) => void
}

export function DataTable<T>({
  columns,
  data,
  isLoading,
  emptyMessage = 'Nenhum registro encontrado.',
  onRowClick,
}: DataTableProps<T>) {
  if (isLoading) {
    return (
      <div className="w-full space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-12 w-full animate-pulse rounded bg-secondary-100" />
        ))}
      </div>
    )
  }

  if (!data || data.length === 0) {
    return <EmptyState message={emptyMessage} />
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-secondary-200 bg-white">
      <table className="w-full text-left text-sm">
        <thead className="bg-secondary-50 text-xs font-semibold uppercase text-secondary-500">
          <tr>
            {columns.map((column, i) => (
              <th key={i} className={cn('px-6 py-3', column.className)}>
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-secondary-200">
          {data.map((item, rowIndex) => (
            <tr
              key={rowIndex}
              onClick={() => onRowClick?.(item)}
              className={cn(
                'transition-colors',
                onRowClick ? 'cursor-pointer hover:bg-secondary-50' : ''
              )}
            >
              {columns.map((column, colIndex) => (
                <td key={colIndex} className={cn('px-6 py-4 text-secondary-700', column.className)}>
                  {typeof column.accessor === 'function'
                    ? column.accessor(item)
                    : (item[column.accessor] as ReactNode)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
