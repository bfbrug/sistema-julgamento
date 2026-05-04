import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useJudges, useAddJudge, useRemoveJudge, useUpdateAssignments } from '../useJudges'
import { apiClient } from '@/lib/api'

vi.mock('@/lib/api', () => ({
  apiClient: vi.fn(),
}))

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
import type { ReactNode } from 'react'
const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
)

describe('useJudges', () => {
  beforeEach(() => {
    queryClient.clear()
    vi.clearAllMocks()
  })

  it('useJudges busca jurados', async () => {
    vi.mocked(apiClient).mockResolvedValue([{ id: '1', name: 'J' }])
    const { result } = renderHook(() => useJudges('e1'), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(apiClient).toHaveBeenCalledWith({ method: 'GET', path: '/events/e1/judges' })
  })

  it('useAddJudge adiciona', async () => {
    vi.mocked(apiClient).mockResolvedValue({ id: '1', name: 'J' })
    const { result } = renderHook(() => useAddJudge('e1'), { wrapper })
    await result.current.mutateAsync({ userId: 'u1' })
    expect(apiClient).toHaveBeenCalledWith(expect.objectContaining({ method: 'POST', path: '/events/e1/judges' }))
  })

  it('useRemoveJudge remove', async () => {
    vi.mocked(apiClient).mockResolvedValue({})
    const { result } = renderHook(() => useRemoveJudge('e1'), { wrapper })
    await result.current.mutateAsync('j1')
    expect(apiClient).toHaveBeenCalledWith(expect.objectContaining({ method: 'DELETE', path: '/events/e1/judges/j1' }))
  })

  it('useUpdateAssignments salva atribuições', async () => {
    vi.mocked(apiClient).mockResolvedValue({})
    const { result } = renderHook(() => useUpdateAssignments('e1'), { wrapper })
    await result.current.mutateAsync([{ judgeId: 'j1', categoryId: 'c1' }])
    expect(apiClient).toHaveBeenCalledWith(expect.objectContaining({ 
      method: 'PUT', 
      path: '/events/e1/judge-matrix',
      body: { cells: [{ judgeId: 'j1', categoryId: 'c1' }] }
    }))
  })
})
