'use client'

import { useState } from 'react'
import { Download } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { apiClient } from '@/lib/api'
import type { ReportJob, ReportType } from '@judging/shared'

interface DownloadButtonProps {
  eventId: string
  type: ReportType
  lastJob: ReportJob | null | undefined
  disabled?: boolean
}

export function DownloadButton({ eventId, type, lastJob, disabled = false }: DownloadButtonProps) {
  const [isDownloading, setIsDownloading] = useState(false)
  const hasCompleted = lastJob?.status === 'COMPLETED'

  const handleDownload = async () => {
    if (!hasCompleted) return
    setIsDownloading(true)
    try {
      const blob = await apiClient<Blob>({
        method: 'GET',
        path: `/events/${eventId}/reports/${type.toLowerCase()}/download`,
        responseType: 'blob',
      })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${type.toLowerCase()}-${eventId}.pdf`
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.URL.revokeObjectURL(url)
    } catch {
      alert('Erro ao baixar o relatório. Tente gerar novamente.')
    } finally {
      setIsDownloading(false)
    }
  }

  return (
    <div className="flex flex-col gap-1">
      <Button
        variant="secondary"
        size="sm"
        disabled={!hasCompleted || isDownloading || disabled}
        loading={isDownloading}
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
