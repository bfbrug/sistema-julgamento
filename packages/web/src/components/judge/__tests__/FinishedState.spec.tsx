import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { FinishedState } from '../FinishedState'

describe('FinishedState', () => {
  it('renderiza mensagem de sucesso', () => {
    render(<FinishedState scores={[]} />)
    expect(screen.getByText('Notas finalizadas com sucesso')).toBeInTheDocument()
    expect(screen.getByText('Aguardando o gestor ativar o próximo participante')).toBeInTheDocument()
  })

  it('mostra resumo das notas', () => {
    render(
      <FinishedState
        scores={[
          { categoryName: 'Criatividade', value: 8.5 },
          { categoryName: 'Execução', value: 9.0 },
        ]}
      />,
    )
    expect(screen.getByText('Criatividade')).toBeInTheDocument()
    expect(screen.getByText('8.5')).toBeInTheDocument()
    expect(screen.getByText('Execução')).toBeInTheDocument()
    expect(screen.getByText('9.0')).toBeInTheDocument()
  })
})
