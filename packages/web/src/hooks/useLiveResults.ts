'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/api'
import { toast } from 'sonner'

export interface ResultRelease {
  id: string
  eventId: string
  gender: 'MALE' | 'FEMALE' | null
  position: number
  releasedAt: string
  releasedById: string
}

export interface ReleaseInput {
  gender: 'MALE' | 'FEMALE' | null
  position: number
}

export interface RankEntry {
  participantId: string
  name: string
  totalScore: number
  position: number
}

export interface OverallRanking {
  mode: 'MIXED' | 'MALE_ONLY' | 'FEMALE_ONLY' | 'UNISEX_SPLIT'
  entries?: RankEntry[]
  male?: RankEntry[]
  female?: RankEntry[]
}

export function useFullRanking(eventId: string, enabled: boolean) {
  return useQuery<{ genderMode: string; ranking: OverallRanking }>({
    queryKey: ['results-full', eventId],
    queryFn: () => apiClient<{ genderMode: string; ranking: OverallRanking }>({ method: 'GET', path: `/events/${eventId}/results/full` }),
    enabled: !!eventId && enabled,
  })
}

export function useLiveResults(eventId: string) {
  const qc = useQueryClient()

  const { data: releases = [] } = useQuery<ResultRelease[]>({
    queryKey: ['live-results', eventId],
    queryFn: () => apiClient<ResultRelease[]>({ method: 'GET', path: `/events/${eventId}/results/releases` }),
    enabled: !!eventId,
    refetchInterval: 5000,
  })

  const release = useMutation({
    mutationFn: (input: ReleaseInput) =>
      apiClient<ResultRelease, ReleaseInput>({
        method: 'POST',
        path: `/events/${eventId}/results/releases`,
        body: { gender: input.gender ?? undefined, position: input.position } as any,
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['live-results', eventId] }),
    onError: (error: unknown) => toast.error(error instanceof Error ? error.message : 'Erro ao liberar posição.'),
  })

  const revert = useMutation({
    mutationFn: (releaseId: string) =>
      apiClient({ method: 'DELETE', path: `/events/${eventId}/results/releases/${releaseId}` }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['live-results', eventId] }),
    onError: (error: unknown) => toast.error(error instanceof Error ? error.message : 'Erro ao reverter posição.'),
  })

  return { releases, release, revert }
}
