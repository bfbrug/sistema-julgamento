import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeAll } from 'vitest'

// Mock HTMLDialogElement methods (jsdom doesn't implement them)
// Also set the `open` attribute so jsdom exposes the dialog's children to queries
beforeAll(() => {
  HTMLDialogElement.prototype.showModal = vi.fn(function (this: HTMLDialogElement) {
    this.setAttribute('open', '')
  })
  HTMLDialogElement.prototype.close = vi.fn(function (this: HTMLDialogElement) {
    this.removeAttribute('open')
  })
})

// Mock hooks
vi.mock('@/hooks/useLiveScoring', () => ({
  useLiveScoring: () => ({
    liveState: {
      currentParticipant: null,
      queue: [
        { id: 'p1', name: 'Ana Silva', status: 'WAITING', presentationOrder: 1, photoUrl: null },
        { id: 'p2', name: 'Bruno Costa', status: 'FINISHED', presentationOrder: 2, photoUrl: null },
        { id: 'p3', name: 'Carla Dias', status: 'ABSENT', presentationOrder: 3, photoUrl: null },
      ],
      judges: [],
    },
    isConnected: true,
    activateParticipant: vi.fn(),
    markAbsent: vi.fn(),
  }),
}))

vi.mock('@/hooks/useEvents', () => ({
  useTransitionEvent: () => ({ mutate: vi.fn() }),
}))

vi.mock('next/navigation', () => ({
  useParams: () => ({ id: 'event-123' }),
  useRouter: () => ({ push: vi.fn() }),
}))

import EventLivePage from '../page'

describe('EventLivePage — Marcar Ausente', () => {
  it('mostra botão "Marcar Ausente" apenas para participantes WAITING na fila', () => {
    render(<EventLivePage />)
    // Ana Silva está WAITING — deve ter botão
    const buttons = screen.getAllByRole('button', { name: /marcar ausente/i })
    // Ao menos um botão visível
    expect(buttons.length).toBeGreaterThanOrEqual(1)
  })

  it('não mostra botão "Marcar Ausente" para participantes FINISHED', () => {
    render(<EventLivePage />)
    const allAbsentButtons = screen.queryAllByRole('button', { name: /marcar ausente/i })
    allAbsentButtons.forEach((btn) => {
      expect(btn.closest('div')?.textContent).not.toContain('Bruno Costa')
    })
  })

  it('abre dialog de confirmação ao clicar em "Marcar Ausente" na fila', async () => {
    render(<EventLivePage />)
    const button = screen.getAllByRole('button', { name: /marcar ausente/i })[0]
    fireEvent.click(button)
    await waitFor(() => {
      expect(screen.getByText('Marcar participante como ausente?')).toBeInTheDocument()
    })
  })

  it('fecha dialog ao clicar em Cancelar', async () => {
    render(<EventLivePage />)
    fireEvent.click(screen.getAllByRole('button', { name: /marcar ausente/i })[0])
    await waitFor(() => screen.getByText('Marcar participante como ausente?'))
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }))
    await waitFor(() => {
      expect(screen.queryByText('Marcar participante como ausente?')).not.toBeInTheDocument()
    })
  })
})
