'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { io, Socket } from 'socket.io-client'
import { useAuthStore } from '@/stores/auth.store'
import { toast } from 'sonner'
import { apiClient } from '@/lib/api'

interface JudgeState {
  id: string
  name: string
  status: string
  progress: number
}

interface ParticipantState {
  id: string
  name: string
  status: string
  presentationOrder: number
  photoUrl?: string
}

interface QueueItem {
  id: string
  name: string
  status: string
  presentationOrder: number
  photoUrl?: string
}

interface LiveState {
  currentParticipant: ParticipantState | null
  judges: JudgeState[]
  queue: QueueItem[]
}

export function useLiveScoring(eventId: string) {
  const { accessToken } = useAuthStore()
  const socketRef = useRef<Socket | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [liveState, setLiveState] = useState<LiveState | null>(null)

  const fetchState = useCallback(async () => {
    try {
      const state = await apiClient<{
        judges: Array<{ id: string; displayName?: string; name?: string; status?: string }>
        activeParticipant: { id: string; name: string; currentState: string; presentationOrder: number; photoUrl?: string } | null
        participants: Array<{ id: string; name: string; currentState: string; presentationOrder: number; photoUrl?: string }>
      }>({ method: 'GET', path: `/events/${eventId}/scoring/state` })

      const judges: JudgeState[] = (state.judges || []).map((j) => ({
        id: j.id,
        name: j.displayName || j.name || 'Jurado',
        status: j.status ?? 'NOT_STARTED',
        progress: j.status === 'FINISHED' ? 1 : j.status === 'IN_REVIEW' ? 0.5 : j.status === 'IN_SCORING' ? 0.25 : 0,
      }))

      setLiveState((prev: LiveState | null) => {
        const existingJudges = prev?.judges ?? []
        const mergedJudges = judges.map((j: JudgeState) => {
          const existing = existingJudges.find((ej: JudgeState) => ej.id === j.id)
          return existing ? existing : j
        })

        return {
          currentParticipant: state.activeParticipant
            ? {
                id: state.activeParticipant.id,
                name: state.activeParticipant.name,
                status: state.activeParticipant.currentState,
                presentationOrder: state.activeParticipant.presentationOrder,
                photoUrl: state.activeParticipant.photoUrl,
              }
            : null,
          queue: (state.participants || []).map((p) => ({
            id: p.id,
            name: p.name,
            status: p.currentState,
            presentationOrder: p.presentationOrder,
            photoUrl: p.photoUrl,
          })),
          judges: mergedJudges,
        }
      })
    } catch (error) {
      console.error('Failed to fetch live state', error)
    }
  }, [eventId])

  useEffect(() => {
    if (!accessToken || !eventId) return

    const socket = io(`${process.env.NEXT_PUBLIC_WS_URL}/scoring`, {
      auth: { token: accessToken },
      query: { eventId },
      transports: ['websocket'],
    })

    socketRef.current = socket

    socket.on('connect', () => {
      setIsConnected(true)
      fetchState()
    })

    socket.on('disconnect', () => {
      setIsConnected(false)
    })

    socket.on('participant_activated', (payload: { participantName: string }) => {
      toast.info(`Participante ${payload.participantName} ativado!`)
      fetchState()
    })

    socket.on('scoring_started', () => {
      setLiveState((prev) => prev ? {
        ...prev,
        judges: prev.judges.map((j) => ({ ...j, status: 'IN_SCORING', progress: 0.1 }))
      } : prev)
      fetchState()
    })

    socket.on('participant_state_changed', (payload: { status: string }) => {
      setLiveState((prev: LiveState | null) => {
        if (!prev?.currentParticipant) return prev
        return {
          ...prev,
          currentParticipant: { ...prev.currentParticipant, status: payload.status }
        }
      })
    })

    socket.on('judge_confirmed', (payload: { judgeId: string; judgeDisplayName: string; status: string }) => {
      setLiveState((prev: LiveState | null) => {
        if (!prev) return prev
        const updatedJudges = prev.judges.map((j: JudgeState) =>
          j.id === payload.judgeId ? { ...j, status: payload.status, progress: 0.5 } : j
        )
        return { ...prev, judges: updatedJudges }
      })
    })

    socket.on('judge_revising', (payload: { judgeId: string; judgeDisplayName: string; status: string }) => {
      setLiveState((prev: LiveState | null) => {
        if (!prev) return prev
        const updatedJudges = prev.judges.map((j: JudgeState) =>
          j.id === payload.judgeId ? { ...j, status: payload.status, progress: 0.75 } : j
        )
        return { ...prev, judges: updatedJudges }
      })
    })

    socket.on('judge_finalized', (payload: { judgeId: string; judgeDisplayName: string; status: string }) => {
      setLiveState((prev: LiveState | null) => {
        if (!prev) return prev
        const updatedJudges = prev.judges.map((j: JudgeState) =>
          j.id === payload.judgeId ? { ...j, status: 'FINISHED', progress: 1 } : j
        )
        return { ...prev, judges: updatedJudges }
      })
    })

    socket.on('participant_finished', () => {
      toast.success('Todos os jurados finalizaram a avaliação!')
      fetchState()
    })

    return () => {
      socket.disconnect()
    }
  }, [eventId, accessToken, fetchState])

  const activateParticipant = async (participantId: string) => {
    try {
      await apiClient({
        method: 'POST',
        path: `/events/${eventId}/scoring/activate/${participantId}`,
      })
    } catch (error) {
      const msg = error instanceof Error ? error.message : ''
      if (!msg.includes('PARTICIPANT_ALREADY_ACTIVE') && !msg.includes('já existe')) {
        toast.error(msg || 'Erro ao ativar participante.')
        return
      }
    }
    try {
      await apiClient({
        method: 'POST',
        path: `/events/${eventId}/scoring/start/${participantId}`,
      })
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao iniciar apresentação.')
    }
  }

  const markAbsent = async (participantId: string) => {
    try {
      await apiClient({
        method: 'POST',
        path: `/events/${eventId}/scoring/mark-absent/${participantId}`,
      })
      fetchState()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao marcar ausência.')
    }
  }

  const startScoring = async (participantId: string) => {
    try {
      await apiClient({
        method: 'POST',
        path: `/events/${eventId}/scoring/start/${participantId}`,
      })
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao iniciar apresentação.')
    }
  }

  return {
    isConnected,
    liveState,
    activateParticipant,
    startScoring,
    markAbsent,
    refresh: fetchState,
  }
}
