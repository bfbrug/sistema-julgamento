import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import {
  useCertificateConfig,
  useUpdateCertificateText,
  useGenerateCertificates,
} from '../useCertificates'

const mockFetch = vi.fn()
global.fetch = mockFetch

function wrapper({ children }: { children: React.ReactNode }) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
}

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn() } }))

describe('useCertificates', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockFetch.mockReset()
  })

  it('useCertificateConfig busca config', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: { eventId: 'e1', backgroundPath: 'bg.png', certificateText: 'texto', signatures: [] } }),
    })

    const { result } = renderHook(() => useCertificateConfig('e1'), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data?.backgroundPath).toBe('bg.png')
  })

  it('useUpdateCertificateText muta texto', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: { certificateText: 'novo' } }),
    })

    const { result } = renderHook(() => useUpdateCertificateText('e1'), { wrapper })
    result.current.mutate({ certificateText: 'novo' })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data?.certificateText).toBe('novo')
  })

  it('useGenerateCertificates enfileira job', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: { jobId: 'j1', status: 'queued' } }),
    })

    const { result } = renderHook(() => useGenerateCertificates('e1'), { wrapper })
    result.current.mutate()
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data?.jobId).toBe('j1')
  })
})
