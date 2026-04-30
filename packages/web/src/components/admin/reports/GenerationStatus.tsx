'use client'

import type { ReportJob } from '@judging/shared'

interface GenerationStatusProps {
  job: ReportJob | null
  isPolling: boolean
}

export function GenerationStatus({ job, isPolling }: GenerationStatusProps) {
  if (!job && !isPolling) return null

  if (isPolling || job?.status === 'QUEUED' || job?.status === 'PROCESSING') {
    const progress = job?.progress ?? 0
    return (
      <div className="mt-3">
        <div className="flex items-center justify-between text-xs text-secondary-500 mb-1">
          <span>Gerando PDF...</span>
          <span>{progress}%</span>
        </div>
        <div className="w-full bg-secondary-100 rounded-full h-1.5">
          <div
            className="bg-primary-600 h-1.5 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    )
  }

  if (job?.status === 'FAILED') {
    return (
      <p className="mt-2 text-xs text-danger-600">
        Falha: {job.error ?? 'erro desconhecido'}
      </p>
    )
  }

  return null
}
