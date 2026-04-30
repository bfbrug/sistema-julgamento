import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { AuditFilters } from '../AuditFilters'

describe('AuditFilters', () => {
  const defaultValues = {
    action: '',
    actorId: '',
    entityType: '',
    startDate: '',
    endDate: '',
  }

  it('dispara mudança de filtros ao clicar em Filtrar', () => {
    const onChange = vi.fn()
    render(<AuditFilters values={defaultValues} onChange={onChange} />)

    const select = screen.getByLabelText('Ação')
    fireEvent.change(select, { target: { value: 'LOGIN_FAILED' } })

    fireEvent.click(screen.getByText('Filtrar'))

    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ action: 'LOGIN_FAILED' }))
  })

  it('limpa filtros ao clicar em Limpar', () => {
    const onChange = vi.fn()
    render(
      <AuditFilters
        values={{ ...defaultValues, action: 'LOGIN_FAILED' }}
        onChange={onChange}
      />,
    )

    fireEvent.click(screen.getByText('Limpar'))

    expect(onChange).toHaveBeenCalledWith({
      action: '',
      actorId: '',
      entityType: '',
      startDate: '',
      endDate: '',
    })
  })
})
