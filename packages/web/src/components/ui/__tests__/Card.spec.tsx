import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { Card } from '../Card'

describe('Card', () => {
  it('renderiza conteúdo do body', () => {
    render(<Card body={<p>Conteúdo do body</p>} />)
    expect(screen.getByText('Conteúdo do body')).toBeInTheDocument()
  })

  it('renderiza header quando fornecido', () => {
    render(<Card header={<h2>Título do Card</h2>} body={<p>Body</p>} />)
    expect(screen.getByText('Título do Card')).toBeInTheDocument()
  })

  it('renderiza footer quando fornecido', () => {
    render(<Card body={<p>Body</p>} footer={<span>Rodapé</span>} />)
    expect(screen.getByText('Rodapé')).toBeInTheDocument()
  })

  it('não renderiza seção header quando omitido', () => {
    const { container } = render(<Card body={<p>Apenas body</p>} />)
    expect(container.querySelector('[data-card-header]')).toBeNull()
  })

  it('não renderiza seção footer quando omitido', () => {
    const { container } = render(<Card body={<p>Apenas body</p>} />)
    expect(container.querySelector('[data-card-footer]')).toBeNull()
  })

  it('aceita className customizado', () => {
    const { container } = render(<Card body={<p>Body</p>} className="meu-card" />)
    expect(container.firstChild).toHaveClass('meu-card')
  })
})
