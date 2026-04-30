import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { PreviewState } from '../PreviewState'

describe('PreviewState', () => {
  const baseProps = {
    participantName: 'Ana Silva',
    photoUrl: null,
    presentationOrder: 3,
    totalParticipants: 10,
    categories: [
      { id: 'cat-1', name: 'Criatividade' },
      { id: 'cat-2', name: 'Execução' },
    ],
    canStartScoring: true,
    onStartScoring: vi.fn(),
  }

  it('renderiza nome, ordem e total', () => {
    render(<PreviewState {...baseProps} />)
    expect(screen.getByText('Ana Silva')).toBeInTheDocument()
    expect(screen.getByText('Participante 3 de 10')).toBeInTheDocument()
  })

  it('lista categorias', () => {
    render(<PreviewState {...baseProps} />)
    expect(screen.getByText('Criatividade')).toBeInTheDocument()
    expect(screen.getByText('Execução')).toBeInTheDocument()
  })

  it('botão dispara callback quando habilitado', () => {
    render(<PreviewState {...baseProps} />)
    fireEvent.click(screen.getByRole('button', { name: /avaliar participante/i }))
    expect(baseProps.onStartScoring).toHaveBeenCalledTimes(1)
  })

  it('botão fica desabilitado quando canStartScoring é false', () => {
    render(<PreviewState {...baseProps} canStartScoring={false} />)
    expect(screen.getByRole('button', { name: /aguardando início/i })).toBeDisabled()
  })
})
