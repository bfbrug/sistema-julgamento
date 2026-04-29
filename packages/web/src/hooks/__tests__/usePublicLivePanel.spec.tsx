import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { usePublicLivePanel, FinalRankingItem } from '../usePublicLivePanel'
import { io } from 'socket.io-client'
import { publicApiClient } from '@/lib/public-api'

const mSocket = {
  on: vi.fn(),
  off: vi.fn(),
  disconnect: vi.fn(),
}

vi.mock('socket.io-client', () => ({
  io: vi.fn(() => mSocket),
}))

vi.mock('@/lib/public-api', () => ({
  publicApiClient: vi.fn(),
}))

describe('usePublicLivePanel', () => {
  const eventId = 'event-1'

  const makeEventInfo = () => ({
    id: eventId,
    name: 'Evento Teste',
    eventDate: '2026-12-15T00:00:00.000Z',
    location: 'Auditório',
    organizer: 'Org',
    status: 'IN_PROGRESS',
    topN: 3,
  })

  const makeLiveState = () => ({
    status: 'IN_PROGRESS',
    currentParticipant: {
      id: 'p1',
      name: 'Maria',
      photoPath: null,
      presentationOrder: 1,
      currentState: 'SCORING',
    },
    totalParticipants: 5,
    completedParticipants: 1,
    totalJudges: 3,
    judgesFinishedCurrentParticipant: 1,
    upcomingParticipants: [
      { name: 'João', presentationOrder: 2 },
      { name: 'Ana', presentationOrder: 3 },
    ],
  })

  beforeEach(() => {
    vi.clearAllMocks()
    mSocket.on.mockClear()
    mSocket.off.mockClear()
    mSocket.disconnect.mockClear()
  })

  it('conecta sem token', () => {
    vi.mocked(publicApiClient).mockResolvedValue({})
    renderHook(() => usePublicLivePanel(eventId))

    expect(io).toHaveBeenCalledWith(
      expect.stringContaining('/public-live'),
      expect.objectContaining({
        query: { eventId },
        transports: ['websocket'],
      }),
    )
  })

  it('carrega estado inicial via REST', async () => {
    vi.mocked(publicApiClient)
      .mockResolvedValueOnce(makeEventInfo())
      .mockResolvedValueOnce(makeLiveState())

    const { result } = renderHook(() => usePublicLivePanel(eventId))

    await waitFor(() => expect(result.current.eventInfo).not.toBeNull())
    expect(result.current.eventInfo?.name).toBe('Evento Teste')
    expect(result.current.currentParticipant?.name).toBe('Maria')
    expect(result.current.totalCount).toBe(5)
  })

  it('atualiza em public_participant_activated', async () => {
    vi.mocked(publicApiClient)
      .mockResolvedValueOnce(makeEventInfo())
      .mockResolvedValueOnce(makeLiveState())

    const { result } = renderHook(() => usePublicLivePanel(eventId))
    await waitFor(() => expect(result.current.eventInfo).not.toBeNull())

    const handler = getHandler('public_participant_activated')
    handler?.({ id: 'p2', name: 'Carlos', photoPath: null, presentationOrder: 2, currentState: 'PREVIEW' })

    await waitFor(() => expect(result.current.currentParticipant?.name).toBe('Carlos'))
  })

  it('atualiza progresso de jurados em public_judges_progress', async () => {
    vi.mocked(publicApiClient)
      .mockResolvedValueOnce(makeEventInfo())
      .mockResolvedValueOnce(makeLiveState())

    const { result } = renderHook(() => usePublicLivePanel(eventId))
    await waitFor(() => expect(result.current.eventInfo).not.toBeNull())

    const handler = getHandler('public_judges_progress')
    handler?.({ finished: 2, total: 3 })

    await waitFor(() => expect(result.current.judgesProgress.finished).toBe(2))
  })

  it('transita para final em public_event_finished e busca final-results', async () => {
    vi.mocked(publicApiClient)
      .mockResolvedValueOnce(makeEventInfo())
      .mockResolvedValueOnce(makeLiveState())
      .mockResolvedValueOnce({ ranking: [{ position: 1, participantName: 'Maria', finalScore: 9.5 }] })

    const { result } = renderHook(() => usePublicLivePanel(eventId))
    await waitFor(() => expect(result.current.eventInfo).not.toBeNull())

    const handler = getHandler('public_event_finished')
    handler?.()

    await waitFor(() => expect(result.current.status).toBe('FINISHED'))
    await waitFor(() => expect(result.current.finalResults).not.toBeNull())
    const first = (result.current.finalResults as FinalRankingItem[])[0]!
    expect(first.participantName).toBe('Maria')
  })

  it('reconnect automático configura socket', () => {
    vi.mocked(publicApiClient).mockResolvedValue({})
    renderHook(() => usePublicLivePanel(eventId))

    const disconnectHandler = getHandler('disconnect')
    disconnectHandler?.()

    expect(io).toHaveBeenCalled()
  })
})

function getHandler(event: string) {
  const calls = mSocket.on.mock.calls as [string, (...args: unknown[]) => void][]
  const found = calls.find((call) => call[0] === event)
  return found?.[1]
}
