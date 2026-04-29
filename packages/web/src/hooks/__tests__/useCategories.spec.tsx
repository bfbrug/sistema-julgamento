import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useCategories, useCreateCategory } from '../useCategories'
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

describe('useCategories', () => {
  const eventId = 'event-1'

  beforeEach(() => {
    vi.clearAllMocks()
    queryClient.clear()
  })

  it('should fetch categories', async () => {
    const mockCategories = [{ id: '1', name: 'Cat 1' }]
    ;(apiClient as any).mockResolvedValue(mockCategories)

    const { result } = renderHook(() => useCategories(eventId), { wrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual(mockCategories)
    expect(apiClient).toHaveBeenCalledWith({ method: 'GET', path: `/events/${eventId}/categories` })
  })

  it('should create a category', async () => {
    const mockCategory = { id: '2', name: 'New Cat' }
    ;(apiClient as any).mockResolvedValue(mockCategory)

    const { result } = renderHook(() => useCreateCategory(eventId), { wrapper })

    result.current.mutate({ name: 'New Cat', weight: 1 })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual(mockCategory)
  })
})
