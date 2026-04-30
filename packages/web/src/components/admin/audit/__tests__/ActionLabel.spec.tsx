import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ActionLabel } from '../ActionLabel'

describe('ActionLabel', () => {
  it('traduz ação conhecida', () => {
    render(<ActionLabel action="SCORES_REGISTERED" />)
    expect(screen.getByText('Notas registradas')).toBeInTheDocument()
  })

  it('retorna código para ação desconhecida', () => {
    render(<ActionLabel action="UNKNOWN_ACTION" />)
    expect(screen.getByText('UNKNOWN_ACTION')).toBeInTheDocument()
  })
})
