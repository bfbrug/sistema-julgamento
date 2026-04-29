import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { EventHeader } from '../EventHeader'
import { CurrentParticipantHero } from '../CurrentParticipantHero'
import { JudgesProgress } from '../JudgesProgress'
import { UpcomingQueue } from '../UpcomingQueue'
import { EventFinishedView } from '../EventFinishedView'
import { ConnectionIndicator } from '../ConnectionIndicator'

describe('EventHeader', () => {
  it('renderiza nome, data e contador de progresso', () => {
    render(
      <EventHeader
        name="Festival"
        eventDate="2026-12-15T00:00:00.000Z"
        location="Auditório"
        organizer="Org"
        completedCount={3}
        totalCount={10}
      />,
    )
    expect(screen.getByText('Festival')).toBeInTheDocument()
    expect(screen.getByText(/15\/12\/2026|14\/12\/2026/)).toBeInTheDocument()
    expect(screen.getByText('3')).toBeInTheDocument()
    expect(screen.getByText('10')).toBeInTheDocument()
  })
})

describe('CurrentParticipantHero', () => {
  it('mostra nome, ordem e estado', () => {
    render(
      <CurrentParticipantHero
        name="Maria Silva"
        photoPath={null}
        presentationOrder={2}
        totalParticipants={8}
        currentState="SCORING"
      />,
    )
    expect(screen.getByText('Maria Silva')).toBeInTheDocument()
    expect(screen.getByText('Participante 2 de 8')).toBeInTheDocument()
    expect(screen.getByText('Em avaliação')).toBeInTheDocument()
  })
})

describe('JudgesProgress', () => {
  it('renderiza X de Y com indicador visual', () => {
    render(<JudgesProgress finished={2} total={5} />)
    expect(screen.getByText('2')).toBeInTheDocument()
    expect(screen.getByText('de 5')).toBeInTheDocument()
    expect(screen.getByText('jurados finalizaram')).toBeInTheDocument()
  })
})

describe('UpcomingQueue', () => {
  it('mostra próximos 3 participantes', () => {
    const participants = [
      { name: 'João', presentationOrder: 3 },
      { name: 'Ana', presentationOrder: 4 },
    ]
    render(<UpcomingQueue participants={participants} />)
    expect(screen.getByText('João')).toBeInTheDocument()
    expect(screen.getByText('Ana')).toBeInTheDocument()
    expect(screen.getByText('3')).toBeInTheDocument()
    expect(screen.getByText('4')).toBeInTheDocument()
  })

  it('mostra mensagem de fim quando vazio', () => {
    render(<UpcomingQueue participants={[]} />)
    expect(screen.getByText('Fila encerrada')).toBeInTheDocument()
  })
})

describe('EventFinishedView', () => {
  it('renderiza top-N corretamente, com empates na mesma posição', () => {
    const ranking = [
      { position: 1, participantName: 'Maria', finalScore: 9.5 },
      { position: 1, participantName: 'João', finalScore: 9.5 },
      { position: 3, participantName: 'Ana', finalScore: 8.0 },
    ]
    render(<EventFinishedView eventName="Festival" ranking={ranking} />)
    expect(screen.getByText('Resultado Final')).toBeInTheDocument()
    expect(screen.getByText('Maria')).toBeInTheDocument()
    expect(screen.getByText('João')).toBeInTheDocument()
    expect(screen.getByText('Ana')).toBeInTheDocument()
    expect(screen.getAllByText('1º')).toHaveLength(2)
    expect(screen.getByText('3º')).toBeInTheDocument()
    expect(screen.getAllByText('9.50')).toHaveLength(2)
    expect(screen.getByText('8.00')).toBeInTheDocument()
  })
})

describe('ConnectionIndicator', () => {
  it('mostra ao vivo quando conectado', () => {
    render(<ConnectionIndicator status="connected" />)
    expect(screen.getByText('ao vivo')).toBeInTheDocument()
  })

  it('mostra reconectando quando em reconexão', () => {
    render(<ConnectionIndicator status="reconnecting" />)
    expect(screen.getByText('reconectando...')).toBeInTheDocument()
  })
})
