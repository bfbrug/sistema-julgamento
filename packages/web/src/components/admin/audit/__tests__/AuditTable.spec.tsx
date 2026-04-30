import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { AuditTable } from '../AuditTable'

describe('AuditTable', () => {
  const mockData = [
    {
      id: 'log-1',
      actorId: 'user-1',
      actorType: 'USER' as const,
      actorName: 'Admin',
      action: 'EVENT_CREATED',
      entityType: 'JudgingEvent',
      entityId: 'event-1',
      payload: {},
      ipAddress: null,
      userAgent: null,
      createdAt: '2024-01-01T00:00:00Z',
    },
  ]

  it('renderiza linhas de auditoria', () => {
    render(<AuditTable data={mockData} isLoading={false} onRowClick={vi.fn()} />)
    expect(screen.getByText('Admin')).toBeInTheDocument()
    expect(screen.getByText('Evento criado')).toBeInTheDocument()
  })

  it('abre drawer ao clicar na linha', () => {
    const onRowClick = vi.fn()
    render(<AuditTable data={mockData} isLoading={false} onRowClick={onRowClick} />)
    fireEvent.click(screen.getByText('Admin'))
    expect(onRowClick).toHaveBeenCalledWith(mockData[0])
  })

  it('mostra estado vazio', () => {
    render(<AuditTable data={[]} isLoading={false} onRowClick={vi.fn()} />)
    expect(screen.getByText('Nenhum registro de auditoria encontrado.')).toBeInTheDocument()
  })

  it('mostra skeleton no loading', () => {
    render(<AuditTable data={undefined} isLoading={true} onRowClick={vi.fn()} />)
    expect(document.querySelector('.animate-pulse')).toBeInTheDocument()
  })
})
