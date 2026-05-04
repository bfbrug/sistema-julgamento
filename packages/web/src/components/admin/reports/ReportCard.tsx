'use client'

import { useState } from 'react'
import { FileText } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { GenerationStatus } from './GenerationStatus'
import { DownloadButton } from './DownloadButton'
import { useGenerateReport, useJobPolling } from '@/hooks/useReports'
import type { ReportJob, ReportType } from '@judging/shared'

interface ReportCardProps {
  eventId: string
  type: ReportType
  title: string
  description: string
  lastJob: ReportJob | null | undefined
  disabled?: boolean
}

export function ReportCard({ eventId, type, title, description, lastJob, disabled = false }: ReportCardProps) {
  const [activeJobId, setActiveJobId] = useState<string | null>(null)
  const { mutate: generate, isPending } = useGenerateReport(eventId)
  const { job: pollingJob, isPolling } = useJobPolling(eventId, activeJobId)

  const currentJob = pollingJob ?? lastJob ?? null
  const isGenerating = isPending || isPolling

  const handleGenerate = () => {
    generate(
      { type },
      {
        onSuccess: (data) => setActiveJobId(data.jobId),
      },
    )
  }

  return (
    <Card
      body={
        <div className="flex flex-col gap-4 h-full">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-primary-50 text-primary-600 shrink-0">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-semibold text-secondary-900">{title}</h3>
              <p className="text-sm text-secondary-500 mt-1">{description}</p>
            </div>
          </div>

          <GenerationStatus job={currentJob} isPolling={isPolling} />

          <div className="flex gap-2 mt-auto pt-2">
            <Button
              size="sm"
              loading={isGenerating}
              disabled={isGenerating || disabled}
              onClick={handleGenerate}
              className="flex-1"
            >
              Gerar PDF
            </Button>
            <DownloadButton eventId={eventId} type={type} lastJob={lastJob} disabled={disabled} />
          </div>
        </div>
      }
    />
  )
}
