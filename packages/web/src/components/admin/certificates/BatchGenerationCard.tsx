'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { useGenerateCertificates, useCertificateJobPolling } from '@/hooks/useCertificates'
import { useAuthStore } from '@/stores/auth.store'
import type { CertificateConfig } from '@judging/shared'
import { FileDown, Loader2 } from 'lucide-react'

interface BatchGenerationCardProps {
  eventId: string
  config: CertificateConfig | null | undefined
  participantCount: number
}

export function BatchGenerationCard({ eventId, config, participantCount }: BatchGenerationCardProps) {
  const [activeJobId, setActiveJobId] = useState<string | null>(null)
  const [isDownloading, setIsDownloading] = useState(false)
  const { mutate: generate, isPending } = useGenerateCertificates(eventId)
  const { job: pollingJob, isPolling } = useCertificateJobPolling(eventId, activeJobId)

  const canGenerate = config?.backgroundPath && config?.certificateText
  const isGenerating = isPending || isPolling

  const handleGenerate = () => {
    generate(undefined, {
      onSuccess: (data) => setActiveJobId(data.jobId),
    })
  }

  const handleDownload = async () => {
    setIsDownloading(true)
    try {
      const { accessToken } = useAuthStore.getState()
      const baseUrl = process.env['NEXT_PUBLIC_API_URL'] ?? ''
      const res = await fetch(`${baseUrl}/events/${eventId}/certificates/download`, {
        headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
      })
      if (!res.ok) throw new Error('Erro ao baixar PDF')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `certificados-${eventId}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } finally {
      setIsDownloading(false)
    }
  }

  const progress = pollingJob?.progress ?? 0

  return (
    <Card
      body={
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-secondary-900">Geração em lote</h3>
              <p className="text-sm text-secondary-500">{participantCount} participantes cadastrados</p>
            </div>
            {pollingJob?.status === 'COMPLETED' && (
              <Button size="sm" variant="secondary" onClick={handleDownload} loading={isDownloading}>
                <FileDown className="h-4 w-4 mr-1" /> Baixar PDF
              </Button>
            )}
          </div>

          {isGenerating && (
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm text-secondary-600">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Gerando certificados... {progress}%</span>
              </div>
              <div className="h-2 w-full rounded-full bg-secondary-100 overflow-hidden">
                <div
                  className="h-full bg-primary-500 transition-all duration-500"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          {!isGenerating && pollingJob?.status === 'FAILED' && (
            <p className="text-sm text-danger-600">Falha na geração: {pollingJob.error ?? 'erro desconhecido'}</p>
          )}

          <Button
            onClick={handleGenerate}
            loading={isGenerating}
            disabled={!canGenerate || isGenerating}
            className="w-full"
          >
            Gerar certificados em PDF
          </Button>

          {!canGenerate && (
            <p className="text-xs text-secondary-500">
              Configure o background e o texto do certificado antes de gerar.
            </p>
          )}
        </div>
      }
    />
  )
}
