import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { Input } from '../Input'

describe('Input', () => {
  it('renderiza label', () => {
    render(<Input label="Email" id="email" />)
    expect(screen.getByLabelText('Email')).toBeInTheDocument()
  })

  it('mostra mensagem de erro quando prop error presente', () => {
    render(<Input label="Email" id="email" error="Email inválido" />)
    expect(screen.getByText('Email inválido')).toBeInTheDocument()
    expect(screen.getByRole('textbox')).toHaveClass('border-danger-500')
  })

  it('mostra helperText quando não há erro', () => {
    render(<Input label="Email" id="email" helperText="Digite seu email corporativo" />)
    expect(screen.getByText('Digite seu email corporativo')).toBeInTheDocument()
  })

  it('não mostra helperText quando error está presente', () => {
    render(
      <Input
        label="Email"
        id="email"
        error="Email inválido"
        helperText="Digite seu email corporativo"
      />,
    )
    expect(screen.queryByText('Digite seu email corporativo')).not.toBeInTheDocument()
  })

  it('chama onChange com o valor digitado', () => {
    const handler = vi.fn()
    render(<Input label="Nome" id="nome" onChange={handler} />)
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Alice' } })
    expect(handler).toHaveBeenCalled()
  })

  it('aceita className customizado no elemento input', () => {
    render(<Input label="Teste" id="teste" className="meu-input" />)
    expect(screen.getByRole('textbox')).toHaveClass('meu-input')
  })
})
