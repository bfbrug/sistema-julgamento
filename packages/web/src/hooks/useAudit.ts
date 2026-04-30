'use client'

import { useInfiniteQuery, useQuery } from '@tanstack/react-query'
import { apiClient } from '@/lib/api'
import type { ListAuditResponse, ListAuditQuery, AuditLogEntry } from '@judging/shared'

export function useAuditLogs(filters: ListAuditQuery = {}) {
  return useInfiniteQuery({
    queryKey: ['audit', filters],
    queryFn: async ({ pageParam }) => {
      const params = new URLSearchParams()
      if (pageParam) params.set('cursor', pageParam)
      if (filters.limit) params.set('limit', String(filters.limit))
      if (filters.action) params.set('action', filters.action)
      if (filters.actorId) params.set('actorId', filters.actorId)
      if (filters.entityType) params.set('entityType', filters.entityType)
      if (filters.entityId) params.set('entityId', filters.entityId)
      if (filters.startDate) params.set('startDate', filters.startDate)
      if (filters.endDate) params.set('endDate', filters.endDate)

      const query = params.toString()
      return apiClient<ListAuditResponse>({
        method: 'GET',
        path: `/audit${query ? `?${query}` : ''}`,
      })
    },
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    initialPageParam: undefined as string | undefined,
  })
}

export function useEventAuditLogs(eventId: string, filters: Omit<ListAuditQuery, 'entityId'> = {}) {
  return useInfiniteQuery({
    queryKey: ['audit', 'events', eventId, filters],
    queryFn: async ({ pageParam }) => {
      const params = new URLSearchParams()
      if (pageParam) params.set('cursor', pageParam)
      if (filters.limit) params.set('limit', String(filters.limit))
      if (filters.action) params.set('action', filters.action)
      if (filters.actorId) params.set('actorId', filters.actorId)
      if (filters.entityType) params.set('entityType', filters.entityType)
      if (filters.startDate) params.set('startDate', filters.startDate)
      if (filters.endDate) params.set('endDate', filters.endDate)

      const query = params.toString()
      return apiClient<ListAuditResponse>({
        method: 'GET',
        path: `/audit/events/${eventId}${query ? `?${query}` : ''}`,
      })
    },
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    initialPageParam: undefined as string | undefined,
    enabled: !!eventId,
  })
}

export function useAuditLog(id: string) {
  return useQuery({
    queryKey: ['audit', id],
    queryFn: () => apiClient<AuditLogEntry>({ method: 'GET', path: `/audit/${id}` }),
    enabled: !!id,
  })
}
