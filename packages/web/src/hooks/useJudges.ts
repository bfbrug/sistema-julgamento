'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/api'
import type { JudgeResponse, AddJudgeDto, JudgeCategoryAssignmentDto } from '@judging/shared'
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
      queryClient.invalidateQueries({ queryKey: ['events', eventId, 'judges'] })
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

export function useUpdateAssignments(eventId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (assignments: JudgeCategoryAssignmentDto[]) =>
      apiClient({ method: 'POST', path: `/events/${eventId}/judges/assignments`, body: { assignments } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events', eventId, 'judges'] })
      toast.success('Atribuições salvas com sucesso!')
    },
  })
}
