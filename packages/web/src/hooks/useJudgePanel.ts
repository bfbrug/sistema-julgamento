'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { io, type Socket } from 'socket.io-client'
import { useAuthStore } from '@/stores/auth.store'
import { apiClient } from '@/lib/api'
import { toast } from 'sonner'
import type { EventStatus } from '@judging/shared'

export type JudgePanelState =
  | 'CONNECTING'
  | 'WAITING'
  | 'PREVIEW'
  | 'SCORING'
  | 'REVIEW'
  | 'FINISHED'
  | 'EVENT_ENDED'

export interface CategoryToScore {
  id: string
  name: string
  displayOrder: number
  currentScore: number | null
}

export interface ActiveParticipant {
  id: string
  name: string
  photoUrl: string | null
  presentationOrder: number
  currentState: string
  myCategoriesToScore: CategoryToScore[]
  mySessionStatus: string
}

export interface JudgeEventInfo {
  id: string
  name: string
  status: EventStatus
  scoreMin: number
  scoreMax: number
  totalParticipants: number
  totalEvaluated: number
}

export interface JudgeStateResponse {
  event: JudgeEventInfo
  activeParticipant: ActiveParticipant | null
  message?: string
}

export function useJudgePanel(eventId: string) {
  const { accessToken } = useAuthStore()
  const socketRef = useRef<Socket | null>(null)
  const [currentState, setCurrentState] = useState<JudgePanelState>('CONNECTING')
  const [currentParticipant, setCurrentParticipant] = useState<ActiveParticipant | null>(null)
  const [eventInfo, setEventInfo] = useState<JudgeEventInfo | null>(null)
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'reconnecting' | 'disconnected'>('reconnecting')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const resolveLocalState = useCallback(
    (state: JudgeStateResponse): JudgePanelState => {
      if (state.event.status === 'FINISHED') return 'EVENT_ENDED'
      if (!state.activeParticipant) return 'WAITING'
      switch (state.activeParticipant.mySessionStatus) {
        case 'FINISHED':
          return 'FINISHED'
        case 'IN_REVIEW':
          return 'REVIEW'
        case 'IN_SCORING':
          return 'SCORING'
        case 'NOT_STARTED':
          // Participant already in SCORING state on server but session not yet updated
          if (state.activeParticipant.currentState === 'SCORING') return 'SCORING'
          return 'PREVIEW'
        default:
          return 'PREVIEW'
      }
    },
    [],
  )

  const isTerminalState = useCallback((state: JudgePanelState) => state === 'EVENT_ENDED', [])

  const fetchStateRef = useRef<() => Promise<void>>(async () => {})

  const fetchState = useCallback(async () => {
    try {
      const state = await apiClient<JudgeStateResponse>({
        method: 'GET',
        path: `/events/${eventId}/scoring/my-state`,
      })
      setEventInfo(state.event)
      setCurrentParticipant(state.activeParticipant)
      setCurrentState((prev) => {
        if (isTerminalState(prev)) return prev
        const next = resolveLocalState(state)
        // Preserve local SCORING/REVIEW if user is actively editing and participant hasn't changed
        if (prev === 'SCORING' && next === 'PREVIEW' && state.activeParticipant?.mySessionStatus === 'IN_SCORING') {
          return 'SCORING'
        }
        if (prev === 'REVIEW' && next === 'SCORING' && state.activeParticipant?.mySessionStatus === 'IN_REVIEW') {
          return 'REVIEW'
        }
        return next
      })
    } catch (error) {
      if (error instanceof Error && error.message.includes('não é jurado')) {
        toast.error('Você não está vinculado a este evento.')
      }
    }
  }, [eventId, resolveLocalState])

  useEffect(() => {
    fetchStateRef.current = fetchState
  }, [fetchState])

  useEffect(() => {
    if (!accessToken || !eventId) return

    const socket = io(`${process.env['NEXT_PUBLIC_WS_URL']}/scoring`, {
      auth: { token: accessToken },
      query: { eventId },
      transports: ['websocket'],
    })

    socketRef.current = socket

    socket.on('connect', () => {
      setConnectionStatus('connected')
      fetchStateRef.current()
    })

    socket.on('disconnect', () => {
      setConnectionStatus('disconnected')
    })

    socket.on('connect_error', () => {
      setConnectionStatus('reconnecting')
    })

    const handleAnyEvent = () => {
      fetchStateRef.current()
    }

    socket.on('participant_activated', handleAnyEvent)
    socket.on('scoring_started', handleAnyEvent)
    socket.on('scores_updated', handleAnyEvent)
    socket.on('judge_confirmed', handleAnyEvent)
    socket.on('judge_revising', handleAnyEvent)
    socket.on('judge_finalized', handleAnyEvent)
    socket.on('participant_finished', handleAnyEvent)
    socket.on('participant_absent', (payload: { participantId?: string }) => {
      if (payload.participantId) {
        toast.info('Participante marcado como ausente')
      }
      handleAnyEvent()
    })
    socket.on('event_state_changed', (payload: { status: string }) => {
      if (payload.status === 'FINISHED') {
        setCurrentState('EVENT_ENDED')
      }
      handleAnyEvent()
    })

    return () => {
      socket.disconnect()
    }
  }, [eventId, accessToken])

  // Polling fallback
  useEffect(() => {
    const interval = setInterval(() => {
      fetchState()
    }, 30000)
    return () => clearInterval(interval)
  }, [fetchState])

  const openScoringForm = useCallback(() => {
    setCurrentState('SCORING')
  }, [])

  const submitScores = useCallback(
    async (values: Record<string, number>) => {
      if (!currentParticipant) return
      setIsSubmitting(true)
      try {
        await apiClient({
          method: 'POST',
          path: `/events/${eventId}/scoring/register/${currentParticipant.id}`,
          body: { scores: Object.entries(values).map(([categoryId, value]) => ({ categoryId, value })) },
        })
        await apiClient({
          method: 'POST',
          path: `/events/${eventId}/scoring/confirm/${currentParticipant.id}`,
        })
        clearDraft(currentParticipant.id)
        setCurrentState('REVIEW')
        await fetchState()
      } catch (error) {
        if (error instanceof Error) {
          toast.error(error.message)
        }
      } finally {
        setIsSubmitting(false)
      }
    },
    [eventId, currentParticipant, fetchState],
  )

  const editScores = useCallback(async () => {
    if (!currentParticipant) return
    setIsSubmitting(true)
    try {
      await apiClient({
        method: 'POST',
        path: `/events/${eventId}/scoring/revise/${currentParticipant.id}`,
      })
      setCurrentState('SCORING')
      await fetchState()
    } catch (error) {
      if (error instanceof Error) {
        toast.error(error.message)
      }
    } finally {
      setIsSubmitting(false)
    }
  }, [eventId, currentParticipant, fetchState])

  const finalizeScores = useCallback(async () => {
    if (!currentParticipant) return
    setIsSubmitting(true)
    try {
      await apiClient({
        method: 'POST',
        path: `/events/${eventId}/scoring/finalize/${currentParticipant.id}`,
      })
      clearDraft(currentParticipant.id)
      setCurrentState('FINISHED')
      await fetchState()
    } catch (error) {
      if (error instanceof Error) {
        toast.error(error.message)
      }
    } finally {
      setIsSubmitting(false)
    }
  }, [eventId, currentParticipant, fetchState])

  const retryConnection = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.connect()
    }
    fetchState()
  }, [fetchState])

  return {
    currentState,
    currentParticipant,
    eventInfo,
    judgeCategories: currentParticipant?.myCategoriesToScore ?? [],
    currentScores: currentParticipant?.myCategoriesToScore.reduce(
      (acc, cat) => {
        if (cat.currentScore !== null) acc[cat.id] = cat.currentScore
        return acc
      },
      {} as Record<string, number>,
    ),
    connectionStatus,
    isSubmitting,
    totalEvaluated: eventInfo?.totalEvaluated ?? 0,
    openScoringForm,
    submitScores,
    editScores,
    finalizeScores,
    retryConnection,
  }
}

function clearDraft(participantId: string) {
  if (typeof window !== 'undefined') {
    sessionStorage.removeItem(`draft:scoring:${participantId}`)
  }
}
