'use client'

import { useParams } from 'next/navigation'
import { useEvent, useUpdateEvent } from '@/hooks/useEvents'
import { PageHeader } from '@/components/admin/PageHeader'
import { EventForm } from '@/components/admin/forms/EventForm'

export default function EditEventPage() {
  const { id } = useParams() as { id: string }
  const { data: event, isLoading: loadingEvent } = useEvent(id)
  const { mutate: updateEvent, isPending: isUpdating } = useUpdateEvent(id)

  if (loadingEvent) return <div>Carregando...</div>
  if (!event) return <div>Evento não encontrado.</div>

  return (
    <>
      <PageHeader
        title="Configurações do Evento"
        description="Atualize as informações e regras de pontuação."
      />

      <EventForm
        initialData={event}
        onSubmit={updateEvent}
        isLoading={isUpdating}
      />
    </>
  )
}
