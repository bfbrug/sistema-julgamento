'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { io, Socket } from 'socket.io-client'
import { publicApiClient } from '@/lib/public-api'

export type GenderMode = 'MIXED' | 'MALE_ONLY' | 'FEMALE_ONLY' | 'UNISEX_SPLIT'

import type { TiebreakerInfo } from '@judging/shared'

export interface ReleasedEntry {
  position: number
  participantId: string
  name: string
  totalScore: number
  tiebreaker: TiebreakerInfo | null
}

export interface PublicResults {
  eventGenderMode: GenderMode
  released: {
    MIXED?: ReleasedEntry[]
    MALE?: ReleasedEntry[]
    FEMALE?: ReleasedEntry[]
  }
}

export function usePublicResults(eventId: string) {
  const [data, setData] = useState<PublicResults | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const socketRef = useRef<Socket | null>(null)

  const fetchResults = useCallback(async () => {
    try {
      const res = await publicApiClient<PublicResults>(`/api/public/events/${eventId}/results`)
      setData(res)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar resultados')
    } finally {
      setLoading(false)
    }
  }, [eventId])

  useEffect(() => {
    void fetchResults()

    const socket = io(`${process.env['NEXT_PUBLIC_WS_URL']}/public-live`, {
      query: { eventId },
      transports: ['websocket'],
    })
    socketRef.current = socket

    socket.on('result:released', () => void fetchResults())
    socket.on('result:unreleased', () => void fetchResults())

    return () => {
      socket.disconnect()
    }
  }, [eventId, fetchResults])

  return { data, loading, error }
}
