import { render, screen, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ConnectionStatus } from '../ConnectionStatus'

describe('ConnectionStatus', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('mostra bolinha verde quando conectado', () => {
    render(<ConnectionStatus status="connected" />)
    expect(screen.getByText('Conectado')).toBeInTheDocument()
  })

  it('não mostra nada imediatamente quando reconnecting', () => {
    render(<ConnectionStatus status="reconnecting" />)
    expect(screen.queryByText('Reconectando...')).not.toBeInTheDocument()
  })

  it('mostra banner amarelo após 3s em reconnecting', async () => {
    render(<ConnectionStatus status="reconnecting" />)
    vi.advanceTimersByTime(3500)
    await waitFor(() => expect(screen.getByText('Reconectando...')).toBeInTheDocument())
  })

  it('mostra banner vermelho após 10s em disconnected', async () => {
    render(<ConnectionStatus status="disconnected" onRetry={() => {}} />)
    vi.advanceTimersByTime(10500)
    await waitFor(() => expect(screen.getByText('Sem conexão. Não é possível avaliar.')).toBeInTheDocument())
  })

  it('chama onRetry ao clicar no botão', async () => {
    const onRetry = vi.fn()
    render(<ConnectionStatus status="disconnected" onRetry={onRetry} />)
    vi.advanceTimersByTime(10500)
    await waitFor(() => screen.getByRole('button', { name: /tentar novamente/i }).click())
    expect(onRetry).toHaveBeenCalledTimes(1)
  })
})
