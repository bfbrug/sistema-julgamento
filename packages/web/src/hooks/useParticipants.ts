'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/api'
import type { ParticipantResponse, CreateParticipantDto, UpdateParticipantDto } from '@judging/shared'
import { toast } from 'sonner'

export function useParticipants(eventId: string) {
  return useQuery({
    queryKey: ['events', eventId, 'participants'],
    queryFn: () => apiClient<ParticipantResponse[]>({ method: 'GET', path: `/events/${eventId}/participants` }),
    enabled: !!eventId,
  })
}

export function useCreateParticipant(eventId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: CreateParticipantDto) =>
      apiClient<ParticipantResponse, CreateParticipantDto>({ method: 'POST', path: `/events/${eventId}/participants`, body: data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events', eventId, 'participants'] })
      toast.success('Participante cadastrado!')
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Erro ao cadastrar participante.')
    },
  })
}

export function useUpdateParticipant(eventId: string, participantId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: UpdateParticipantDto) =>
      apiClient<ParticipantResponse, UpdateParticipantDto>({ method: 'PATCH', path: `/events/${eventId}/participants/${participantId}`, body: data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events', eventId, 'participants'] })
      toast.success('Participante atualizado!')
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Erro ao atualizar participante.')
    },
  })
}

export function useDeleteParticipant(eventId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (participantId: string) =>
      apiClient({ method: 'DELETE', path: `/events/${eventId}/participants/${participantId}` }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events', eventId, 'participants'] })
      toast.success('Participante excluído!')
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Erro ao excluir participante.')
    },
  })
}

export function useReorderParticipants(eventId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (participantIds: string[]) =>
      apiClient({ method: 'POST', path: `/events/${eventId}/participants/reorder`, body: { participantIds } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events', eventId, 'participants'] })
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Erro ao reordenar participantes.')
    },
  })
}

export function useShuffleParticipants(eventId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () => apiClient({ method: 'POST', path: `/events/${eventId}/participants/shuffle` }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events', eventId, 'participants'] })
      toast.success('Ordem sorteada aleatoriamente!')
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Erro ao sortear ordem.')
    },
  })
}
