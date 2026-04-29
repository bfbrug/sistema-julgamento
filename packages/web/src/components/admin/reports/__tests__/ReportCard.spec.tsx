import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/hooks/useReports', () => ({
  useGenerateReport: vi.fn(),
  useJobPolling: vi.fn(),
}))

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn() } }))

import { useGenerateReport, useJobPolling } from '@/hooks/useReports'
import { ReportCard } from '../ReportCard'

const mockMutate = vi.fn()

describe('ReportCard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(useGenerateReport).mockReturnValue({
      mutate: mockMutate,
      isPending: false,
    } as never)
    vi.mocked(useJobPolling).mockReturnValue({ job: null, isPolling: false })
  })

  it('renderiza título e descrição', () => {
    render(
      <ReportCard
        eventId="e1"
        type="TOP_N"
        title="Top 10"
        description="Os 10 primeiros."
        lastJob={null}
      />,
    )
    expect(screen.getByText('Top 10')).toBeInTheDocument()
    expect(screen.getByText('Os 10 primeiros.')).toBeInTheDocument()
  })

  it('botão "Baixar último" desabilitado sem geração prévia', () => {
    render(
      <ReportCard eventId="e1" type="TOP_N" title="Top 10" description="" lastJob={null} />,
    )
    expect(screen.getByRole('button', { name: /baixar/i })).toBeDisabled()
  })

  it('botão "Baixar último" habilitado com job completed', () => {
    const lastJob = { id: 'j1', status: 'completed' as const, completedAt: new Date().toISOString() } as never
    render(
      <ReportCard eventId="e1" type="TOP_N" title="Top 10" description="" lastJob={lastJob} />,
    )
    expect(screen.getByRole('button', { name: /baixar/i })).not.toBeDisabled()
  })

  it('clique em "Gerar PDF" chama generate', () => {
    render(
      <ReportCard eventId="e1" type="TOP_N" title="Top 10" description="" lastJob={null} />,
    )
    fireEvent.click(screen.getByRole('button', { name: /gerar pdf/i }))
    expect(mockMutate).toHaveBeenCalledWith({ type: 'TOP_N' }, expect.any(Object))
  })

  it('mostra progress bar quando polling ativo', () => {
    vi.mocked(useJobPolling).mockReturnValue({
      job: { id: 'j1', status: 'processing' as const, progress: 50 } as never,
      isPolling: true,
    })
    render(
      <ReportCard eventId="e1" type="TOP_N" title="Top 10" description="" lastJob={null} />,
    )
    expect(screen.getByText('50%')).toBeInTheDocument()
  })
})
