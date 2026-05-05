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
              src={`/uploads/${sig.imagePath}`}
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
    if (preview) URL.revokeObjectURL(preview)
    onAdd({ file, personName, personRole, displayOrder: position })
    setIsOpen(false)
    setFile(null)
    setPreview(null)
    setPersonName('')
    setPersonRole('')
  }

  const handleCancel = () => {
    if (preview) URL.revokeObjectURL(preview)
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


  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }))

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
      const sig = sigMap[id]
      if (sig && sig.displayOrder !== newDisplayOrder) {
        update({ id, data: { personName: sig.personName, personRole: sig.personRole, displayOrder: newDisplayOrder } })
      }
    })
  }

  const startEdit = (sig: CertificateSignature) => {
    setEditingId(sig.id)
    setEditForm({ personName: sig.personName, personRole: sig.personRole })
  }

  const handleSaveEdit = (id: string) => {
    const sig = sigMap[id]
    if (!sig) return
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
