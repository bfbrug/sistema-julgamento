import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useLiveScoring } from '../useLiveScoring'
import { io } from 'socket.io-client'
import { apiClient } from '@/lib/api'

vi.mock('socket.io-client', () => {
  const mSocket = {
    on: vi.fn(),
    off: vi.fn(),
    disconnect: vi.fn(),
    emit: vi.fn(),
  }
  return {
    io: vi.fn(() => mSocket),
  }
})

vi.mock('@/lib/api', () => ({
  apiClient: vi.fn(),
}))

vi.mock('@/stores/auth.store', () => ({
  useAuthStore: vi.fn(() => ({
    accessToken: 'test-token',
  })),
}))

describe('useLiveScoring', () => {
  const eventId = 'event-1'

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should connect to websocket', () => {
    renderHook(() => useLiveScoring(eventId))

    expect(io).toHaveBeenCalledWith(expect.stringContaining('/scoring'), expect.objectContaining({
      auth: { token: 'test-token' },
      query: { eventId },
    }))
  })

  it('should fetch initial state on connect', async () => {
    const mockState = { currentParticipant: null, queue: [], judges: [] }
    ;(apiClient as any).mockResolvedValue(mockState)

    const { result } = renderHook(() => useLiveScoring(eventId))
    
    const mockSocket = (io as any).mock.results[0].value
    const connectHandler = mockSocket.on.mock.calls.find((call: any) => call[0] === 'connect')[1]
    
    connectHandler()

    await waitFor(() => expect(apiClient).toHaveBeenCalled())
  })
})
