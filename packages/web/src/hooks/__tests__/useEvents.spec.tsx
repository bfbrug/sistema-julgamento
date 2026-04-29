import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useEvents, useEvent, useCreateEvent, useUpdateEvent, useDeleteEvent } from '../useEvents'
import { apiClient } from '@/lib/api'

vi.mock('@/lib/api', () => ({
  apiClient: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}))

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
import type { ReactNode } from 'react'
const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
)

describe('useEvents', () => {
  beforeEach(() => {
    queryClient.clear()
    vi.clearAllMocks()
  })

  it('useEvents busca eventos', async () => {
    vi.mocked(apiClient).mockResolvedValue([{ id: '1', name: 'Evento' }])
    const { result } = renderHook(() => useEvents(), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(apiClient).toHaveBeenCalledWith({ method: 'GET', path: '/events' })
  })

  it('useEvent busca evento por id', async () => {
    vi.mocked(apiClient).mockResolvedValue({ id: '1', name: 'Evento' })
    const { result } = renderHook(() => useEvent('1'), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(apiClient).toHaveBeenCalledWith({ method: 'GET', path: '/events/1' })
  })

  it('useCreateEvent cria evento', async () => {
    vi.mocked(apiClient).mockResolvedValue({ id: '1', name: 'Novo' })
    const { result } = renderHook(() => useCreateEvent(), { wrapper })
    await result.current.mutateAsync({ name: 'Novo', status: 'DRAFT', eventDate: '2026-01-01', location: 'L', organizer: 'O', calculationRule: 'R1', scoreMin: 0, scoreMax: 10, topN: 3 })
    expect(apiClient).toHaveBeenCalledWith(expect.objectContaining({ method: 'POST', path: '/events' }))
  })

  it('useUpdateEvent atualiza evento', async () => {
    vi.mocked(apiClient).mockResolvedValue({ id: '1', name: 'Atualizado' })
    const { result } = renderHook(() => useUpdateEvent('1'), { wrapper })
    await result.current.mutateAsync({ name: 'Atualizado' })
    expect(apiClient).toHaveBeenCalledWith(expect.objectContaining({ method: 'PATCH', path: '/events/1' }))
  })

  it('useDeleteEvent exclui evento', async () => {
    vi.mocked(apiClient).mockResolvedValue({})
    const { result } = renderHook(() => useDeleteEvent(), { wrapper })
    await result.current.mutateAsync('1')
    expect(apiClient).toHaveBeenCalledWith(expect.objectContaining({ method: 'DELETE', path: '/events/1' }))
  })
})
