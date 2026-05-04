import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import JudgePage from '../page'

const mockUseParams = vi.fn()
vi.mock('next/navigation', () => ({
  useParams: () => mockUseParams(),
  useRouter: () => ({ push: vi.fn() }),
}))

vi.mock('@/hooks/useJudgePanel', () => ({
  useJudgePanel: vi.fn(),
}))

import { useJudgePanel } from '@/hooks/useJudgePanel'

describe('JudgePage', () => {
  beforeEach(() => {
    mockUseParams.mockReturnValue({ eventId: 'event-1' })
  })

  const baseReturn = {
    currentState: 'CONNECTING' as const,
    currentParticipant: null,
    eventInfo: null,
    judgeCategories: [],
    currentScores: {},
    connectionStatus: 'connected' as const,
    isSubmitting: false,
    totalEvaluated: 0,
    openScoringForm: vi.fn(),
    submitScores: vi.fn(),
    editScores: vi.fn(),
    finalizeScores: vi.fn(),
    retryConnection: vi.fn(),
  }

  it('renderiza spinner em CONNECTING', () => {
    vi.mocked(useJudgePanel).mockReturnValue(baseReturn)
    render(<JudgePage />)
    expect(document.querySelector('[class*="animate-spin"]')).toBeInTheDocument()
  })

  it('renderiza WaitingState em WAITING', () => {
    vi.mocked(useJudgePanel).mockReturnValue({ ...baseReturn, currentState: 'WAITING' })
    render(<JudgePage />)
    expect(screen.getByText('Aguardando próximo participante')).toBeInTheDocument()
  })

  it('renderiza ScoringForm em SCORING', () => {
    vi.mocked(useJudgePanel).mockReturnValue({
      ...baseReturn,
      currentState: 'SCORING',
      currentParticipant: {
        id: 'p1',
        name: 'Ana',
        photoUrl: null,
        presentationOrder: 1,
        currentState: 'SCORING',
        myCategoriesToScore: [{ id: 'c1', name: 'Criatividade', displayOrder: 1, currentScore: null }],
        mySessionStatus: 'IN_SCORING',
      },
      eventInfo: { id: 'e1', name: 'Evento', status: 'IN_PROGRESS', scoreMin: 0, scoreMax: 10, totalParticipants: 0, totalEvaluated: 0 },
      judgeCategories: [{ id: 'c1', name: 'Criatividade', displayOrder: 1, currentScore: null }],
    })
    render(<JudgePage />)
    expect(screen.getByLabelText('Criatividade')).toBeInTheDocument()
  })

  it('renderiza EventEndedState em EVENT_ENDED', () => {
    vi.mocked(useJudgePanel).mockReturnValue({
      ...baseReturn,
      currentState: 'EVENT_ENDED',
      eventInfo: { id: 'e1', name: 'Evento Final', status: 'FINISHED', scoreMin: 0, scoreMax: 10, totalParticipants: 0, totalEvaluated: 0 },
    })
    render(<JudgePage />)
    expect(screen.getByText('Evento encerrado. Obrigado pela sua participação!')).toBeInTheDocument()
  })
})
