'use client'

import { useParams } from 'next/navigation'
import { useEvent } from '@/hooks/useEvents'
import { TiebreakerConfigForm } from '@/components/events/TiebreakerConfigForm'

export default function EventTiebreakerPage() {
  const { id: eventId } = useParams() as { id: string }
  const { data: event, isLoading } = useEvent(eventId)

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 w-1/4 rounded bg-secondary-200" />
        <div className="h-64 rounded bg-secondary-100" />
      </div>
    )
  }

  if (!event) {
    return <div>Evento não encontrado.</div>
  }

  return (
    <TiebreakerConfigForm
      eventId={eventId}
      tiebreaker={event.tiebreaker}
      eventStatus={event.status}
    />
  )
}
