import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { EventEndedState } from '../EventEndedState'

const mockPush = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}))

describe('EventEndedState', () => {
  it('renderiza mensagem de agradecimento', () => {
    render(<EventEndedState eventName="Evento Teste" totalEvaluated={5} />)
    expect(screen.getByText('Evento encerrado. Obrigado pela sua participação!')).toBeInTheDocument()
    expect(screen.getByText('Evento Teste')).toBeInTheDocument()
  })

  it('mostra total de participantes avaliados', () => {
    const { container } = render(<EventEndedState eventName="Evento Teste" totalEvaluated={5} />)
    expect(container.textContent).toContain('Você avaliou 5 participantes')
  })

  it('mostra singular quando 1 participante', () => {
    const { container } = render(<EventEndedState eventName="Evento Teste" totalEvaluated={1} />)
    expect(container.textContent).toContain('Você avaliou 1 participante')
  })
})
