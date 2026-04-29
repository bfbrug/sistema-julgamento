'use client'

import { useCreateEvent } from '@/hooks/useEvents'
import { PageHeader } from '@/components/admin/PageHeader'
import { EventForm } from '@/components/admin/forms/EventForm'
import { Button } from '@/components/ui/Button'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default function NewEventPage() {
  const { mutate: createEvent, isPending } = useCreateEvent()

  return (
    <>
      <div className="mb-4">
        <Link href="/events">
          <Button variant="ghost" size="sm" className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </Button>
        </Link>
      </div>

      <PageHeader
        title="Novo Evento"
        description="Preencha as informações básicas para criar um novo evento."
      />

      <EventForm onSubmit={createEvent} isLoading={isPending} />
    </>
  )
}
