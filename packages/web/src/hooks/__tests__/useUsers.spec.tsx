import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useUsers, useCreateUser, useUpdateUser } from '../useUsers'
import { apiClient } from '@/lib/api'

vi.mock('@/lib/api', () => ({
  apiClient: vi.fn(),
}))

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
import type { ReactNode } from 'react'
const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
)

describe('useUsers', () => {
  beforeEach(() => {
    queryClient.clear()
    vi.clearAllMocks()
  })

  it('useUsers busca usuários', async () => {
    vi.mocked(apiClient).mockResolvedValue([{ id: '1', name: 'User' }])
    const { result } = renderHook(() => useUsers(), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(apiClient).toHaveBeenCalledWith(expect.objectContaining({ method: 'GET', path: '/users?' }))
  })

  it('useUsers com filtros', async () => {
    vi.mocked(apiClient).mockResolvedValue([{ id: '1', name: 'User' }])
    const { result } = renderHook(() => useUsers({ role: 'JURADO', isActive: true }), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(apiClient).toHaveBeenCalledWith(expect.objectContaining({ method: 'GET', path: '/users?role=JURADO&isActive=true' }))
  })

  it('useCreateUser cria usuário', async () => {
    vi.mocked(apiClient).mockResolvedValue({ id: '1', name: 'User' })
    const { result } = renderHook(() => useCreateUser(), { wrapper })
    await result.current.mutateAsync({ email: 'a@b.com', name: 'User', password: '12345678', role: 'JURADO' })
    expect(apiClient).toHaveBeenCalledWith(expect.objectContaining({ method: 'POST', path: '/users' }))
  })

  it('useUpdateUser atualiza usuário', async () => {
    vi.mocked(apiClient).mockResolvedValue({ id: '1', name: 'User' })
    const { result } = renderHook(() => useUpdateUser('1'), { wrapper })
    await result.current.mutateAsync({ name: 'Updated' })
    expect(apiClient).toHaveBeenCalledWith(expect.objectContaining({ method: 'PATCH', path: '/users/1' }))
  })
})
