import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { ReviewSummary } from '../ReviewSummary'

describe('ReviewSummary', () => {
  const baseProps = {
    scores: [
      { categoryName: 'Criatividade', value: 8.5 },
      { categoryName: 'Execução', value: 9.0 },
    ],
    onEdit: vi.fn(),
    onFinalize: vi.fn(),
    isSubmitting: false,
  }

  it('lista todas as notas', () => {
    render(<ReviewSummary {...baseProps} />)
    expect(screen.getByText('Criatividade')).toBeInTheDocument()
    expect(screen.getByText('8.5')).toBeInTheDocument()
    expect(screen.getByText('Execução')).toBeInTheDocument()
    expect(screen.getByText('9.0')).toBeInTheDocument()
  })

  it('dispara onEdit ao clicar em Alterar', () => {
    render(<ReviewSummary {...baseProps} />)
    fireEvent.click(screen.getByRole('button', { name: /alterar/i }))
    expect(baseProps.onEdit).toHaveBeenCalledTimes(1)
  })

  it('dispara onFinalize ao clicar em Confirmar e finalizar', () => {
    render(<ReviewSummary {...baseProps} />)
    fireEvent.click(screen.getByRole('button', { name: /confirmar e finalizar/i }))
    expect(baseProps.onFinalize).toHaveBeenCalledTimes(1)
  })

  it('mostra aviso de imutabilidade', () => {
    render(<ReviewSummary {...baseProps} />)
    expect(screen.getByText(/após confirmar, as notas não poderão ser alteradas/i)).toBeInTheDocument()
  })
})
