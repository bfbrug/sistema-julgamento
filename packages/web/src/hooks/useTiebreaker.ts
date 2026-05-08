'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/api'
import type { TiebreakerConfig } from '@judging/shared'
import { toast } from 'sonner'

export interface UpdateTiebreakerDto {
  firstCategoryId?: string
  secondCategoryId?: string
}

export function useTiebreaker(eventId: string) {
  return useQuery({
    queryKey: ['events', eventId, 'tiebreaker'],
    queryFn: () => apiClient<TiebreakerConfig>({ method: 'GET', path: `/events/${eventId}/tiebreaker` }),
    enabled: !!eventId,
  })
}

export function useUpdateTiebreaker(eventId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: UpdateTiebreakerDto) =>
      apiClient<TiebreakerConfig, UpdateTiebreakerDto>({ method: 'PUT', path: `/events/${eventId}/tiebreaker`, body: data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events', eventId] })
      queryClient.invalidateQueries({ queryKey: ['events', eventId, 'tiebreaker'] })
      toast.success('Critérios de desempate atualizados!')
    },
    onError: (error: unknown) => {
      toast.error(error instanceof Error ? error.message : 'Erro ao atualizar critérios de desempate.')
    },
  })
}

export function useRemoveTiebreaker(eventId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () => apiClient({ method: 'DELETE', path: `/events/${eventId}/tiebreaker` }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events', eventId] })
      queryClient.invalidateQueries({ queryKey: ['events', eventId, 'tiebreaker'] })
      toast.success('Critérios de desempate removidos.')
    },
    onError: (error: unknown) => {
      toast.error(error instanceof Error ? error.message : 'Erro ao remover critérios de desempate.')
    },
  })
}
