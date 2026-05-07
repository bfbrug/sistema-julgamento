import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import React from 'react'
import { useImportParticipants } from '../useParticipants'

vi.mock('@/lib/api', () => ({
  apiClient: vi.fn(),
}))

vi.mock('sonner', () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}))

import { apiClient } from '@/lib/api'

function wrapper({ children }: { children: React.ReactNode }) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  return React.createElement(QueryClientProvider, { client: queryClient }, children)
}

describe('useImportParticipants', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('chama POST /events/:eventId/participants/bulk com array de nomes', async () => {
    const mockResult = { created: 2, skipped: 0, participants: [] }
    ;(apiClient as ReturnType<typeof vi.fn>).mockResolvedValue(mockResult)

    const { result } = renderHook(() => useImportParticipants('event-1'), { wrapper })

    result.current.mutate({ names: ['Ana', 'Bruno'] })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(apiClient).toHaveBeenCalledWith({
      method: 'POST',
      path: '/events/event-1/participants/bulk',
      body: { names: ['Ana', 'Bruno'] },
    })
    expect(result.current.data).toEqual(mockResult)
  })

  it('propaga erro quando API falha', async () => {
    ;(apiClient as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Erro servidor'))

    const { result } = renderHook(() => useImportParticipants('event-1'), { wrapper })

    result.current.mutate({ names: ['Ana'] })

    await waitFor(() => expect(result.current.isError).toBe(true))

    expect(result.current.error?.message).toBe('Erro servidor')
  })
})
