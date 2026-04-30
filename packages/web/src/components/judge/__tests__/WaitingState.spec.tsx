import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { WaitingState } from '../WaitingState'

describe('WaitingState', () => {
  it('renderiza mensagem correta', () => {
    render(<WaitingState connectionStatus="connected" />)
    expect(screen.getByText('Aguardando próximo participante')).toBeInTheDocument()
    expect(screen.getByText('O gestor irá ativar o próximo participante em instantes')).toBeInTheDocument()
  })

  it('mostra ConnectionStatus', () => {
    render(<WaitingState connectionStatus="connected" />)
    expect(screen.getByText('Conectado')).toBeInTheDocument()
  })
})
