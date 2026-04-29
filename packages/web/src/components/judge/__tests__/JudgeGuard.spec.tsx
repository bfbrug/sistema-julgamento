import { render, screen, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { JudgeGuard } from '../JudgeGuard'

const mockPush = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
  usePathname: () => '/judge/event-1',
}))

vi.mock('@/stores/auth.store', () => ({
  useAuthStore: vi.fn(),
}))

import { useAuthStore } from '@/stores/auth.store'

describe('JudgeGuard', () => {
  beforeEach(() => {
    mockPush.mockClear()
  })

  it('redireciona para login se não autenticado', async () => {
    vi.mocked(useAuthStore).mockReturnValue({
      isAuthenticated: false,
      user: null,
    } as ReturnType<typeof useAuthStore>)

    render(
      <JudgeGuard>
        <div>Conteúdo protegido</div>
      </JudgeGuard>,
    )

    await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/auth/login?next=/judge/event-1'))
  })

  it('redireciona para dashboard se gestor', async () => {
    vi.mocked(useAuthStore).mockReturnValue({
      isAuthenticated: true,
      user: { role: 'GESTOR' },
    } as ReturnType<typeof useAuthStore>)

    render(
      <JudgeGuard>
        <div>Conteúdo protegido</div>
      </JudgeGuard>,
    )

    await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/dashboard'))
  })

  it('renderiza children se jurado autenticado', async () => {
    vi.mocked(useAuthStore).mockReturnValue({
      isAuthenticated: true,
      user: { role: 'JURADO' },
    } as ReturnType<typeof useAuthStore>)

    render(
      <JudgeGuard>
        <div>Conteúdo protegido</div>
      </JudgeGuard>,
    )

    await waitFor(() => expect(screen.getByText('Conteúdo protegido')).toBeInTheDocument())
  })
})
