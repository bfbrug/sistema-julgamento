import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useJudgePanel } from '../useJudgePanel'
import 'socket.io-client'
import { apiClient } from '@/lib/api'

const mSocket = {
  on: vi.fn(),
  off: vi.fn(),
  disconnect: vi.fn(),
  connect: vi.fn(),
  emit: vi.fn(),
}

vi.mock('socket.io-client', () => ({
  io: vi.fn(() => mSocket),
}))

vi.mock('@/lib/api', () => ({
  apiClient: vi.fn(),
}))

vi.mock('@/stores/auth.store', () => ({
  useAuthStore: vi.fn(() => ({
    accessToken: 'test-token',
  })),
}))

describe('useJudgePanel', () => {
  const eventId = 'event-1'

  const makeState = (overrides: Partial<Parameters<typeof vi.mocked>[0]> = {}) => ({
    event: { id: eventId, name: 'Evento', status: 'IN_PROGRESS', scoreMin: 0, scoreMax: 10 },
    activeParticipant: null,
    message: 'Aguardando próximo participante',
    ...overrides,
  })

  const makeParticipant = (sessionStatus: string) => ({
    id: 'p1',
    name: 'Ana',
    photoUrl: null,
    presentationOrder: 1,
    currentState: 'PREVIEW',
    myCategoriesToScore: [{ id: 'c1', name: 'Criatividade', displayOrder: 1, currentScore: null }],
    mySessionStatus: sessionStatus,
  })

  beforeEach(() => {
    vi.clearAllMocks()
    sessionStorage.clear()
    mSocket.on.mockClear()
    mSocket.off.mockClear()
    mSocket.disconnect.mockClear()
    mSocket.connect.mockClear()
  })

  it('estado inicial é CONNECTING', () => {
    const { result } = renderHook(() => useJudgePanel(eventId))
    expect(result.current.currentState).toBe('CONNECTING')
  })

  it('após conexão e fetch: WAITING se sem participante', async () => {
    vi.mocked(apiClient).mockResolvedValue(makeState())
    const { result } = renderHook(() => useJudgePanel(eventId))

    const connectHandler = getHandler('connect')
    connectHandler?.()

    await waitFor(() => expect(result.current.currentState).toBe('WAITING'))
  })

  it('após conexão e fetch: PREVIEW se há participante em NOT_STARTED', async () => {
    vi.mocked(apiClient).mockResolvedValue(makeState({ activeParticipant: makeParticipant('NOT_STARTED') }))
    const { result } = renderHook(() => useJudgePanel(eventId))

    const connectHandler = getHandler('connect')
    connectHandler?.()

    await waitFor(() => expect(result.current.currentState).toBe('PREVIEW'))
  })

  it('participant_activated muda para PREVIEW', async () => {
    let getResponse = makeState()
    vi.mocked(apiClient).mockImplementation(async (options: { method: string; path: string }) => {
      if (options.method === 'GET') return getResponse
      return {}
    })

    const { result } = renderHook(() => useJudgePanel(eventId))
    const connectHandler = getHandler('connect')
    connectHandler?.()
    await waitFor(() => expect(result.current.currentState).toBe('WAITING'))

    getResponse = makeState({ activeParticipant: makeParticipant('NOT_STARTED') })
    const activatedHandler = getHandler('participant_activated')
    activatedHandler?.({ participantId: 'p1' })

    await waitFor(() => expect(result.current.currentState).toBe('PREVIEW'))
  })

  it('openScoringForm muda PREVIEW para SCORING', async () => {
    vi.mocked(apiClient).mockResolvedValue(makeState({ activeParticipant: makeParticipant('NOT_STARTED') }))
    const { result } = renderHook(() => useJudgePanel(eventId))

    const connectHandler = getHandler('connect')
    connectHandler?.()
    await waitFor(() => expect(result.current.currentState).toBe('PREVIEW'))

    result.current.openScoringForm()
    await waitFor(() => expect(result.current.currentState).toBe('SCORING'))
  })

  it('submitScores faz POST e transita para REVIEW', async () => {
    let getResponse = makeState({ activeParticipant: makeParticipant('NOT_STARTED') })
    vi.mocked(apiClient).mockImplementation(async (options: { method: string; path: string }) => {
      if (options.method === 'GET') return getResponse
      if (options.method === 'POST' && options.path.includes('/confirm/')) {
        getResponse = makeState({ activeParticipant: makeParticipant('IN_REVIEW') })
      }
      return {}
    })

    const { result } = renderHook(() => useJudgePanel(eventId))
    const connectHandler = getHandler('connect')
    connectHandler?.()
    await waitFor(() => expect(result.current.currentState).toBe('PREVIEW'))

    result.current.openScoringForm()
    await waitFor(() => expect(result.current.currentState).toBe('SCORING'))

    await result.current.submitScores({ c1: 8.5 })

    await waitFor(() => expect(result.current.currentState).toBe('REVIEW'))
  })

  it('editScores faz POST e volta para SCORING', async () => {
    let getResponse = makeState({ activeParticipant: makeParticipant('IN_REVIEW') })
    vi.mocked(apiClient).mockImplementation(async (options: { method: string; path: string }) => {
      if (options.method === 'GET') return getResponse
      if (options.method === 'POST' && options.path.includes('/revise/')) {
        getResponse = makeState({ activeParticipant: makeParticipant('IN_SCORING') })
      }
      return {}
    })

    const { result } = renderHook(() => useJudgePanel(eventId))
    const connectHandler = getHandler('connect')
    connectHandler?.()
    await waitFor(() => expect(result.current.currentState).toBe('REVIEW'))

    await result.current.editScores()
    await waitFor(() => expect(result.current.currentState).toBe('SCORING'))
  })

  it('finalizeScores faz POST e transita para FINISHED', async () => {
    let getResponse = makeState({ activeParticipant: makeParticipant('IN_REVIEW') })
    vi.mocked(apiClient).mockImplementation(async (options: { method: string; path: string }) => {
      if (options.method === 'GET') return getResponse
      if (options.method === 'POST' && options.path.includes('/finalize/')) {
        getResponse = makeState({ activeParticipant: makeParticipant('FINISHED') })
      }
      return {}
    })

    const { result } = renderHook(() => useJudgePanel(eventId))
    const connectHandler = getHandler('connect')
    connectHandler?.()
    await waitFor(() => expect(result.current.currentState).toBe('REVIEW'))

    await result.current.finalizeScores()
    await waitFor(() => expect(result.current.currentState).toBe('FINISHED'))
  })

  it('event_state_changed com FINISHED vai para EVENT_ENDED', async () => {
    vi.mocked(apiClient).mockResolvedValue(makeState())
    const { result } = renderHook(() => useJudgePanel(eventId))

    const connectHandler = getHandler('connect')
    connectHandler?.()
    await waitFor(() => expect(result.current.currentState).toBe('WAITING'))

    const eventHandler = getHandler('event_state_changed')
    eventHandler?.({ status: 'FINISHED' })

    await waitFor(() => expect(result.current.currentState).toBe('EVENT_ENDED'))
  })

  it('reconexão: chama connect do socket e fetchState', () => {
    vi.mocked(apiClient).mockResolvedValue(makeState())
    const { result } = renderHook(() => useJudgePanel(eventId))

    result.current.retryConnection()
    expect(mSocket.connect).toHaveBeenCalled()
  })
})

function getHandler(event: string) {
  const calls = mSocket.on.mock.calls as [string, (...args: unknown[]) => void][]
  const found = calls.find((call) => call[0] === event)
  return found?.[1]
}
