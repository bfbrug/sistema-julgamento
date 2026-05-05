# Design: Marcar Ausente com Confirmação no Painel Live

**Data:** 2026-05-05
**Status:** Aprovado

## Contexto

Durante um evento `IN_PROGRESS`, um participante pode não comparecer ou desistir antes/durante sua vez. O sistema já suporta a operação no backend (`POST /events/:eventId/scoring/mark-absent/:participantId`), mas a UI tinha restrições:

1. Botão "Marcar Ausente" só aparecia no card em destaque (próximo na fila), sem confirmação.
2. Participantes `WAITING` na fila de espera não tinham ação disponível.

## Objetivo

- Adicionar confirmação (dialog) ao botão já existente no card em destaque.
- Adicionar botão "Marcar Ausente" + confirmação para cada participante `WAITING` na fila de espera.
- Não alterar backend, hook `useLiveScoring`, nem serviços.

## Decisões

- **Ausente vs Desistente:** semanticamente idênticos — sem novo estado, sem novo campo. `ABSENT` cobre ambos.
- **Sem Radix/shadcn:** projeto não usa. Dialog implementado com `<dialog>` nativo HTML5.
- **Um estado de controle:** `confirmAbsentId: string | null` na live page. Único dialog para ambos os pontos de entrada.

## Componente `ConfirmDialog`

**Localização:** `packages/web/src/components/ui/ConfirmDialog.tsx`

**Props:**
```ts
interface ConfirmDialogProps {
  open: boolean
  title: string
  description?: string
  confirmLabel?: string   // default: "Confirmar"
  cancelLabel?: string    // default: "Cancelar"
  loading?: boolean
  onConfirm: () => void
  onClose: () => void
}
```

**Comportamento:**
- Usa `<dialog>` nativo com `ref.current.showModal()` / `ref.current.close()`.
- Fecha com `Escape` (nativo do browser).
- Overlay via CSS `::backdrop`.
- Foco preso dentro do dialog enquanto aberto.
- Botão confirmar: variante `danger`. Botão cancelar: variante `secondary`.

## Mudanças na `live/page.tsx`

### Estado adicionado
```ts
const [confirmAbsentId, setConfirmAbsentId] = useState<string | null>(null)
```

### Handler
```ts
const handleConfirmAbsent = () => {
  if (!confirmAbsentId) return
  markAbsent(confirmAbsentId)
  setConfirmAbsentId(null)
}
```

### Card em destaque (ponto 1)
Botão existente `onClick={() => markAbsent(subject.id)}` → `onClick={() => setConfirmAbsentId(subject.id)}`.

### Fila de espera (ponto 2)
Cada item com `p.status === 'WAITING'` recebe botão adicional:
```tsx
<button ... onClick={() => setConfirmAbsentId(p.id)}>
  Marcar Ausente
</button>
```

### Dialog (único, no fim do JSX)
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

## Fluxo de Interação

```
Gestor clica "Marcar Ausente" (fila ou destaque)
  → setConfirmAbsentId(participantId)
  → ConfirmDialog abre

Gestor clica "Cancelar" ou pressiona Escape
  → setConfirmAbsentId(null)
  → dialog fecha, nenhuma ação

Gestor clica "Marcar Ausente" no dialog
  → markAbsent(confirmAbsentId)   // POST /events/:id/scoring/mark-absent/:pid
  → setConfirmAbsentId(null)
  → fetchState() (já dentro do hook)
  → participante some da fila ativa, aparece como AUSENTE
```

## Arquivos Alterados

| Arquivo | Tipo |
|---|---|
| `packages/web/src/components/ui/ConfirmDialog.tsx` | Novo |
| `packages/web/src/app/(admin)/events/[id]/live/page.tsx` | Modificado |

## Testes

- `ConfirmDialog` renderiza com `open=true` e `open=false`.
- Clique em "Cancelar" chama `onClose`, não chama `onConfirm`.
- Clique em "Confirmar" chama `onConfirm`.
- Live page: botão "Marcar Ausente" aparece em itens `WAITING` da fila.
- Live page: botão não aparece em itens `FINISHED` ou `ABSENT`.
