import { useEffect, useRef, useState, useCallback } from 'react'
import { io, Socket } from 'socket.io-client'
import { publicApiClient } from '@/lib/public-api'

export interface PublicEventInfo {
  id: string
  name: string
  eventDate: string
  location: string
  organizer: string
  status: string
  topN: number
}

export interface PublicParticipant {
  id: string
  name: string
  photoPath: string | null
  presentationOrder: number
  currentState: string
}

export interface UpcomingParticipant {
  name: string
  presentationOrder: number
}

export interface JudgesProgress {
  finished: number
  total: number
}

export interface FinalRankingItem {
  position: number
  participantName: string
  finalScore: number
}

export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'reconnecting'

export interface PublicLivePanelState {
  eventInfo: PublicEventInfo | null
  currentParticipant: PublicParticipant | null
  judgesProgress: JudgesProgress
  completedCount: number
  totalCount: number
  upcomingParticipants: UpcomingParticipant[]
  status: string
  finalResults: FinalRankingItem[] | null
  connectionStatus: ConnectionStatus
  error: string | null
}

export function usePublicLivePanel(eventId: string): PublicLivePanelState {
  const socketRef = useRef<Socket | null>(null)
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const reloadTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [eventInfo, setEventInfo] = useState<PublicEventInfo | null>(null)
  const [currentParticipant, setCurrentParticipant] = useState<PublicParticipant | null>(null)
  const [judgesProgress, setJudgesProgress] = useState<JudgesProgress>({ finished: 0, total: 0 })
  const [completedCount, setCompletedCount] = useState(0)
  const [totalCount, setTotalCount] = useState(0)
  const [upcomingParticipants, setUpcomingParticipants] = useState<UpcomingParticipant[]>([])
  const [status, setStatus] = useState<string>('')
  const [finalResults, setFinalResults] = useState<FinalRankingItem[] | null>(null)
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('connecting')
  const [error, setError] = useState<string | null>(null)

  const fetchInitialState = useCallback(async () => {
    try {
      const [eventData, liveState] = await Promise.all([
        publicApiClient<PublicEventInfo>(`/api/public/events/${eventId}`),
        publicApiClient<{
          status: string
          currentParticipant: PublicParticipant | null
          totalParticipants: number
          completedParticipants: number
          totalJudges: number
          judgesFinishedCurrentParticipant: number
          upcomingParticipants: UpcomingParticipant[]
        }>(`/api/public/events/${eventId}/live-state`),
      ])

      setEventInfo(eventData)
      setStatus(liveState.status)
      setCurrentParticipant(liveState.currentParticipant)
      setTotalCount(liveState.totalParticipants)
      setCompletedCount(liveState.completedParticipants)
      setJudgesProgress({
        finished: liveState.judgesFinishedCurrentParticipant,
        total: liveState.totalJudges,
      })
      setUpcomingParticipants(liveState.upcomingParticipants)

      if (liveState.status === 'FINISHED') {
        const results = await publicApiClient<{ ranking: FinalRankingItem[] }>(
          `/api/public/events/${eventId}/final-results`,
        )
        setFinalResults(results.ranking)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar dados do evento')
    }
  }, [eventId])

  const fetchFinalResults = useCallback(async () => {
    try {
      const results = await publicApiClient<{ ranking: FinalRankingItem[] }>(
        `/api/public/events/${eventId}/final-results`,
      )
      setFinalResults(results.ranking)
    } catch {
      setFinalResults([])
    }
  }, [eventId])

  useEffect(() => {
    void fetchInitialState()

    const socket = io(`${process.env['NEXT_PUBLIC_API_URL']}/public-live`, {
      query: { eventId },
      transports: ['websocket'],
    })
    socketRef.current = socket

    socket.on('connect', () => {
      setConnectionStatus('connected')
      void fetchInitialState()
      if (reloadTimerRef.current) {
        clearTimeout(reloadTimerRef.current)
        reloadTimerRef.current = null
      }
    })

    socket.on('disconnect', () => {
      setConnectionStatus('disconnected')
      if (!reloadTimerRef.current) {
        reloadTimerRef.current = setTimeout(() => {
          window.location.reload()
        }, 30000)
      }
    })

    socket.on('connect_error', () => {
      setConnectionStatus('reconnecting')
    })

    socket.on('public_participant_activated', (payload: PublicParticipant) => {
      setCurrentParticipant(payload)
      setJudgesProgress({ finished: 0, total: judgesProgress.total })
    })

    socket.on('public_participant_state_changed', (payload: { state: string }) => {
      setCurrentParticipant((prev) => (prev ? { ...prev, currentState: payload.state } : null))
      if (payload.state === 'FINISHED' || payload.state === 'ABSENT') {
        setCompletedCount((prev) => prev + 1)
      }
    })

    socket.on('public_judges_progress', (payload: JudgesProgress) => {
      setJudgesProgress(payload)
    })

    socket.on('public_event_state_changed', (payload: { status: string }) => {
      setStatus(payload.status)
    })

    socket.on('public_event_finished', () => {
      setStatus('FINISHED')
      void fetchFinalResults()
    })

    return () => {
      socket.disconnect()
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current)
      if (reloadTimerRef.current) clearTimeout(reloadTimerRef.current)
    }
  }, [eventId, fetchInitialState, fetchFinalResults])

  return {
    eventInfo,
    currentParticipant,
    judgesProgress,
    completedCount,
    totalCount,
    upcomingParticipants,
    status,
    finalResults,
    connectionStatus,
    error,
  }
}
