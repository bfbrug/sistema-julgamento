'use client'

import { Download } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import type { ReportJob, ReportType } from '@judging/shared'

interface DownloadButtonProps {
  eventId: string
  type: ReportType
  lastJob: ReportJob | null | undefined
}

export function DownloadButton({ eventId, type, lastJob }: DownloadButtonProps) {
  const hasCompleted = lastJob?.status === 'COMPLETED'
  const apiBase = process.env['NEXT_PUBLIC_API_URL'] ?? ''

  const handleDownload = () => {
    if (!hasCompleted) return
    const url = `${apiBase}/events/${eventId}/reports/${type.toLowerCase()}/download`
    window.open(url, '_blank')
  }

  return (
    <div className="flex flex-col gap-1">
      <Button
        variant="secondary"
        size="sm"
        disabled={!hasCompleted}
        onClick={handleDownload}
        className="gap-2"
      >
        <Download className="h-4 w-4" />
        Baixar último
      </Button>
      {hasCompleted && lastJob?.completedAt && (
        <p className="text-xs text-secondary-500">
          Gerado em {new Date(lastJob.completedAt).toLocaleString('pt-BR')}
        </p>
      )}
    </div>
  )
}
