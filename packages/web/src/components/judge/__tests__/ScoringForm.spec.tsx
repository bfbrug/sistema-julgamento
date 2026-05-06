import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ScoringForm } from '../ScoringForm'

describe('ScoringForm', () => {
  const baseProps = {
    participantName: 'Ana Silva',
    photoUrl: null,
    presentationOrder: 1,
    totalParticipants: 5,
    categories: [
      { id: 'cat-1', name: 'Criatividade', displayOrder: 1 },
      { id: 'cat-2', name: 'Execução', displayOrder: 2 },
    ],
    scoreMin: 0,
    scoreMax: 10,
    initialValues: {},
    onSubmit: vi.fn(),
    onCancel: vi.fn(),
    isSubmitting: false,
    draftKey: 'draft:scoring:p1',
  }

  beforeEach(() => {
    sessionStorage.clear()
    vi.clearAllMocks()
  })

  it('renderiza um campo por categoria', () => {
    render(<ScoringForm {...baseProps} />)
    expect(screen.getByLabelText('Criatividade')).toBeInTheDocument()
    expect(screen.getByLabelText('Execução')).toBeInTheDocument()
  })

  it('sem valores pré-preenchidos', () => {
    render(<ScoringForm {...baseProps} />)
    const input1 = screen.getByLabelText('Criatividade') as HTMLInputElement
    expect(input1.value).toBe('')
  })

  it('botão submit desabilitado com campos vazios', () => {
    render(<ScoringForm {...baseProps} />)
    expect(screen.getByRole('button', { name: /revisar notas/i })).toBeDisabled()
  })

  it('botão submit desabilitado com nota inválida', async () => {
    render(<ScoringForm {...baseProps} />)
    fireEvent.change(screen.getByLabelText('Criatividade'), { target: { value: '15' } })
    fireEvent.change(screen.getByLabelText('Execução'), { target: { value: '5' } })
    await waitFor(() => expect(screen.getByRole('button', { name: /revisar notas/i })).toBeDisabled())
  })

  it('submit chama callback com payload correto', async () => {
    render(<ScoringForm {...baseProps} />)
    const input1 = screen.getByLabelText('Criatividade')
    const input2 = screen.getByLabelText('Execução')
    
    fireEvent.change(input1, { target: { value: '8.5' } })
    fireEvent.blur(input1)
    
    fireEvent.change(input2, { target: { value: '9.0' } })
    fireEvent.blur(input2)
    
    await waitFor(() => expect(screen.getByRole('button', { name: /revisar notas/i })).not.toBeDisabled())
    fireEvent.submit(document.querySelector('form')!)
    await waitFor(() => expect(baseProps.onSubmit).toHaveBeenCalledWith(expect.objectContaining({
      'cat-1': 8.5,
      'cat-2': 9.0,
    })))
  })

  it('persiste draft em sessionStorage', async () => {
    render(<ScoringForm {...baseProps} />)
    fireEvent.change(screen.getByLabelText('Criatividade'), { target: { value: '7.5' } })
    await waitFor(() => {
      const draft = sessionStorage.getItem('draft:scoring:p1')
      expect(draft).toBeTruthy()
      const parsed = JSON.parse(draft!)
      expect(parsed['cat-1']).toBe(7.5)
    })
  })

  it('restaura draft ao remontar', async () => {
    sessionStorage.setItem('draft:scoring:p1', JSON.stringify({ 'cat-1': 6.5, 'cat-2': 7.0 }))
    render(<ScoringForm {...baseProps} />)
    await waitFor(() => {
      expect((screen.getByLabelText('Criatividade') as HTMLInputElement).value).toBe('6.5')
      expect((screen.getByLabelText('Execução') as HTMLInputElement).value).toBe('7')
    })
  })
})
