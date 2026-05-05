'use client'

import { useState, useEffect, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient, apiUpload } from '@/lib/api'
import type {
  CertificateConfig,
  UpdateCertificateConfigRequest,
  UpdateCertificateConfigResponse,
  UploadBackgroundResponse,
  AddSignatureResponse,
  UpdateSignatureRequest,
  GenerateBatchResponse,
  ReportJob,
} from '@judging/shared'
import { toast } from 'sonner'

export function useCertificateConfig(eventId: string) {
  return useQuery({
    queryKey: ['certificates', 'config', eventId],
    queryFn: () => apiClient<CertificateConfig>({ method: 'GET', path: `/events/${eventId}/certificates/config` }),
    enabled: !!eventId,
  })
}

export function useUpdateCertificateText(eventId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: UpdateCertificateConfigRequest) =>
      apiClient<UpdateCertificateConfigResponse, UpdateCertificateConfigRequest>({
        method: 'PUT',
        path: `/events/${eventId}/certificates/config`,
        body: data,
      }),
    onSuccess: (data) => {
      if (data.warnings?.length) toast.warning('Placeholders desconhecidos detectados')
      else toast.success('Texto salvo')
      queryClient.invalidateQueries({ queryKey: ['certificates', 'config', eventId] })
    },
    onError: () => toast.error('Erro ao salvar texto'),
  })
}

export function useUploadBackground(eventId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData()
      formData.append('file', file)
      return apiUpload<UploadBackgroundResponse>(`/events/${eventId}/certificates/background`, formData)
    },
    onSuccess: () => {
      toast.success('Background enviado')
      queryClient.invalidateQueries({ queryKey: ['certificates', 'config', eventId] })
    },
    onError: (err: Error) => toast.error(err.message),
  })
}

export function useRemoveBackground(eventId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () =>
      apiClient<void>({ method: 'DELETE', path: `/events/${eventId}/certificates/background` }),
    onSuccess: () => {
      toast.success('Background removido')
      queryClient.invalidateQueries({ queryKey: ['certificates', 'config', eventId] })
    },
    onError: () => toast.error('Erro ao remover background'),
  })
}

export function useAddSignature(eventId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (payload: { file: File; personName: string; personRole: string; displayOrder: number }) => {
      const formData = new FormData()
      formData.append('file', payload.file)
      formData.append('personName', payload.personName)
      formData.append('personRole', payload.personRole)
      formData.append('displayOrder', String(payload.displayOrder))
      return apiUpload<AddSignatureResponse>(`/events/${eventId}/certificates/signatures`, formData)
    },
    onSuccess: () => {
      toast.success('Assinatura adicionada')
      queryClient.invalidateQueries({ queryKey: ['certificates', 'config', eventId] })
    },
    onError: (err: Error) => toast.error(err.message),
  })
}

export function useUpdateSignature(eventId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateSignatureRequest }) =>
      apiClient<void, UpdateSignatureRequest>({
        method: 'PUT',
        path: `/events/${eventId}/certificates/signatures/${id}`,
        body: data,
      }),
    onSuccess: () => {
      toast.success('Assinatura atualizada')
      queryClient.invalidateQueries({ queryKey: ['certificates', 'config', eventId] })
    },
    onError: () => toast.error('Erro ao atualizar assinatura'),
  })
}

export function useRemoveSignature(eventId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      apiClient<void>({ method: 'DELETE', path: `/events/${eventId}/certificates/signatures/${id}` }),
    onSuccess: () => {
      toast.success('Assinatura removida')
      queryClient.invalidateQueries({ queryKey: ['certificates', 'config', eventId] })
    },
    onError: () => toast.error('Erro ao remover assinatura'),
  })
}

export function useGenerateCertificates(eventId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () =>
      apiClient<GenerateBatchResponse>({
        method: 'POST',
        path: `/events/${eventId}/certificates/generate`,
      }),
    onSuccess: (data) => {
      toast.success('Geração de certificados iniciada')
      queryClient.invalidateQueries({ queryKey: ['certificates', 'jobs', eventId] })
      return data
    },
    onError: () => toast.error('Erro ao iniciar geração'),
  })
}

export function useCertificateJobPolling(eventId: string, jobId: string | null) {
  const [job, setJob] = useState<ReportJob | null>(null)
  const [isPolling, setIsPolling] = useState(false)
  const queryClient = useQueryClient()

  const poll = useCallback(async () => {
    if (!jobId) return
    try {
      const result = await apiClient<ReportJob>({
        method: 'GET',
        path: `/events/${eventId}/certificates/jobs/${jobId}`,
      })
      setJob(result)
      if (result.status === 'COMPLETED' || result.status === 'FAILED') {
        setIsPolling(false)
        queryClient.invalidateQueries({ queryKey: ['certificates', 'jobs', eventId] })
        if (result.status === 'FAILED') toast.error(`Geração falhou: ${result.error ?? 'erro desconhecido'}`)
        else toast.success('Certificados gerados com sucesso!')
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
