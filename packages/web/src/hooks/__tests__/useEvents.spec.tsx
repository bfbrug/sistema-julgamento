import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useEvents, useCreateEvent } from '../useEvents'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { apiClient } from '@/lib/api'
import type { ReactNode } from 'react'

vi.mock('@/lib/api', () => ({
  apiClient: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  useRouter: vi.fn(() => ({
    push: vi.fn(),
  })),
}))


const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } },
})

const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
)

describe('useEvents', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    queryClient.clear()
  })

  it('should fetch events', async () => {
    const mockEvents = [{ id: '1', name: 'Event 1' }]
    ;(apiClient as any).mockResolvedValue(mockEvents)

    const { result } = renderHook(() => useEvents(), { wrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual(mockEvents)
    expect(apiClient).toHaveBeenCalledWith({ method: 'GET', path: '/events' })
  })

  it('should create an event', async () => {
    const mockEvent = { id: '2', name: 'New Event' }
    ;(apiClient as any).mockResolvedValue(mockEvent)

    const { result } = renderHook(() => useCreateEvent(), { wrapper })

    result.current.mutate({ name: 'New Event', date: '2026-05-01', location: 'Test', organizer: 'Test', calculationRule: 'R2', minScore: 0, maxScore: 10, topN: 3 } as any)

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual(mockEvent)
  })
})
