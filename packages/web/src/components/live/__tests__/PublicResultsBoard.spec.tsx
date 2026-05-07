import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { PublicResultsBoard } from '../PublicResultsBoard'

const emptyResults = { eventGenderMode: 'MIXED' as const, released: {} }

const splitResults = {
  eventGenderMode: 'UNISEX_SPLIT' as const,
  released: {
    MALE: [{ position: 4, participantId: 'p1', name: 'João', totalScore: 30 }],
    FEMALE: [{ position: 4, participantId: 'p2', name: 'Maria', totalScore: 28 }],
  },
}

describe('PublicResultsBoard', () => {
  it('mostra "Aguardando divulgação" quando sem releases', () => {
    render(<PublicResultsBoard eventName="Evento Teste" results={emptyResults} />)
    expect(screen.getByText(/Aguardando divulgação/i)).toBeInTheDocument()
  })

  it('renderiza 2 colunas em UNISEX_SPLIT com labels', () => {
    render(<PublicResultsBoard eventName="Evento Teste" results={splitResults} />)
    expect(screen.getByText('Masculino')).toBeInTheDocument()
    expect(screen.getByText('Feminino')).toBeInTheDocument()
    expect(screen.getByText('João')).toBeInTheDocument()
    expect(screen.getByText('Maria')).toBeInTheDocument()
  })

  it('mostra posição e nome do participante', () => {
    render(<PublicResultsBoard eventName="Evento Teste" results={splitResults} />)
    const positions = screen.getAllByText('4º')
    expect(positions.length).toBeGreaterThanOrEqual(1)
    expect(positions[0]).toBeInTheDocument()
  })
})
