import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useCategories, useCreateCategory, useUpdateCategory, useDeleteCategory, useReorderCategories } from '../useCategories'
import { apiClient } from '@/lib/api'

vi.mock('@/lib/api', () => ({
  apiClient: vi.fn(),
}))

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
import type { ReactNode } from 'react'
const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
)

describe('useCategories', () => {
  beforeEach(() => {
    queryClient.clear()
    vi.clearAllMocks()
  })

  it('useCategories busca categorias', async () => {
    vi.mocked(apiClient).mockResolvedValue([{ id: '1', name: 'Cat' }])
    const { result } = renderHook(() => useCategories('e1'), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(apiClient).toHaveBeenCalledWith({ method: 'GET', path: '/events/e1/categories' })
  })

  it('useCreateCategory categoria', async () => {
    vi.mocked(apiClient).mockResolvedValue({ id: '1', name: 'Cat' })
    const { result } = renderHook(() => useCreateCategory('e1'), { wrapper })
    await result.current.mutateAsync({ name: 'Cat', displayOrder: 1 })
    expect(apiClient).toHaveBeenCalledWith(expect.objectContaining({ method: 'POST', path: '/events/e1/categories' }))
  })

  it('useUpdateCategory atualiza', async () => {
    vi.mocked(apiClient).mockResolvedValue({ id: '1', name: 'Cat' })
    const { result } = renderHook(() => useUpdateCategory('e1', 'c1'), { wrapper })
    await result.current.mutateAsync({ name: 'Cat2' })
    expect(apiClient).toHaveBeenCalledWith(expect.objectContaining({ method: 'PATCH', path: '/events/e1/categories/c1' }))
  })

  it('useDeleteCategory exclui', async () => {
    vi.mocked(apiClient).mockResolvedValue({})
    const { result } = renderHook(() => useDeleteCategory('e1'), { wrapper })
    await result.current.mutateAsync('c1')
    expect(apiClient).toHaveBeenCalledWith(expect.objectContaining({ method: 'DELETE', path: '/events/e1/categories/c1' }))
  })

  it('useReorderCategories reordena', async () => {
    vi.mocked(apiClient).mockResolvedValue({})
    const { result } = renderHook(() => useReorderCategories('e1'), { wrapper })
    await result.current.mutateAsync(['c2', 'c1'])
    expect(apiClient).toHaveBeenCalledWith(expect.objectContaining({ method: 'POST', path: '/events/e1/categories/reorder' }))
  })
})
