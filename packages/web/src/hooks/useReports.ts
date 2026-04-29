'use client'

import { useState, useEffect, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/api'
import type { ReportJob, GenerateReportRequest, GenerateReportResponse, ReportType } from '@judging/shared'
import { toast } from 'sonner'

export function useReportJobs(eventId: string) {
  return useQuery({
    queryKey: ['reports', eventId],
    queryFn: () => apiClient<Record<ReportType, ReportJob | null>>({
      method: 'GET',
      path: `/events/${eventId}/reports`,
    }),
    enabled: !!eventId,
  })
}

export function useGenerateReport(eventId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: GenerateReportRequest) =>
      apiClient<GenerateReportResponse, GenerateReportRequest>({
        method: 'POST',
        path: `/events/${eventId}/reports/generate`,
        body: data,
      }),
    onSuccess: (data) => {
      if (data.warning) toast.warning(data.warning)
      else toast.success('Geração de relatório iniciada')
      queryClient.invalidateQueries({ queryKey: ['reports', eventId] })
    },
    onError: () => toast.error('Erro ao iniciar geração do relatório'),
  })
}

export function useJobPolling(eventId: string, jobId: string | null) {
  const [job, setJob] = useState<ReportJob | null>(null)
  const [isPolling, setIsPolling] = useState(false)
  const queryClient = useQueryClient()

  const poll = useCallback(async () => {
    if (!jobId) return
    try {
      const result = await apiClient<ReportJob>({
        method: 'GET',
        path: `/events/${eventId}/reports/jobs/${jobId}`,
      })
      setJob(result)
      if (result.status === 'completed' || result.status === 'failed') {
        setIsPolling(false)
        queryClient.invalidateQueries({ queryKey: ['reports', eventId] })
        if (result.status === 'failed') toast.error(`Geração falhou: ${result.error ?? 'erro desconhecido'}`)
        else toast.success('Relatório gerado com sucesso!')
      }
    } catch {
      setIsPolling(false)
    }
  }, [jobId, eventId, queryClient])

  useEffect(() => {
    if (!jobId) return
    setIsPolling(true)
    const interval = setInterval(poll, 2000)
    return () => clearInterval(interval)
  }, [jobId, poll])

  return { job, isPolling }
}
