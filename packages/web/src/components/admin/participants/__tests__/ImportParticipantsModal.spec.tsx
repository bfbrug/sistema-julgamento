import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { ImportParticipantsModal } from '../ImportParticipantsModal'

// Mock papaparse para controle síncrono nos testes
vi.mock('papaparse', () => ({
  default: {
    parse: vi.fn((file: File, options: { complete: (r: { data: string[][] }) => void; skipEmptyLines: boolean }) => {
      // Lê o conteúdo do arquivo de forma síncrona via FileReader mock
      const reader = new FileReader()
      reader.onload = (e) => {
        const text = e.target?.result as string
        const rows = text.split('\n').filter(Boolean).map((line) => [line.trim()])
        options.complete({ data: rows })
      }
      reader.readAsText(file)
    }),
  },
}))

vi.mock('xlsx', () => ({
  read: vi.fn(),
  utils: { sheet_to_json: vi.fn() },
}))

vi.mock('@/hooks/useParticipants', () => ({
  useImportParticipants: vi.fn(() => ({
    mutate: vi.fn(),
    isPending: false,
  })),
}))

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}))

import { useImportParticipants } from '@/hooks/useParticipants'

const mockExistingParticipants = [
  {
    id: '1',
    eventId: 'event-1',
    name: 'Ana Silva',
    presentationOrder: 1,
    isAbsent: false,
    currentState: 'WAITING' as const,
    photoPath: null,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  },
] as Parameters<typeof ImportParticipantsModal>[0]['existingParticipants']

describe('ImportParticipantsModal', () => {
  const onClose = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    ;(useImportParticipants as ReturnType<typeof vi.fn>).mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    })
  })

  it('renderiza drop zone na etapa 1', () => {
    render(
      <ImportParticipantsModal
        eventId="event-1"
        existingParticipants={mockExistingParticipants}
        onClose={onClose}
      />,
    )

    expect(screen.getByText(/arraste e solte/i)).toBeInTheDocument()
    expect(document.querySelector('input[type="file"]')).toBeInTheDocument()
  })

  it('após parse de CSV exibe etapa 2 com nomes', async () => {
    render(
      <ImportParticipantsModal
        eventId="event-1"
        existingParticipants={[]}
        onClose={onClose}
      />,
    )

    const csvContent = 'Bruno Costa\nCarlos Mendes\nDiana Lima'
    const file = new File([csvContent], 'test.csv', { type: 'text/csv' })
    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    fireEvent.change(input, { target: { files: [file] } })

    await waitFor(() => {
      expect(screen.getByText('Bruno Costa')).toBeInTheDocument()
    }, { timeout: 3000 })

    expect(screen.getByText('Carlos Mendes')).toBeInTheDocument()
    expect(screen.getByText('Diana Lima')).toBeInTheDocument()
  })

  it('marca nome duplicado como "já existe"', async () => {
    render(
      <ImportParticipantsModal
        eventId="event-1"
        existingParticipants={mockExistingParticipants}
        onClose={onClose}
      />,
    )

    const csvContent = 'Ana Silva\nBruno Costa'
    const file = new File([csvContent], 'test.csv', { type: 'text/csv' })
    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    fireEvent.change(input, { target: { files: [file] } })

    await waitFor(() => {
      expect(screen.getAllByText(/já existe/i).length).toBeGreaterThan(0)
    }, { timeout: 3000 })
  })

  it('clique em Confirmar chama hook com nomes corretos', async () => {
    const mockMutate = vi.fn()
    ;(useImportParticipants as ReturnType<typeof vi.fn>).mockReturnValue({
      mutate: mockMutate,
      isPending: false,
    })

    render(
      <ImportParticipantsModal
        eventId="event-1"
        existingParticipants={[]}
        onClose={onClose}
      />,
    )

    const csvContent = 'Ana\nBruno'
    const file = new File([csvContent], 'test.csv', { type: 'text/csv' })
    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    fireEvent.change(input, { target: { files: [file] } })

    await waitFor(() => screen.getByText('Ana'), { timeout: 3000 })

    fireEvent.click(screen.getByRole('button', { name: /confirmar importação/i }))

    expect(mockMutate).toHaveBeenCalledWith(
      { names: ['Ana', 'Bruno'] },
      expect.any(Object),
    )
  })
})
