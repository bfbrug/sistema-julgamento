'use client'

import { useParams, usePathname } from 'next/navigation'
import { useEvent, useUpdateEvent } from '@/hooks/useEvents'
import { PageHeader } from '@/components/admin/PageHeader'
import { Button } from '@/components/ui/Button'
import { ArrowLeft, Play, Settings, List, Users, Trophy } from 'lucide-react'
import Link from 'next/link'
import type { ReactNode } from 'react'
import { EventStatus } from '@judging/shared'
import { cn } from '@/lib/utils'

export default function EventDetailLayout({ children }: { children: ReactNode }) {
  const { id } = useParams() as { id: string }
  const pathname = usePathname()
  const { data: event, isLoading } = useEvent(id)
  const { mutate: updateEvent } = useUpdateEvent(id)

  if (isLoading) return <div className="animate-pulse space-y-4">
    <div className="h-8 w-1/4 bg-secondary-200 rounded" />
    <div className="h-4 w-1/2 bg-secondary-200 rounded" />
    <div className="h-64 bg-secondary-100 rounded" />
  </div>

  if (!event) return <div>Evento não encontrado.</div>

  const tabs = [
    { href: `/events/${id}`, label: 'Categorias', icon: List, exact: true },
    { href: `/events/${id}/judges`, label: 'Jurados', icon: Users },
    { href: `/events/${id}/participants`, label: 'Participantes', icon: Trophy },
    { href: `/events/${id}/edit`, label: 'Configurações', icon: Settings },
  ]

  const handleStatusChange = (newStatus: EventStatus) => {
    updateEvent({ status: newStatus })
  }

  return (
    <div className="space-y-6">
      <div className="mb-4">
        <Link href="/events">
          <Button variant="ghost" size="sm" className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Voltar para lista
          </Button>
        </Link>
      </div>

      <PageHeader
        title={event.name}
        description={`${event.location} • ${new Date(event.date).toLocaleDateString('pt-BR')}`}
        action={
          <div className="flex gap-2">
            {event.status === EventStatus.DRAFT && (
              <Button variant="secondary" onClick={() => handleStatusChange(EventStatus.REGISTERING)}>
                Abrir Inscrições
              </Button>
            )}
            {event.status === EventStatus.REGISTERING && (
              <Button onClick={() => handleStatusChange(EventStatus.IN_PROGRESS)}>
                Iniciar Julgamento
              </Button>
            )}
            {event.status === EventStatus.IN_PROGRESS && (
              <Link href={`/events/${id}/live`}>
                <Button className="bg-warning-600 hover:bg-warning-700">
                  <Play className="mr-2 h-4 w-4 fill-current" />
                  Painel Ao Vivo
                </Button>
              </Link>
            )}
          </div>
        }
      />

      <div className="border-b border-secondary-200">
        <nav className="flex gap-6">
          {tabs.map((tab) => {
            const isActive = tab.exact ? pathname === tab.href : pathname.startsWith(tab.href)
            const Icon = tab.icon

            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={cn(
                  'flex items-center gap-2 border-b-2 px-1 pb-4 text-sm font-medium transition-colors',
                  isActive
                    ? 'border-primary-600 text-primary-600'
                    : 'border-transparent text-secondary-500 hover:border-secondary-300 hover:text-secondary-700'
                )}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </Link>
            )
          })}
        </nav>
      </div>

      <div className="py-4">{children}</div>
    </div>
  )
}
