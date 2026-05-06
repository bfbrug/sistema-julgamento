import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('next/navigation', () => ({
  useParams: vi.fn().mockReturnValue({ id: 'event-1' }),
  useRouter: () => ({ push: vi.fn() }),
}))

vi.mock('@/hooks/useReports', () => ({
  useReportJobs: vi.fn(),
  useGenerateReport: vi.fn(),
  useJobPolling: vi.fn(),
}))

vi.mock('@/hooks/useEvents', () => ({
  useEvent: vi.fn().mockReturnValue({ data: { name: 'Evento Teste' } }),
}))

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn() } }))

import { useReportJobs, useGenerateReport, useJobPolling } from '@/hooks/useReports'
import ReportsPage from '../page'

describe('ReportsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(useGenerateReport).mockReturnValue({ mutate: vi.fn(), isPending: false } as never)
    vi.mocked(useJobPolling).mockReturnValue({ job: null, isPolling: false })
  })

  it('mostra spinner quando carregando', () => {
    vi.mocked(useReportJobs).mockReturnValue({ data: undefined, isLoading: true } as never)
    render(<ReportsPage />)
    expect(screen.getByText('Carregando...')).toBeInTheDocument()
  })

  it('renderiza 3 cards quando dados carregados', () => {
    vi.mocked(useReportJobs).mockReturnValue({
      data: { TOP_N: null, GENERAL: null, DETAILED_BY_JUDGE: null },
      isLoading: false,
    } as never)
    render(<ReportsPage />)
    expect(screen.getByText('Top N')).toBeInTheDocument()
    expect(screen.getByText('Classificação Geral')).toBeInTheDocument()
    expect(screen.getByText('Detalhado por Jurado')).toBeInTheDocument()
  })

  it('renderiza header da página', () => {
    vi.mocked(useReportJobs).mockReturnValue({ data: {}, isLoading: false } as never)
    render(<ReportsPage />)
    expect(screen.getByText('Relatórios')).toBeInTheDocument()
  })
})
