import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/hooks/useCertificates', () => ({
  useUpdateCertificateText: vi.fn(),
}))

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn() } }))

import { useUpdateCertificateText } from '@/hooks/useCertificates'
import { CertificateTextEditor } from '../CertificateTextEditor'

const mockMutate = vi.fn()

describe('CertificateTextEditor', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(useUpdateCertificateText).mockReturnValue({
      mutate: mockMutate,
      isPending: false,
    } as never)
  })

  it('renderiza textarea com texto inicial', () => {
    render(<CertificateTextEditor eventId="e1" initialText="Texto inicial" />)
    expect(screen.getByDisplayValue('Texto inicial')).toBeInTheDocument()
  })

  it('insere placeholder ao clicar no botão', () => {
    render(<CertificateTextEditor eventId="e1" initialText="" />)
    fireEvent.click(screen.getByText('Participante'))
    expect(screen.getByDisplayValue('{{participante}}')).toBeInTheDocument()
  })

  it('chama mutate ao salvar', () => {
    render(<CertificateTextEditor eventId="e1" initialText="texto" />)
    fireEvent.click(screen.getByRole('button', { name: /salvar texto/i }))
    expect(mockMutate).toHaveBeenCalledWith({ certificateText: 'texto' })
  })

  it('desabilita botão se texto > 1500 caracteres', () => {
    render(<CertificateTextEditor eventId="e1" initialText={'x'.repeat(1501)} />)
    expect(screen.getByRole('button', { name: /salvar texto/i })).toBeDisabled()
  })
})
