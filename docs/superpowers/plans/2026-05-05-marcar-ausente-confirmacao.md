# Marcar Ausente com Confirmação — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Adicionar dialog de confirmação ao botão "Marcar Ausente" existente e expor o mesmo botão para todos os participantes `WAITING` na fila de espera do painel live.

**Architecture:** Novo componente `ConfirmDialog` usando `<dialog>` nativo HTML5 (sem dependências externas). A `live/page.tsx` recebe um único estado `confirmAbsentId` que controla qual participante está pendente de confirmação — um dialog serve os dois pontos de entrada (card em destaque + fila). Nenhuma mudança de backend.

**Tech Stack:** React 19, Next.js 15, Tailwind CSS v4, Vitest + Testing Library, TypeScript.

---

## Mapa de Arquivos

| Arquivo | Ação |
|---|---|
| `packages/web/src/components/ui/ConfirmDialog.tsx` | Criar |
| `packages/web/src/components/ui/__tests__/ConfirmDialog.spec.tsx` | Criar |
| `packages/web/src/app/(admin)/events/[id]/live/page.tsx` | Modificar |

---

### Task 1: Componente `ConfirmDialog`

**Files:**
- Create: `packages/web/src/components/ui/ConfirmDialog.tsx`
- Test: `packages/web/src/components/ui/__tests__/ConfirmDialog.spec.tsx`

- [ ] **Step 1: Escrever os testes que falham**

Arquivo: `packages/web/src/components/ui/__tests__/ConfirmDialog.spec.tsx`

```tsx
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { ConfirmDialog } from '../ConfirmDialog'

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
```

- [ ] **Step 2: Rodar testes para verificar que falham**

```bash
cd packages/web && npx vitest run src/components/ui/__tests__/ConfirmDialog.spec.tsx
```

Esperado: FAIL — `ConfirmDialog` não existe.

- [ ] **Step 3: Implementar `ConfirmDialog`**

Arquivo: `packages/web/src/components/ui/ConfirmDialog.tsx`

```tsx
'use client'

import { useEffect, useRef } from 'react'
import { Button } from './Button'

interface ConfirmDialogProps {
  open: boolean
  title: string
  description?: string
  confirmLabel?: string
  cancelLabel?: string
  loading?: boolean
  onConfirm: () => void
  onClose: () => void
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  loading = false,
  onConfirm,
  onClose,
}: ConfirmDialogProps) {
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open) {
      dialog.showModal()
    } else {
      dialog.close()
    }
  }, [open])

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    const handleCancel = (e: Event) => {
      e.preventDefault()
      onClose()
    }
    dialog.addEventListener('cancel', handleCancel)
    return () => dialog.removeEventListener('cancel', handleCancel)
  }, [onClose])

  if (!open) return null

  return (
    <dialog
      ref={ref}
      className="rounded-lg shadow-xl p-0 w-full max-w-sm backdrop:bg-black/40"
      onClick={(e) => {
        if (e.target === ref.current) onClose()
      }}
    >
      <div className="p-6 flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <h2 className="text-base font-semibold text-secondary-900">{title}</h2>
          {description && (
            <p className="text-sm text-secondary-500">{description}</p>
          )}
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" size="sm" onClick={onClose} disabled={loading}>
            {cancelLabel}
          </Button>
          <Button variant="danger" size="sm" onClick={onConfirm} loading={loading}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </dialog>
  )
}
```

- [ ] **Step 4: Rodar testes para verificar que passam**

```bash
cd packages/web && npx vitest run src/components/ui/__tests__/ConfirmDialog.spec.tsx
```

Esperado: todos PASS.

- [ ] **Step 5: Checar tipos**

```bash
cd packages/web && npx tsc --noEmit
```

Esperado: sem erros.

- [ ] **Step 6: Commit**

```bash
git add packages/web/src/components/ui/ConfirmDialog.tsx packages/web/src/components/ui/__tests__/ConfirmDialog.spec.tsx
git commit -m "feat(web): adicionar componente ConfirmDialog nativo"
```

---

### Task 2: Integrar `ConfirmDialog` na live page

**Files:**
- Modify: `packages/web/src/app/(admin)/events/[id]/live/page.tsx`

> **Contexto do arquivo:** A live page usa o hook `useLiveScoring(eventId)` que expõe `{ liveState, isConnected, activateParticipant, markAbsent }`. O `liveState` tem `{ currentParticipant, queue, judges }`. Cada item da queue tem `{ id, name, status, presentationOrder, photoUrl }`.
>
> Linhas-chave atuais:
> - ~28: desestruturação de `useLiveScoring`
> - ~122-128: card em destaque — botão "Marcar Ausente" existente
> - ~229-253: lista da fila de espera

- [ ] **Step 1: Ler o arquivo atual completo**

```bash
cat 'packages/web/src/app/(admin)/events/[id]/live/page.tsx'
```

Anotar linhas exatas dos dois trechos a modificar antes de editar.

- [ ] **Step 2: Adicionar import e estado**

No topo do arquivo, adicionar import:
```tsx
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
```

Dentro do componente `EventLivePage`, após as declarações de hooks existentes, adicionar:
```tsx
const [confirmAbsentId, setConfirmAbsentId] = useState<string | null>(null)

const handleConfirmAbsent = () => {
  if (!confirmAbsentId) return
  markAbsent(confirmAbsentId)
  setConfirmAbsentId(null)
}
```

Adicionar `useState` ao import do React se não estiver (verificar — provavelmente já está).

- [ ] **Step 3: Atualizar botão no card em destaque**

Localizar o trecho (aproximadamente):
```tsx
<Button size="sm" variant="ghost" className="text-danger-600 text-xs" onClick={() => markAbsent(subject.id)}>
  Marcar Ausente
</Button>
```

Substituir por:
```tsx
<Button size="sm" variant="ghost" className="text-danger-600 text-xs" onClick={() => setConfirmAbsentId(subject.id)}>
  Marcar Ausente
</Button>
```

- [ ] **Step 4: Adicionar botão na fila de espera**

Localizar o trecho de renderização de cada item da fila. Ele tem estrutura aproximada:
```tsx
{queue items map}
  <div key={p.id} ...>
    {p.status === 'ABSENT' && <AlertCircle ... />}
    ...nome e ordem...
  </div>
```

Adicionar botão "Marcar Ausente" visível apenas quando `p.status === 'WAITING'`. Inserir **dentro** do `div` do item, ao lado do nome:

```tsx
{p.status === 'WAITING' && (
  <button
    className="ml-auto text-xs text-danger-500 hover:text-danger-700 hover:underline flex-shrink-0"
    onClick={() => setConfirmAbsentId(p.id)}
  >
    Marcar Ausente
  </button>
)}
```

- [ ] **Step 5: Adicionar `ConfirmDialog` no JSX**

No final do JSX retornado pelo componente, antes do `</div>` de fechamento:

```tsx
<ConfirmDialog
  open={confirmAbsentId !== null}
  title="Marcar participante como ausente?"
  description="Esta ação não pode ser desfeita durante o evento."
  confirmLabel="Marcar Ausente"
  onConfirm={handleConfirmAbsent}
  onClose={() => setConfirmAbsentId(null)}
/>
```

- [ ] **Step 6: Checar tipos**

```bash
cd packages/web && npx tsc --noEmit
```

Esperado: sem erros.

- [ ] **Step 7: Rodar todos os testes**

```bash
cd packages/web && npx vitest run
```

Esperado: todos PASS, sem regressões.

- [ ] **Step 8: Commit**

```bash
git add 'packages/web/src/app/(admin)/events/[id]/live/page.tsx'
git commit -m "feat(web): marcar ausente com confirmação no painel live"
```

---

### Task 3: Teste de integração da live page

**Files:**
- Locate existing test (se existir): `packages/web/src/app/(admin)/events/[id]/live/__tests__/` ou similar
- Create if not exists: `packages/web/src/app/(admin)/events/[id]/live/__tests__/page.spec.tsx`

> **Contexto:** Verificar se já existe arquivo de teste para a live page:
> ```bash
> find packages/web/src -path '*/live*spec*' -o -path '*/live*test*' 2>/dev/null
> ```

- [ ] **Step 1: Verificar se existe teste para a live page**

```bash
find packages/web/src -name '*.spec.tsx' | grep live
```

Se existir: adicionar casos ao arquivo existente.
Se não existir: criar `packages/web/src/app/(admin)/events/[id]/live/__tests__/page.spec.tsx`.

- [ ] **Step 2: Escrever testes de integração**

```tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock hooks
vi.mock('@/hooks/useLiveScoring', () => ({
  useLiveScoring: () => ({
    liveState: {
      currentParticipant: null,
      queue: [
        { id: 'p1', name: 'Ana Silva', status: 'WAITING', presentationOrder: 1, photoUrl: null },
        { id: 'p2', name: 'Bruno Costa', status: 'FINISHED', presentationOrder: 2, photoUrl: null },
        { id: 'p3', name: 'Carla Dias', status: 'ABSENT', presentationOrder: 3, photoUrl: null },
      ],
      judges: [],
    },
    isConnected: true,
    activateParticipant: vi.fn(),
    markAbsent: vi.fn(),
  }),
}))

vi.mock('@/hooks/useEvents', () => ({
  useTransitionEvent: () => ({ mutate: vi.fn() }),
}))

vi.mock('next/navigation', () => ({
  useParams: () => ({ id: 'event-123' }),
  useRouter: () => ({ push: vi.fn() }),
}))

import EventLivePage from '../page'

describe('EventLivePage — Marcar Ausente', () => {
  it('mostra botão "Marcar Ausente" apenas para participantes WAITING na fila', () => {
    render(<EventLivePage />)
    // Ana Silva está WAITING — deve ter botão
    const buttons = screen.getAllByRole('button', { name: /marcar ausente/i })
    // Ao menos um botão visível
    expect(buttons.length).toBeGreaterThanOrEqual(1)
  })

  it('não mostra botão "Marcar Ausente" para participantes FINISHED', () => {
    render(<EventLivePage />)
    // Verificar que Bruno Costa (FINISHED) não tem botão associado
    const brunoRow = screen.getByText('Bruno Costa').closest('div')
    expect(brunoRow?.querySelector('button')).toBeNull()
  })

  it('abre dialog de confirmação ao clicar em "Marcar Ausente" na fila', async () => {
    render(<EventLivePage />)
    const button = screen.getAllByRole('button', { name: /marcar ausente/i })[0]
    fireEvent.click(button)
    await waitFor(() => {
      expect(screen.getByText('Marcar participante como ausente?')).toBeInTheDocument()
    })
  })

  it('fecha dialog ao clicar em Cancelar', async () => {
    render(<EventLivePage />)
    fireEvent.click(screen.getAllByRole('button', { name: /marcar ausente/i })[0])
    await waitFor(() => screen.getByText('Marcar participante como ausente?'))
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }))
    await waitFor(() => {
      expect(screen.queryByText('Marcar participante como ausente?')).not.toBeInTheDocument()
    })
  })
})
```

- [ ] **Step 3: Rodar testes**

```bash
cd packages/web && npx vitest run
```

Esperado: todos PASS.

- [ ] **Step 4: Commit**

```bash
git add packages/web/src/app/(admin)/events/[id]/live/__tests__/
git commit -m "test(web): testes de integração para marcar ausente no painel live"
```

---

## Verificação Final

- [ ] `npx tsc --noEmit` sem erros
- [ ] `npx vitest run --coverage` todos PASS
- [ ] Testar manualmente: abrir evento `IN_PROGRESS`, verificar botão na fila + card em destaque, confirmar dialog funciona, participante some da fila ativa
