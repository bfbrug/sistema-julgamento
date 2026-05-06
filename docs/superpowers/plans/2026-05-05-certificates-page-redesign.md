# Certificates Page Redesign — Plano de Implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesenhar a página de certificados com layout duas colunas, texto padrão pré-preenchido, preview de assinatura imediato após upload, e reordenação por drag-and-drop.

**Architecture:** A page (`certificates/page.tsx`) recebe novo layout duas colunas no topo. `CertificateTextEditor` ganha texto padrão e chips redesenhados. `SignatureManager` é reescrito com grid 3 colunas, slot-inline para upload, preview local via `URL.createObjectURL`, e drag-and-drop via `@dnd-kit/sortable`.

**Tech Stack:** Next.js 14 App Router, React, TailwindCSS, @dnd-kit/core + @dnd-kit/sortable, @tanstack/react-query, Vitest + @testing-library/react

---

## Mapa de Arquivos

| Arquivo | Ação |
|---------|------|
| `packages/web/src/app/(admin)/events/[id]/certificates/page.tsx` | Modificar — novo layout duas colunas |
| `packages/web/src/components/admin/certificates/CertificateTextEditor.tsx` | Modificar — texto padrão + chips redesenhados |
| `packages/web/src/components/admin/certificates/SignatureManager.tsx` | Rewrite — grid 3 colunas, inline upload, drag-and-drop |
| `packages/web/src/components/admin/certificates/__tests__/CertificateTextEditor.spec.tsx` | Modificar — adicionar teste do texto padrão |
| `packages/web/src/components/admin/certificates/__tests__/SignatureManager.spec.tsx` | Criar — testes do novo SignatureManager |

---

## Tarefa 1: Texto padrão no `CertificateTextEditor`

**Arquivos:**
- Modificar: `packages/web/src/components/admin/certificates/CertificateTextEditor.tsx`
- Modificar: `packages/web/src/components/admin/certificates/__tests__/CertificateTextEditor.spec.tsx`

- [ ] **Step 1: Adicionar teste para texto padrão quando `initialText` é vazio**

Abra `packages/web/src/components/admin/certificates/__tests__/CertificateTextEditor.spec.tsx` e adicione este teste ao `describe` existente:

```tsx
it('preenche texto padrão quando initialText está vazio', () => {
  render(<CertificateTextEditor eventId="e1" initialText="" />)
  const textarea = screen.getByRole('textbox')
  expect(textarea).toHaveValue(
    'Certificamos que {{participante}} participou do evento {{evento}}, realizado em {{data}} em {{local}}, organizado por {{organizador}}.'
  )
})
```

- [ ] **Step 2: Rodar o teste — deve falhar**

```bash
cd packages/web && pnpm test -- --run CertificateTextEditor
```

Esperado: FAIL — textarea tem valor vazio em vez do texto padrão.

- [ ] **Step 3: Implementar texto padrão em `CertificateTextEditor.tsx`**

Substitua o arquivo inteiro por:

```tsx
'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/Button'
import { useUpdateCertificateText } from '@/hooks/useCertificates'

const DEFAULT_TEXT =
  'Certificamos que {{participante}} participou do evento {{evento}}, realizado em {{data}} em {{local}}, organizado por {{organizador}}.'

const PLACEHOLDERS = [
  { key: '{{participante}}', label: 'Participante' },
  { key: '{{evento}}', label: 'Evento' },
  { key: '{{data}}', label: 'Data' },
  { key: '{{local}}', label: 'Local' },
  { key: '{{organizador}}', label: 'Organizador' },
]

interface CertificateTextEditorProps {
  eventId: string
  initialText: string
}

export function CertificateTextEditor({ eventId, initialText }: CertificateTextEditorProps) {
  const [text, setText] = useState(initialText || DEFAULT_TEXT)
  const { mutate: save, isPending } = useUpdateCertificateText(eventId)

  useEffect(() => {
    setText(initialText || DEFAULT_TEXT)
  }, [initialText])

  const insertPlaceholder = (placeholder: string) => {
    setText((prev) => prev + placeholder)
  }

  const handleSave = () => {
    save({ certificateText: text })
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium text-secondary-700">Texto do certificado</label>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={6}
          className="w-full rounded-lg border border-secondary-300 px-3 py-2 text-sm font-serif focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
        />
        <div className="flex justify-between text-xs text-secondary-500">
          <span>{text.length}/1500 caracteres</span>
          {text.length > 1500 && <span className="text-danger-500">Excede o limite</span>}
        </div>
      </div>

      <div className="rounded-lg border border-secondary-200 bg-secondary-50 p-3">
        <p className="text-xs font-medium text-secondary-700 mb-2">Clique para inserir no texto:</p>
        <div className="flex flex-wrap gap-2">
          {PLACEHOLDERS.map((ph) => (
            <button
              key={ph.key}
              onClick={() => insertPlaceholder(ph.key)}
              className="rounded-full bg-indigo-50 border border-indigo-200 px-3 py-1 text-xs text-indigo-700 hover:bg-indigo-100 hover:border-indigo-400 transition-colors"
              type="button"
            >
              {ph.label}
            </button>
          ))}
        </div>
      </div>

      <Button onClick={handleSave} loading={isPending} disabled={text.length > 1500 || isPending}>
        Salvar texto
      </Button>
    </div>
  )
}
```

- [ ] **Step 4: Rodar todos os testes do editor — devem passar**

```bash
cd packages/web && pnpm test -- --run CertificateTextEditor
```

Esperado: 5 testes PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/web/src/components/admin/certificates/CertificateTextEditor.tsx \
        packages/web/src/components/admin/certificates/__tests__/CertificateTextEditor.spec.tsx
git commit -m "feat(web): texto padrão e chips redesenhados no CertificateTextEditor"
```

---

## Tarefa 2: Rewrite do `SignatureManager` — grid + inline upload + preview

**Arquivos:**
- Rewrite: `packages/web/src/components/admin/certificates/SignatureManager.tsx`
- Criar: `packages/web/src/components/admin/certificates/__tests__/SignatureManager.spec.tsx`

- [ ] **Step 1: Criar arquivo de testes com casos failing**

Crie `packages/web/src/components/admin/certificates/__tests__/SignatureManager.spec.tsx`:

```tsx
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/hooks/useCertificates', () => ({
  useAddSignature: vi.fn(),
  useRemoveSignature: vi.fn(),
  useUpdateSignature: vi.fn(),
}))

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

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
```

- [ ] **Step 2: Rodar testes — devem falhar (SignatureManager ainda é o antigo)**

```bash
cd packages/web && pnpm test -- --run SignatureManager
```

Esperado: vários FAIL — o componente atual não tem grid nem os textos esperados.

- [ ] **Step 3: Reescrever `SignatureManager.tsx`**

Substitua o arquivo inteiro por:

```tsx
'use client'

import { useState, useRef } from 'react'
import { Button } from '@/components/ui/Button'
import { useAddSignature, useRemoveSignature, useUpdateSignature } from '@/hooks/useCertificates'
import type { CertificateSignature } from '@judging/shared'
import { GripVertical, Trash2, Edit2, Save, X, Upload } from 'lucide-react'
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  useSortable,
  rectSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

interface SignatureManagerProps {
  eventId: string
  signatures: CertificateSignature[]
}

interface SortableCardProps {
  sig: CertificateSignature
  position: number
  baseUrl: string
  onRemove: (id: string) => void
  onStartEdit: (sig: CertificateSignature) => void
  editingId: string | null
  editForm: { personName: string; personRole: string }
  onEditChange: (field: 'personName' | 'personRole', value: string) => void
  onSaveEdit: (id: string) => void
  onCancelEdit: () => void
  isSaving: boolean
}

function SortableCard({
  sig,
  position,
  baseUrl,
  onRemove,
  onStartEdit,
  editingId,
  editForm,
  onEditChange,
  onSaveEdit,
  onCancelEdit,
  isSaving,
}: SortableCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: sig.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  const isEditing = editingId === sig.id

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`relative bg-white rounded-xl border-2 p-4 flex flex-col items-center gap-2 ${isDragging ? 'border-primary-500 shadow-lg' : 'border-secondary-200'}`}
    >
      <div className="absolute top-2 left-2 bg-primary-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold">
        {position}
      </div>

      <div
        className="absolute top-2 right-2 text-secondary-300 cursor-grab active:cursor-grabbing"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-4 w-4" />
      </div>

      {isEditing ? (
        <div className="w-full space-y-2 mt-4">
          <input
            value={editForm.personName}
            onChange={(e) => onEditChange('personName', e.target.value)}
            className="w-full rounded border border-secondary-300 px-2 py-1 text-sm"
            placeholder="Nome"
          />
          <input
            value={editForm.personRole}
            onChange={(e) => onEditChange('personRole', e.target.value)}
            className="w-full rounded border border-secondary-300 px-2 py-1 text-sm"
            placeholder="Cargo"
          />
          <div className="flex gap-2">
            <Button size="sm" onClick={() => onSaveEdit(sig.id)} loading={isSaving}>
              <Save className="h-3 w-3 mr-1" /> Salvar
            </Button>
            <Button size="sm" variant="ghost" onClick={onCancelEdit}>
              <X className="h-3 w-3 mr-1" /> Cancelar
            </Button>
          </div>
        </div>
      ) : (
        <>
          <div className="mt-4 bg-secondary-50 border border-secondary-100 rounded-lg w-full flex items-center justify-center h-16 overflow-hidden">
            <img
              src={`${baseUrl}/uploads/${sig.imagePath}`}
              alt={sig.personName}
              className="h-full object-contain"
            />
          </div>
          <p className="text-sm font-semibold text-secondary-900 text-center">{sig.personName}</p>
          <p className="text-xs text-secondary-500 text-center">{sig.personRole}</p>
          <div className="flex gap-2 mt-1">
            <Button variant="ghost" size="sm" onClick={() => onStartEdit(sig)}>
              <Edit2 className="h-3 w-3 mr-1" /> Editar
            </Button>
            <Button variant="ghost" size="sm" onClick={() => onRemove(sig.id)}>
              <Trash2 className="h-3 w-3 mr-1 text-danger-500" /> Remover
            </Button>
          </div>
        </>
      )}
    </div>
  )
}

interface EmptySlotProps {
  position: number
  onAdd: (payload: { file: File; personName: string; personRole: string; displayOrder: number }) => void
  isPending: boolean
}

function EmptySlot({ position, onAdd, isPending }: EmptySlotProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [personName, setPersonName] = useState('')
  const [personRole, setPersonRole] = useState('')
  const [dragOver, setDragOver] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFile = (f: File) => {
    setFile(f)
    setPreview(URL.createObjectURL(f))
  }

  const handleSave = () => {
    if (!file || !personName) return
    onAdd({ file, personName, personRole, displayOrder: position })
    setIsOpen(false)
    setFile(null)
    setPreview(null)
    setPersonName('')
    setPersonRole('')
  }

  const handleCancel = () => {
    setIsOpen(false)
    setFile(null)
    setPreview(null)
    setPersonName('')
    setPersonRole('')
  }

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="relative bg-white rounded-xl border-2 border-dashed border-secondary-200 p-4 flex flex-col items-center justify-center gap-2 min-h-[180px] hover:border-primary-400 hover:bg-primary-50 transition-colors"
      >
        <div className="absolute top-2 left-2 bg-secondary-200 text-secondary-500 rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold">
          {position}
        </div>
        <Upload className="h-6 w-6 text-secondary-300" />
        <span className="text-sm text-secondary-400">+ Adicionar assinatura</span>
      </button>
    )
  }

  return (
    <div className="relative bg-white rounded-xl border-2 border-primary-400 p-4 flex flex-col gap-2 min-h-[180px]">
      <div className="absolute top-2 left-2 bg-primary-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold">
        {position}
      </div>

      <div className="mt-4">
        {preview ? (
          <div
            className="bg-secondary-50 border border-secondary-200 rounded-lg h-16 flex items-center justify-center overflow-hidden cursor-pointer"
            onClick={() => inputRef.current?.click()}
          >
            <img src={preview} alt="preview" className="h-full object-contain" />
          </div>
        ) : (
          <div
            onClick={() => inputRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault()
              setDragOver(false)
              const f = e.dataTransfer.files[0]
              if (f) handleFile(f)
            }}
            className={`border-2 border-dashed rounded-lg h-16 flex flex-col items-center justify-center gap-1 cursor-pointer transition-colors ${dragOver ? 'border-primary-500 bg-primary-50' : 'border-secondary-300'}`}
          >
            <Upload className="h-4 w-4 text-secondary-400" />
            <span className="text-xs text-secondary-400">Clique ou arraste</span>
          </div>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png"
          className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
        />
      </div>

      <input
        value={personName}
        onChange={(e) => setPersonName(e.target.value)}
        className="w-full rounded border border-secondary-300 px-2 py-1 text-sm"
        placeholder="Nome de quem assina"
      />
      <input
        value={personRole}
        onChange={(e) => setPersonRole(e.target.value)}
        className="w-full rounded border border-secondary-300 px-2 py-1 text-sm"
        placeholder="Cargo"
      />

      <div className="flex gap-2">
        <Button size="sm" onClick={handleSave} loading={isPending} disabled={!file || !personName}>
          Salvar
        </Button>
        <Button size="sm" variant="ghost" onClick={handleCancel}>
          Cancelar
        </Button>
      </div>
    </div>
  )
}

export function SignatureManager({ eventId, signatures }: SignatureManagerProps) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState({ personName: '', personRole: '' })
  const [orderedIds, setOrderedIds] = useState<string[]>(() =>
    [...signatures].sort((a, b) => a.displayOrder - b.displayOrder).map((s) => s.id)
  )

  const { mutate: add, isPending: isAdding } = useAddSignature(eventId)
  const { mutate: remove } = useRemoveSignature(eventId)
  const { mutate: update, isPending: isUpdating } = useUpdateSignature(eventId)

  const baseUrl = process.env['NEXT_PUBLIC_API_URL'] ?? ''

  const sensors = useSensors(useSensor(PointerSensor))

  const sigMap = Object.fromEntries(signatures.map((s) => [s.id, s]))

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const oldIndex = orderedIds.indexOf(active.id as string)
    const newIndex = orderedIds.indexOf(over.id as string)
    const newOrder = arrayMove(orderedIds, oldIndex, newIndex)
    setOrderedIds(newOrder)

    newOrder.forEach((id, index) => {
      const newDisplayOrder = (index + 1) as 1 | 2 | 3
      if (sigMap[id]?.displayOrder !== newDisplayOrder) {
        update({ id, data: { personName: sigMap[id].personName, personRole: sigMap[id].personRole, displayOrder: newDisplayOrder } })
      }
    })
  }

  const startEdit = (sig: CertificateSignature) => {
    setEditingId(sig.id)
    setEditForm({ personName: sig.personName, personRole: sig.personRole })
  }

  const handleSaveEdit = (id: string) => {
    const sig = sigMap[id]
    update({ id, data: { personName: editForm.personName, personRole: editForm.personRole, displayOrder: sig.displayOrder } }, {
      onSuccess: () => setEditingId(null),
    })
  }

  const positions: (CertificateSignature | null)[] = [1, 2, 3].map(
    (pos) => signatures.find((s) => s.displayOrder === pos) ?? null
  )

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={orderedIds} strategy={rectSortingStrategy}>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {positions.map((sig, index) => {
            const position = (index + 1) as 1 | 2 | 3
            if (sig) {
              return (
                <SortableCard
                  key={sig.id}
                  sig={sig}
                  position={position}
                  baseUrl={baseUrl}
                  onRemove={remove}
                  onStartEdit={startEdit}
                  editingId={editingId}
                  editForm={editForm}
                  onEditChange={(field, value) => setEditForm((f) => ({ ...f, [field]: value }))}
                  onSaveEdit={handleSaveEdit}
                  onCancelEdit={() => setEditingId(null)}
                  isSaving={isUpdating}
                />
              )
            }
            if (signatures.length < 3) {
              return (
                <EmptySlot
                  key={`empty-${position}`}
                  position={position}
                  onAdd={add}
                  isPending={isAdding}
                />
              )
            }
            return null
          })}
        </div>
      </SortableContext>
    </DndContext>
  )
}
```

- [ ] **Step 4: Rodar testes do SignatureManager — devem passar**

```bash
cd packages/web && pnpm test -- --run SignatureManager
```

Esperado: 5 testes PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/web/src/components/admin/certificates/SignatureManager.tsx \
        packages/web/src/components/admin/certificates/__tests__/SignatureManager.spec.tsx
git commit -m "feat(web): rewrite SignatureManager — grid 3 colunas, inline upload, drag-and-drop"
```

---

## Tarefa 3: Novo layout da página de certificados

**Arquivos:**
- Modificar: `packages/web/src/app/(admin)/events/[id]/certificates/page.tsx`

- [ ] **Step 1: Atualizar `page.tsx` com layout duas colunas**

Substitua o arquivo inteiro por:

```tsx
'use client'

import { useParams } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { PageHeader } from '@/components/admin/PageHeader'
import { Button } from '@/components/ui/Button'
import { CertificateTextEditor } from '@/components/admin/certificates/CertificateTextEditor'
import { BackgroundUploader } from '@/components/admin/certificates/BackgroundUploader'
import { SignatureManager } from '@/components/admin/certificates/SignatureManager'
import { BatchGenerationCard } from '@/components/admin/certificates/BatchGenerationCard'
import { useCertificateConfig } from '@/hooks/useCertificates'
import { useEvent } from '@/hooks/useEvents'
import { useParticipants } from '@/hooks/useParticipants'

export default function CertificatesPage() {
  const { id: eventId } = useParams() as { id: string }
  const { data: config, isLoading: isLoadingConfig } = useCertificateConfig(eventId)
  const { isLoading: isLoadingEvent } = useEvent(eventId)
  const { data: participants, isLoading: isLoadingParticipants } = useParticipants(eventId)

  const isLoading = isLoadingConfig || isLoadingEvent || isLoadingParticipants

  const baseUrl = process.env['NEXT_PUBLIC_API_URL'] ?? ''
  const backgroundUrl = config?.backgroundPath ? `${baseUrl}/uploads/${config.backgroundPath}` : null

  return (
    <>
      <div className="mb-4">
        <Link href={`/events/${eventId}`}>
          <Button variant="ghost" size="sm" className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </Button>
        </Link>
      </div>

      <PageHeader
        title="Certificados"
        description="Configure o layout, assinaturas e gere os certificados em PDF."
      />

      {isLoading ? (
        <div className="animate-pulse space-y-4">
          <div className="h-32 bg-secondary-100 rounded" />
          <div className="h-48 bg-secondary-100 rounded" />
        </div>
      ) : (
        <div className="space-y-8">
          {/* Linha 1: Texto + Background lado a lado */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            <section className="lg:col-span-3 rounded-xl border border-secondary-200 p-6">
              <h2 className="text-base font-semibold text-secondary-900 mb-4">Texto do certificado</h2>
              <CertificateTextEditor eventId={eventId} initialText={config?.certificateText ?? ''} />
            </section>

            <section className="lg:col-span-2 rounded-xl border border-secondary-200 p-6">
              <h2 className="text-base font-semibold text-secondary-900 mb-4">Imagem de fundo</h2>
              <BackgroundUploader
                eventId={eventId}
                backgroundPath={config?.backgroundPath ?? null}
                publicUrl={backgroundUrl}
              />
            </section>
          </div>

          {/* Linha 2: Assinaturas */}
          <section className="rounded-xl border border-secondary-200 p-6">
            <h2 className="text-base font-semibold text-secondary-900 mb-1">Assinaturas</h2>
            <p className="text-xs text-secondary-500 mb-4">Arraste os cards para reordenar.</p>
            <SignatureManager eventId={eventId} signatures={config?.signatures ?? []} />
          </section>

          {/* Linha 3: Geração em lote */}
          <section>
            <BatchGenerationCard
              eventId={eventId}
              config={config ?? null}
              participantCount={participants?.length ?? 0}
            />
          </section>
        </div>
      )}
    </>
  )
}
```

- [ ] **Step 2: Rodar todos os testes do pacote web**

```bash
cd packages/web && pnpm test -- --run
```

Esperado: todos os testes PASS. Nenhum teste de snapshot ou de página deve quebrar.

- [ ] **Step 3: Commit**

```bash
git add packages/web/src/app/\(admin\)/events/\[id\]/certificates/page.tsx
git commit -m "feat(web): novo layout duas colunas na página de certificados"
```

---

## Tarefa 4: Verificação final

- [ ] **Step 1: Rodar toda a suite de testes**

```bash
cd packages/web && pnpm test -- --run
```

Esperado: todos PASS.

- [ ] **Step 2: Verificar no browser**

Acesse `http://localhost:3001/events/4b9481ee-567e-47c6-9144-416c670d5f28/certificates` e confira:

1. Layout duas colunas (texto à esquerda, background à direita)
2. Textarea com texto padrão pré-preenchido quando não há texto salvo
3. Chips de placeholder com estilo indigo arredondado
4. Grid de 3 assinaturas com badge de posição
5. Slot vazio mostra formulário inline ao clicar
6. Preview da imagem aparece imediatamente após selecionar arquivo
7. Drag-and-drop funciona para reordenar assinaturas

- [ ] **Step 3: Commit final se tudo OK**

```bash
git add -p  # revisar qualquer arquivo pendente
git commit -m "chore: finaliza redesign da página de certificados"
```
