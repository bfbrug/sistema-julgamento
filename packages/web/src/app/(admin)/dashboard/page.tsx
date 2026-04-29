'use client'

import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { PageHeader } from '@/components/admin/PageHeader'
import { Card } from '@/components/ui/Card'
import { useEvents } from '@/hooks/useEvents'
import { useAuthStore } from '@/stores/auth.store'
import { Calendar, Users, Trophy, ChevronRight } from 'lucide-react'
import Link from 'next/link'
import { EventStatus } from '@judging/shared'

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export default function DashboardPage() {
  const { user } = useAuthStore()
  const { data: events, isLoading } = useEvents()

  const stats = [
    { label: 'Eventos Ativos', value: events?.filter(e => e.status === EventStatus.IN_PROGRESS).length || 0, icon: Calendar, color: 'text-primary-600' },
    { label: 'Total de Eventos', value: events?.length || 0, icon: Trophy, color: 'text-warning-600' },
    { label: 'Próximos Eventos', value: events?.filter(e => e.status === EventStatus.REGISTERING).length || 0, icon: Users, color: 'text-success-600' },
  ]

  return (
    <div className="space-y-8">
      <PageHeader
        title={`Olá, ${user?.name}`}
        description="Bem-vindo ao painel administrativo do Sistema de Julgamento."
      />

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
        {stats.map((stat, i) => (
          <Card
            key={i}
            body={
              <div className="flex items-center gap-4">
                <div className={cn('p-3 rounded-lg bg-white shadow-sm border border-secondary-100', stat.color)}>
                  <stat.icon className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-sm font-medium text-secondary-500">{stat.label}</p>
                  <p className="text-2xl font-bold text-secondary-900">{isLoading ? '...' : stat.value}</p>
                </div>
              </div>
            }
          />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card
          header={<h3 className="font-bold flex items-center justify-between">Eventos Recentes <Link href="/events" className="text-xs text-primary-600 hover:underline">Ver todos</Link></h3>}
          body={
            <div className="divide-y divide-secondary-100">
              {isLoading ? (
                <div className="py-4 text-center text-secondary-500">Carregando...</div>
              ) : events?.length === 0 ? (
                <div className="py-4 text-center text-secondary-500">Nenhum evento encontrado.</div>
              ) : (
                events?.slice(0, 5).map((event) => (
                  <Link
                    key={event.id}
                    href={`/events/${event.id}`}
                    className="flex items-center justify-between py-3 hover:bg-secondary-50 transition-colors px-2 rounded"
                  >
                    <div>
                      <p className="font-medium text-secondary-900">{event.name}</p>
                      <p className="text-xs text-secondary-500">{new Date(event.date).toLocaleDateString('pt-BR')}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={cn(
                        'text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full',
                        event.status === EventStatus.IN_PROGRESS ? 'bg-warning-100 text-warning-700' :
                        event.status === EventStatus.FINISHED ? 'bg-success-100 text-success-700' :
                        'bg-secondary-100 text-secondary-700'
                      )}>
                        {event.status}
                      </span>
                      <ChevronRight className="h-4 w-4 text-secondary-300" />
                    </div>
                  </Link>
                ))
              )}
            </div>
          }
        />

        <Card
          header={<h3 className="font-bold">Acesso Rápido</h3>}
          body={
            <div className="grid grid-cols-2 gap-4">
              <Link href="/events/new" className="flex flex-col items-center justify-center p-6 rounded-lg border-2 border-dashed border-secondary-200 hover:border-primary-300 hover:bg-primary-50 transition-all group">
                <Calendar className="h-8 w-8 text-secondary-400 group-hover:text-primary-500 mb-2" />
                <span className="text-sm font-medium text-secondary-700 group-hover:text-primary-700">Novo Evento</span>
              </Link>
              <Link href="/users" className="flex flex-col items-center justify-center p-6 rounded-lg border-2 border-dashed border-secondary-200 hover:border-primary-300 hover:bg-primary-50 transition-all group">
                <Users className="h-8 w-8 text-secondary-400 group-hover:text-primary-500 mb-2" />
                <span className="text-sm font-medium text-secondary-700 group-hover:text-primary-700">Gerenciar Usuários</span>
              </Link>
            </div>
          }
        />
      </div>
    </div>
  )
}
