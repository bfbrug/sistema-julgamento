import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/hooks/useCertificates', () => ({
  useGenerateCertificates: vi.fn(),
  useCertificateJobPolling: vi.fn(),
}))

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn() } }))

import { useGenerateCertificates, useCertificateJobPolling } from '@/hooks/useCertificates'
import { BatchGenerationCard } from '../BatchGenerationCard'

const mockMutate = vi.fn()

describe('BatchGenerationCard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(useGenerateCertificates).mockReturnValue({
      mutate: mockMutate,
      isPending: false,
    } as never)
    vi.mocked(useCertificateJobPolling).mockReturnValue({ job: null, isPolling: false })
  })

  it('renderiza contagem de participantes', () => {
    render(
      <BatchGenerationCard
        eventId="e1"
        config={{ eventId: 'e1', backgroundPath: 'bg.png', certificateText: 'texto', signatures: [], id: 'c1' }}
        participantCount={5}
      />,
    )
    expect(screen.getByText(/5 participantes cadastrados/)).toBeInTheDocument()
  })

  it('botão desabilitado sem config', () => {
    render(
      <BatchGenerationCard
        eventId="e1"
        config={{ eventId: 'e1', backgroundPath: null, certificateText: '', signatures: [], id: 'c1' }}
        participantCount={0}
      />,
    )
    expect(screen.getByRole('button', { name: /gerar certificados/i })).toBeDisabled()
  })

  it('clique gera certificados', () => {
    render(
      <BatchGenerationCard
        eventId="e1"
        config={{ eventId: 'e1', backgroundPath: 'bg.png', certificateText: 'texto', signatures: [], id: 'c1' }}
        participantCount={2}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: /gerar certificados/i }))
    expect(mockMutate).toHaveBeenCalled()
  })

  it('mostra progresso quando polling', () => {
    vi.mocked(useCertificateJobPolling).mockReturnValue({
      job: { id: 'j1', status: 'processing', progress: 50 } as never,
      isPolling: true,
    })
    render(
      <BatchGenerationCard
        eventId="e1"
        config={{ eventId: 'e1', backgroundPath: 'bg.png', certificateText: 'texto', signatures: [], id: 'c1' }}
        participantCount={2}
      />,
    )
    expect(screen.getByText((content) => content.includes('50') && content.includes('%'))).toBeInTheDocument()
  })
})
