import { render, screen } from '@testing-library/react'
import { PublicResultsBoard } from '../PublicResultsBoard'

const emptyCategories = [
  { categoryId: 'c1', name: 'Geral', genderMode: 'MIXED' as const, released: {} },
]

const splitCategories = [
  {
    categoryId: 'c1',
    name: 'Geral',
    genderMode: 'UNISEX_SPLIT' as const,
    released: {
      MALE: [{ position: 4, participantId: 'p1', name: 'João', totalScore: 30 }],
      FEMALE: [{ position: 4, participantId: 'p2', name: 'Maria', totalScore: 28 }],
    },
  },
]

describe('PublicResultsBoard', () => {
  it('mostra "Aguardando divulgação" quando sem releases', () => {
    render(<PublicResultsBoard eventName="Evento Teste" categories={emptyCategories} />)
    expect(screen.getByText(/Aguardando divulgação/i)).toBeInTheDocument()
  })

  it('renderiza 2 colunas em UNISEX_SPLIT com labels', () => {
    render(<PublicResultsBoard eventName="Evento Teste" categories={splitCategories} />)
    expect(screen.getByText('Masculino')).toBeInTheDocument()
    expect(screen.getByText('Feminino')).toBeInTheDocument()
    expect(screen.getByText('João')).toBeInTheDocument()
    expect(screen.getByText('Maria')).toBeInTheDocument()
  })

  it('mostra posição e nome do participante', () => {
    render(<PublicResultsBoard eventName="Evento Teste" categories={splitCategories} />)
    const positions = screen.getAllByText('4º')
    expect(positions.length).toBeGreaterThanOrEqual(1)
    expect(positions[0]).toBeInTheDocument()
  })
})
