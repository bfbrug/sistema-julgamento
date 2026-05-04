'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/api'
import type { EventResponse, CreateEventDto, UpdateEventDto, TransitionEventDto } from '@judging/shared'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

export function useEvents() {
  return useQuery({
    queryKey: ['events'],
    queryFn: () => apiClient<EventResponse[]>({ method: 'GET', path: '/events' }),
  })
}

export function useEvent(id: string) {
  return useQuery({
    queryKey: ['events', id],
    queryFn: () => apiClient<EventResponse>({ method: 'GET', path: `/events/${id}` }),
    enabled: !!id,
  })
}

export function useCreateEvent() {
  const queryClient = useQueryClient()
  const router = useRouter()

  return useMutation({
    mutationFn: (data: CreateEventDto) =>
      apiClient<EventResponse, CreateEventDto>({ method: 'POST', path: '/events', body: data }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['events'] })
      toast.success('Evento criado com sucesso!')
      router.push(`/events/${data.id}`)
    },
  })
}

export function useUpdateEvent(id: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: UpdateEventDto) =>
      apiClient<EventResponse, UpdateEventDto>({ method: 'PATCH', path: `/events/${id}`, body: data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events', id] })
      queryClient.invalidateQueries({ queryKey: ['events'] })
      toast.success('Evento atualizado com sucesso!')
    },
  })
}

export function useDeleteEvent() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => apiClient({ method: 'DELETE', path: `/events/${id}` }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] })
      toast.success('Evento excluído com sucesso!')
    },
  })
}

export function useMyJudgeEvents() {
  return useQuery({
    queryKey: ['my-judge-events'],
    queryFn: () => apiClient<EventResponse[]>({ method: 'GET', path: '/events/my-events' }),
  })
}

export function useTransitionEvent(id: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: TransitionEventDto) =>
      apiClient<EventResponse, TransitionEventDto>({ method: 'POST', path: `/events/${id}/transition`, body: data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events', id] })
      queryClient.invalidateQueries({ queryKey: ['events'] })
      toast.success('Status do evento atualizado com sucesso!')
    },
  })
}
