import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useParticipants, useCreateParticipant, useUpdateParticipant, useDeleteParticipant, useReorderParticipants, useShuffleParticipants } from '../useParticipants'
import { apiClient } from '@/lib/api'

vi.mock('@/lib/api', () => ({
  apiClient: vi.fn(),
}))

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
import type { ReactNode } from 'react'
const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
)

describe('useParticipants', () => {
  beforeEach(() => {
    queryClient.clear()
    vi.clearAllMocks()
  })

  it('useParticipants busca participantes', async () => {
    vi.mocked(apiClient).mockResolvedValue([{ id: '1', name: 'P' }])
    const { result } = renderHook(() => useParticipants('e1'), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(apiClient).toHaveBeenCalledWith({ method: 'GET', path: '/events/e1/participants' })
  })

  it('useCreateParticipant cria', async () => {
    vi.mocked(apiClient).mockResolvedValue({ id: '1', name: 'P' })
    const { result } = renderHook(() => useCreateParticipant('e1'), { wrapper })
    await result.current.mutateAsync({ name: 'P' })
    expect(apiClient).toHaveBeenCalledWith(expect.objectContaining({ method: 'POST', path: '/events/e1/participants' }))
  })

  it('useUpdateParticipant atualiza', async () => {
    vi.mocked(apiClient).mockResolvedValue({ id: '1', name: 'P' })
    const { result } = renderHook(() => useUpdateParticipant('e1', 'p1'), { wrapper })
    await result.current.mutateAsync({ name: 'P2' })
    expect(apiClient).toHaveBeenCalledWith(expect.objectContaining({ method: 'PATCH', path: '/events/e1/participants/p1' }))
  })

  it('useDeleteParticipant exclui', async () => {
    vi.mocked(apiClient).mockResolvedValue({})
    const { result } = renderHook(() => useDeleteParticipant('e1'), { wrapper })
    await result.current.mutateAsync('p1')
    expect(apiClient).toHaveBeenCalledWith(expect.objectContaining({ method: 'DELETE', path: '/events/e1/participants/p1' }))
  })

  it('useReorderParticipants reordena', async () => {
    vi.mocked(apiClient).mockResolvedValue({})
    const { result } = renderHook(() => useReorderParticipants('e1'), { wrapper })
    await result.current.mutateAsync(['p2', 'p1'])
    expect(apiClient).toHaveBeenCalledWith(expect.objectContaining({
      method: 'PATCH',
      path: '/events/e1/participants/reorder',
      body: { items: [{ id: 'p2', presentationOrder: 1 }, { id: 'p1', presentationOrder: 2 }] },
    }))
  })

  it('useShuffleParticipants embaralha', async () => {
    vi.mocked(apiClient).mockResolvedValue({})
    const { result } = renderHook(() => useShuffleParticipants('e1'), { wrapper })
    await result.current.mutateAsync()
    expect(apiClient).toHaveBeenCalledWith(expect.objectContaining({ method: 'POST', path: '/events/e1/participants/shuffle' }))
  })
})
