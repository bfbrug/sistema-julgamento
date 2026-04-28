import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { Button } from '../Button'

describe('Button', () => {
  it('renderiza com texto', () => {
    render(<Button>Clique aqui</Button>)
    expect(screen.getByRole('button', { name: /clique aqui/i })).toBeInTheDocument()
  })

  it('aplica classe de variante primary por padrão', () => {
    render(<Button variant="primary">Primary</Button>)
    const btn = screen.getByRole('button')
    expect(btn.className).toMatch(/bg-primary/)
  })

  it('aplica classe de variante danger', () => {
    render(<Button variant="danger">Danger</Button>)
    expect(screen.getByRole('button').className).toMatch(/bg-danger/)
  })

  it('aplica classe de tamanho lg', () => {
    render(<Button size="lg">Grande</Button>)
    expect(screen.getByRole('button').className).toMatch(/px-6/)
  })

  it('chama onClick quando clicado', () => {
    const handler = vi.fn()
    render(<Button onClick={handler}>Clique</Button>)
    fireEvent.click(screen.getByRole('button'))
    expect(handler).toHaveBeenCalledTimes(1)
  })

  it('não chama onClick quando disabled', () => {
    const handler = vi.fn()
    render(<Button disabled onClick={handler}>Desabilitado</Button>)
    fireEvent.click(screen.getByRole('button'))
    expect(handler).not.toHaveBeenCalled()
  })

  it('mostra spinner quando loading=true', () => {
    render(<Button loading>Salvando</Button>)
    expect(screen.getByRole('button')).toBeDisabled()
    expect(screen.getByTestId('button-spinner')).toBeInTheDocument()
  })

  it('aceita className customizado', () => {
    render(<Button className="minha-classe">Custom</Button>)
    expect(screen.getByRole('button').className).toContain('minha-classe')
  })
})
