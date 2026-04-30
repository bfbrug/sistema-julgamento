'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { useGenerateCertificates, useCertificateJobPolling } from '@/hooks/useCertificates'
import type { CertificateConfig } from '@judging/shared'
import { FileDown, Loader2 } from 'lucide-react'

interface BatchGenerationCardProps {
  eventId: string
  config: CertificateConfig | null | undefined
  participantCount: number
}

export function BatchGenerationCard({ eventId, config, participantCount }: BatchGenerationCardProps) {
  const [activeJobId, setActiveJobId] = useState<string | null>(null)
  const { mutate: generate, isPending } = useGenerateCertificates(eventId)
  const { job: pollingJob, isPolling } = useCertificateJobPolling(eventId, activeJobId)

  const canGenerate = config?.backgroundPath && config?.certificateText
  const isGenerating = isPending || isPolling

  const handleGenerate = () => {
    generate(undefined, {
      onSuccess: (data) => setActiveJobId(data.jobId),
    })
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
              <a
                href={`${process.env['NEXT_PUBLIC_API_URL']}/events/${eventId}/certificates/download`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button size="sm" variant="secondary">
                  <FileDown className="h-4 w-4 mr-1" /> Baixar PDF
                </Button>
              </a>
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
