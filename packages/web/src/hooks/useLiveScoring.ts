'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { io, Socket } from 'socket.io-client'
import { useAuthStore } from '@/stores/auth.store'
import { toast } from 'sonner'
import { apiClient } from '@/lib/api'

export function useLiveScoring(eventId: string) {
  const { accessToken } = useAuthStore()
  const socketRef = useRef<Socket | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [liveState, setLiveState] = useState<any>(null)

  const fetchState = useCallback(async () => {
    try {
      const state = await apiClient({ method: 'GET', path: `/scoring/events/${eventId}/state` })
      setLiveState(state)
    } catch (error) {
      console.error('Failed to fetch live state', error)
    }
  }, [eventId])

  useEffect(() => {
    if (!accessToken || !eventId) return

    const socket = io(`${process.env.NEXT_PUBLIC_API_URL}/scoring`, {
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

    socket.on('participant_activated', (payload) => {
      setLiveState((prev: any) => ({ ...prev, currentParticipant: payload }))
      toast.info(`Participante ${payload.name} ativado!`)
    })

    socket.on('participant_state_changed', (payload) => {
      setLiveState((prev: any) => ({
        ...prev,
        currentParticipant: { ...prev.currentParticipant, status: payload.status }
      }))
    })

    socket.on('judge_status_updated', (payload) => {
      setLiveState((prev: any) => {
        if (!prev) return prev
        const updatedJudges = prev.judges.map((j: any) => 
          j.id === payload.judgeId ? { ...j, status: payload.status, progress: payload.progress } : j
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
        path: `/scoring/events/${eventId}/activate`,
        body: { participantId },
      })
    } catch (error: any) {
      toast.error(error.message || 'Erro ao ativar participante.')
    }
  }

  const markAbsent = async (participantId: string) => {
    try {
      await apiClient({
        method: 'POST',
        path: `/scoring/events/${eventId}/absent`,
        body: { participantId },
      })
      fetchState()
    } catch (error: any) {
      toast.error(error.message || 'Erro ao marcar ausência.')
    }
  }

  return {
    isConnected,
    liveState,
    activateParticipant,
    markAbsent,
    refresh: fetchState,
  }
}
