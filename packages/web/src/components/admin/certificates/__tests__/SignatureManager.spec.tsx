import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/hooks/useCertificates', () => ({
  useAddSignature: vi.fn(),
  useRemoveSignature: vi.fn(),
  useUpdateSignature: vi.fn(),
}))

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

vi.mock('@dnd-kit/core', async () => {
  const actual = await vi.importActual('@dnd-kit/core')
  return {
    ...actual,
    DndContext: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  }
})
vi.mock('@dnd-kit/sortable', async () => {
  const actual = await vi.importActual('@dnd-kit/sortable')
  return {
    ...actual,
    SortableContext: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    useSortable: () => ({
      attributes: {},
      listeners: {},
      setNodeRef: () => {},
      transform: null,
      transition: null,
      isDragging: false,
    }),
  }
})

import { useAddSignature, useRemoveSignature, useUpdateSignature } from '@/hooks/useCertificates'
import { SignatureManager } from '../SignatureManager'
import type { CertificateSignature } from '@judging/shared'

const mockAdd = vi.fn()
const mockRemove = vi.fn()
const mockUpdate = vi.fn()

const sig1: CertificateSignature = {
  id: 's1',
  imagePath: 'sigs/sig1.png',
  personName: 'Dr. Carlos',
  personRole: 'Diretor',
  displayOrder: 1,
}

const sig2: CertificateSignature = {
  id: 's2',
  imagePath: 'sigs/sig2.png',
  personName: 'Profa. Ana',
  personRole: 'Coordenadora',
  displayOrder: 2,
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(useAddSignature).mockReturnValue({ mutate: mockAdd, isPending: false } as never)
  vi.mocked(useRemoveSignature).mockReturnValue({ mutate: mockRemove, isPending: false } as never)
  vi.mocked(useUpdateSignature).mockReturnValue({ mutate: mockUpdate, isPending: false } as never)
})

describe('SignatureManager', () => {
  it('renderiza 3 slots — 2 preenchidos e 1 vazio', () => {
    render(<SignatureManager eventId="e1" signatures={[sig1, sig2]} />)
    expect(screen.getByText('Dr. Carlos')).toBeInTheDocument()
    expect(screen.getByText('Profa. Ana')).toBeInTheDocument()
    expect(screen.getByText('+ Adicionar assinatura')).toBeInTheDocument()
  })

  it('slot vazio mostra formulário ao clicar', () => {
    render(<SignatureManager eventId="e1" signatures={[sig1, sig2]} />)
    fireEvent.click(screen.getByText('+ Adicionar assinatura'))
    expect(screen.getByPlaceholderText('Nome de quem assina')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Cargo')).toBeInTheDocument()
  })

  it('botão Salvar desabilitado sem arquivo selecionado', () => {
    render(<SignatureManager eventId="e1" signatures={[sig1, sig2]} />)
    fireEvent.click(screen.getByText('+ Adicionar assinatura'))
    const saveBtn = screen.getByRole('button', { name: /salvar/i })
    expect(saveBtn).toBeDisabled()
  })

  it('chama remove ao clicar em Remover', () => {
    render(<SignatureManager eventId="e1" signatures={[sig1]} />)
    fireEvent.click(screen.getByRole('button', { name: /remover/i }))
    expect(mockRemove).toHaveBeenCalledWith('s1')
  })

  it('não renderiza slot vazio quando há 3 assinaturas', () => {
    const sig3: CertificateSignature = { id: 's3', imagePath: 'sigs/sig3.png', personName: 'João', personRole: 'Gestor', displayOrder: 3 }
    render(<SignatureManager eventId="e1" signatures={[sig1, sig2, sig3]} />)
    expect(screen.queryByText('+ Adicionar assinatura')).not.toBeInTheDocument()
  })
})
