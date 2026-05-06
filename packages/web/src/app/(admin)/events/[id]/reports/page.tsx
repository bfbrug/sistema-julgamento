'use client'

import { useParams } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { PageHeader } from '@/components/admin/PageHeader'
import { Button } from '@/components/ui/Button'
import { ReportCard } from '@/components/admin/reports/ReportCard'
import { useReportJobs } from '@/hooks/useReports'
import { useEvent } from '@/hooks/useEvents'
import type { ReportType } from '@judging/shared'
import { EventStatus } from '@judging/shared'

const REPORT_TYPES: Array<{ type: ReportType; title: string; description: string }> = [
  {
    type: 'TOP_N',
    title: 'Top N',
    description: 'Os primeiros colocados conforme configurado no evento.',
  },
  {
    type: 'GENERAL',
    title: 'Classificação Geral',
    description: 'Todos os participantes não-ausentes, com desclassificados em seção separada.',
  },
  {
    type: 'DETAILED_BY_JUDGE',
    title: 'Detalhado por Jurado',
    description: 'Notas individuais por jurado. Identidade anonimizada.',
  },
]

export default function ReportsPage() {
  const { id: eventId } = useParams() as { id: string }
  const { data: jobs, isLoading } = useReportJobs(eventId)
  const { data: event } = useEvent(eventId)
  const isDraft = event?.status === EventStatus.DRAFT

  return (
    <>
      <div className="mb-4">
        <Link href={`/events/${eventId}`}>
          <Button variant="ghost" size="sm" className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </Button>
        </Link>
      </div>

      <PageHeader
        title="Relatórios"
        description="Gere e baixe os relatórios de classificação do evento."
      />

      {isDraft && (
        <div className="mb-4 rounded-md border border-warning-200 bg-warning-50 px-4 py-3 text-sm text-warning-700">
          Relatórios disponíveis apenas após o evento ser iniciado.
        </div>
      )}

      {isLoading ? (
        <div className="text-sm text-secondary-500">Carregando...</div>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
          {REPORT_TYPES.map(({ type, title, description }) => (
            <ReportCard
              key={type}
              eventId={eventId}
              type={type}
              title={title}
              description={description}
              lastJob={jobs?.[type] ?? null}
              disabled={isDraft}
            />
          ))}
        </div>
      )}
    </>
  )
}
