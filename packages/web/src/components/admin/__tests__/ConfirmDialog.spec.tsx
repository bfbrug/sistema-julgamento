import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ConfirmDialog } from '../ConfirmDialog'

describe('ConfirmDialog', () => {
  it('should not render when closed', () => {
    const { container } = render(
      <ConfirmDialog
        isOpen={false}
        onClose={() => {}}
        onConfirm={() => {}}
        title="Test Title"
        message="Test Message"
      />
    )
    expect(container.firstChild).toBeNull()
  })

  it('should render title and message when open', () => {
    render(
      <ConfirmDialog
        isOpen={true}
        onClose={() => {}}
        onConfirm={() => {}}
        title="Delete Item"
        message="Are you sure?"
      />
    )
    expect(screen.getByText('Delete Item')).toBeInTheDocument()
    expect(screen.getByText('Are you sure?')).toBeInTheDocument()
  })

  it('should call onConfirm when confirm button is clicked', () => {
    const onConfirm = vi.fn()
    render(
      <ConfirmDialog
        isOpen={true}
        onClose={() => {}}
        onConfirm={onConfirm}
        title="Delete Item"
        message="Are you sure?"
      />
    )
    fireEvent.click(screen.getByText('Confirmar'))
    expect(onConfirm).toHaveBeenCalled()
  })

  it('should call onClose when cancel button is clicked', () => {
    const onClose = vi.fn()
    render(
      <ConfirmDialog
        isOpen={true}
        onClose={onClose}
        onConfirm={() => {}}
        title="Delete Item"
        message="Are you sure?"
      />
    )
    fireEvent.click(screen.getByText('Cancelar'))
    expect(onClose).toHaveBeenCalled()
  })
})
