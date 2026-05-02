'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/api'
import type { JudgeResponse, AddJudgeDto } from '@judging/shared'
import { toast } from 'sonner'

export function useJudges(eventId: string) {
  return useQuery({
    queryKey: ['events', eventId, 'judges'],
    queryFn: () => apiClient<JudgeResponse[]>({ method: 'GET', path: `/events/${eventId}/judges` }),
    enabled: !!eventId,
  })
}

export function useAddJudge(eventId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: AddJudgeDto) =>
      apiClient<JudgeResponse, AddJudgeDto>({ method: 'POST', path: `/events/${eventId}/judges`, body: data }),
    onSuccess: () => {
      // Invalida tanto os jurados do evento quanto a lista de usuários (para o modal de adicionar)
      queryClient.invalidateQueries({ queryKey: ['events', eventId, 'judges'] })
      queryClient.invalidateQueries({ queryKey: ['users'] })
      toast.success('Jurado adicionado ao evento!')
    },
  })
}

export function useRemoveJudge(eventId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (judgeId: string) =>
      apiClient({ method: 'DELETE', path: `/events/${eventId}/judges/${judgeId}` }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events', eventId, 'judges'] })
      toast.success('Jurado removido do evento!')
    },
  })
}

// Bug fix: a rota correta é PUT /judge-matrix com { cells: [{judgeId, categoryId}] }
// A rota anterior POST /judges/assignments não existia na API.
export function useUpdateAssignments(eventId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (assignments: Array<{ judgeId: string; categoryId: string }>) =>
      apiClient({
        method: 'PUT',
        path: `/events/${eventId}/judge-matrix`,
        body: { cells: assignments },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events', eventId, 'judges'] })
      queryClient.invalidateQueries({ queryKey: ['events', eventId, 'judge-matrix'] })
      toast.success('Atribuições salvas com sucesso!')
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Erro ao salvar atribuições.')
    },
  })
}
