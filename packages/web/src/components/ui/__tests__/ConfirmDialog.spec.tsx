import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeAll } from 'vitest'
import { ConfirmDialog } from '../ConfirmDialog'

// Mock HTMLDialogElement.showModal and close for jsdom
beforeAll(() => {
  // Mock showModal to do nothing
  HTMLDialogElement.prototype.showModal = vi.fn(function (this: HTMLDialogElement) {
    this.open = true
  })

  // Mock close to do nothing
  HTMLDialogElement.prototype.close = vi.fn(function (this: HTMLDialogElement) {
    this.open = false
  })

  // Mock open property
  if (!Object.getOwnPropertyDescriptor(HTMLDialogElement.prototype, 'open')) {
    Object.defineProperty(HTMLDialogElement.prototype, 'open', {
      get(this: HTMLDialogElement) {
        return this.getAttribute('open') !== null
      },
      set(this: HTMLDialogElement, value: boolean) {
        if (value) {
          this.setAttribute('open', '')
        } else {
          this.removeAttribute('open')
        }
      },
      configurable: true,
    })
  }
})

describe('ConfirmDialog', () => {
  it('não renderiza conteúdo quando open=false', () => {
    render(
      <ConfirmDialog
        open={false}
        title="Confirmar?"
        onConfirm={vi.fn()}
        onClose={vi.fn()}
      />
    )
    expect(screen.queryByText('Confirmar?')).not.toBeInTheDocument()
  })

  it('renderiza título e botões quando open=true', () => {
    render(
      <ConfirmDialog
        open={true}
        title="Marcar ausente?"
        description="Esta ação não pode ser desfeita."
        onConfirm={vi.fn()}
        onClose={vi.fn()}
      />
    )
    expect(screen.getByText('Marcar ausente?')).toBeInTheDocument()
    expect(screen.getByText('Esta ação não pode ser desfeita.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Confirmar' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Cancelar' })).toBeInTheDocument()
  })

  it('chama onConfirm ao clicar em confirmar', () => {
    const onConfirm = vi.fn()
    render(
      <ConfirmDialog
        open={true}
        title="Confirmar?"
        onConfirm={onConfirm}
        onClose={vi.fn()}
      />
    )
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar' }))
    expect(onConfirm).toHaveBeenCalledTimes(1)
  })

  it('chama onClose ao clicar em cancelar', () => {
    const onClose = vi.fn()
    render(
      <ConfirmDialog
        open={true}
        title="Confirmar?"
        onConfirm={vi.fn()}
        onClose={onClose}
      />
    )
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('usa confirmLabel e cancelLabel customizados', () => {
    render(
      <ConfirmDialog
        open={true}
        title="Confirmar?"
        confirmLabel="Sim, marcar"
        cancelLabel="Não, voltar"
        onConfirm={vi.fn()}
        onClose={vi.fn()}
      />
    )
    expect(screen.getByRole('button', { name: 'Sim, marcar' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Não, voltar' })).toBeInTheDocument()
  })

  it('desabilita botão confirmar quando loading=true', () => {
    render(
      <ConfirmDialog
        open={true}
        title="Confirmar?"
        loading={true}
        onConfirm={vi.fn()}
        onClose={vi.fn()}
      />
    )
    expect(screen.getByRole('button', { name: /confirmar/i })).toBeDisabled()
  })
})
