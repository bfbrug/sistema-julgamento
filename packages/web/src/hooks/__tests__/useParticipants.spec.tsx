import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useParticipants } from '../useParticipants'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { apiClient } from '@/lib/api'
import type { ReactNode } from 'react'

vi.mock('@/lib/api', () => ({
  apiClient: vi.fn(),
}))

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } },
})

const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
)

describe('useParticipants', () => {
  const eventId = 'event-1'

  beforeEach(() => {
    vi.clearAllMocks()
    queryClient.clear()
  })

  it('should fetch participants', async () => {
    const mockParticipants = [{ id: '1', name: 'Part 1' }]
    vi.mocked(apiClient).mockResolvedValue(mockParticipants)

    const { result } = renderHook(() => useParticipants(eventId), { wrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual(mockParticipants)
  })
})
