import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useJudges } from '../useJudges'
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

describe('useJudges', () => {
  const eventId = 'event-1'

  beforeEach(() => {
    vi.clearAllMocks()
    queryClient.clear()
  })

  it('should fetch judges', async () => {
    const mockJudges = [{ id: '1', user: { name: 'Judge 1' }, categories: [] }]
    ;(apiClient as any).mockResolvedValue(mockJudges)

    const { result } = renderHook(() => useJudges(eventId), { wrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual(mockJudges)
  })
})
