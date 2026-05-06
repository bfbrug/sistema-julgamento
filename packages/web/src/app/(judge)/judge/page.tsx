'use client'

import { useMyJudgeEvents } from '@/hooks/useEvents'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { Play, Calendar, MapPin, Loader2 } from 'lucide-react'
import { eventStatusLabels } from '@/lib/event-status'
import { formatEventDate } from '@/lib/utils'

export default function JudgeEventsPage() {
  const router = useRouter()
  const { data: events, isLoading } = useMyJudgeEvents()

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
      </div>
    )
  }

  const inProgressEvents = events?.filter((e) => e.status === 'IN_PROGRESS') ?? []
  const finishedEvents = events?.filter((e) => e.status === 'FINISHED') ?? []

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-2xl font-bold text-secondary-900 mb-2">Meus Eventos</h1>
      <p className="text-secondary-600 mb-8">
        Selecione um evento abaixo para acessar o painel de julgamento.
      </p>

      {inProgressEvents.length === 0 && finishedEvents.length === 0 && (
        <div className="rounded-lg border border-secondary-200 bg-secondary-50 p-8 text-center">
          <p className="text-secondary-600">
            Você não está atribuído a nenhum evento no momento.
          </p>
          <p className="text-secondary-500 text-sm mt-2">
            Entre em contato com o gestor do evento para ser convidado como jurado.
          </p>
        </div>
      )}

      {inProgressEvents.length > 0 && (
        <div className="mb-8">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-primary-700 mb-3">
            Em andamento
          </h2>
          <div className="space-y-3">
            {inProgressEvents.map((event) => (
              <EventCard key={event.id} event={event} onClick={() => router.push(`/judge/${event.id}`)} />
            ))}
          </div>
        </div>
      )}

      {finishedEvents.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-secondary-500 mb-3">
            Finalizados
          </h2>
          <div className="space-y-3">
            {finishedEvents.map((event) => (
              <EventCard key={event.id} event={event} onClick={() => router.push(`/judge/${event.id}`)} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function EventCard({ event, onClick }: { event: { id: string; name: string; eventDate: string; location: string; status: string }; onClick: () => void }) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-secondary-200 bg-white p-4 shadow-sm transition hover:shadow-md">
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-secondary-900">{event.name}</h3>
          <span className="inline-flex items-center rounded-full bg-primary-50 px-2 py-0.5 text-xs font-medium text-primary-700">
            {eventStatusLabels[event.status as keyof typeof eventStatusLabels]}
          </span>
        </div>
        <div className="flex items-center gap-4 text-sm text-secondary-500">
          <span className="flex items-center gap-1">
            <Calendar className="h-3.5 w-3.5" />
            {formatEventDate(event.eventDate)}
          </span>
          <span className="flex items-center gap-1">
            <MapPin className="h-3.5 w-3.5" />
            {event.location}
          </span>
        </div>
      </div>
      <Button onClick={onClick} size="sm" className="gap-1">
        <Play className="h-4 w-4 fill-current" />
        Entrar
      </Button>
    </div>
  )
}
