'use client'

import { useEvents, useDeleteEvent } from '@/hooks/useEvents'
import { PageHeader } from '@/components/admin/PageHeader'
import { DataTable } from '@/components/admin/DataTable'
import { Button } from '@/components/ui/Button'
import { ConfirmDialog } from '@/components/admin/ConfirmDialog'
import { Plus, Edit, Trash2, Play, BarChart3 } from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'
import { EventStatus } from '@judging/shared'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { cn } from '@/lib/utils'
import { eventStatusLabels } from '@/lib/event-status'

import type { JudgingEvent } from '@judging/shared'
type EventRow = JudgingEvent

export default function EventsPage() {
  const { data: events, isLoading } = useEvents()
  const { mutate: deleteEvent, isPending: isDeleting } = useDeleteEvent()
  const [eventToDelete, setEventToDelete] = useState<string | null>(null)

  const columns = [
    { 
      header: 'Nome', 
      accessor: (event: EventRow) => (
        <Link href={`/events/${event.id}`} className="font-medium text-secondary-900 hover:text-primary-600 transition-colors">
          {event.name}
        </Link>
      )
    },
    { 
      header: 'Data', 
      accessor: (event: EventRow) => format(new Date(event.eventDate), "dd 'de' MMMM, yyyy", { locale: ptBR })
    },
    { 
      header: 'Status', 
      accessor: (event: EventRow) => (
        <span className={cn(
          'inline-flex items-center rounded-full px-2 py-1 text-xs font-medium',
          statusColors[event.status as EventStatus]
        )}>
          {eventStatusLabels[event.status as EventStatus]}
        </span>
      )
    },
    { header: 'Top N', accessor: 'topN' as const },
    {
      header: 'Ações',
      accessor: (event: EventRow) => (
        <div className="flex items-center gap-2">
          <Link href={`/events/${event.id}`}>
            <Button size="sm" variant="ghost" title="Detalhes">
              <Play className="h-4 w-4" />
            </Button>
          </Link>
          {event.status === EventStatus.FINISHED && (
            <Link href={`/events/${event.id}/reports`}>
              <Button size="sm" variant="ghost" title="Resultados" className="text-success-600 hover:text-success-700 hover:bg-success-50">
                <BarChart3 className="h-4 w-4" />
              </Button>
            </Link>
          )}
          <Link href={`/events/${event.id}/edit`}>
            <Button size="sm" variant="ghost" title="Editar">
              <Edit className="h-4 w-4" />
            </Button>
          </Link>
          <Button 
            size="sm" 
            variant="ghost" 
            className="text-danger-600 hover:text-danger-700 hover:bg-danger-50"
            title="Excluir"
            onClick={() => setEventToDelete(event.id)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      )
    }
  ]

  return (
    <>
      <PageHeader
        title="Eventos"
        description="Gerencie seus eventos de julgamento."
        action={
          <Link href="/events/new">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Novo Evento
            </Button>
          </Link>
        }
      />

      <DataTable
        columns={columns}
        data={events}
        isLoading={isLoading}
        emptyMessage="Nenhum evento cadastrado."
      />

      <ConfirmDialog
        isOpen={!!eventToDelete}
        onClose={() => setEventToDelete(null)}
        onConfirm={() => {
          if (eventToDelete) {
            deleteEvent(eventToDelete, {
              onSuccess: () => setEventToDelete(null)
            })
          }
        }}
        title="Excluir Evento"
        message="Tem certeza que deseja excluir este evento? Esta ação não pode ser desfeita."
        isLoading={isDeleting}
      />
    </>
  )
}

const statusColors: Record<EventStatus, string> = {
  [EventStatus.DRAFT]: 'bg-secondary-100 text-secondary-700',
  [EventStatus.IN_PROGRESS]: 'bg-warning-100 text-warning-700',
  [EventStatus.FINISHED]: 'bg-success-100 text-success-700',
}
