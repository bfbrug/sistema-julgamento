'use client'

import { useState, useRef } from 'react'
import { Button } from '@/components/ui/Button'
import { useAddSignature, useRemoveSignature, useUpdateSignature } from '@/hooks/useCertificates'
import type { CertificateSignature } from '@judging/shared'
import { Plus, Trash2, Edit2, Save, X } from 'lucide-react'

interface SignatureManagerProps {
  eventId: string
  signatures: CertificateSignature[]
}

export function SignatureManager({ eventId, signatures }: SignatureManagerProps) {
  const [isAdding, setIsAdding] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState({ personName: '', personRole: '', displayOrder: 1 as 1 | 2 | 3, file: null as File | null })
  const inputRef = useRef<HTMLInputElement>(null)

  const { mutate: add, isPending: isAddingSig } = useAddSignature(eventId)
  const { mutate: remove, isPending: isRemoving } = useRemoveSignature(eventId)
  const { mutate: update, isPending: isUpdating } = useUpdateSignature(eventId)

  const handleAdd = () => {
    if (!form.file || !form.personName || !form.personRole) return
    add(
      { file: form.file, personName: form.personName, personRole: form.personRole, displayOrder: form.displayOrder },
      { onSuccess: () => { setIsAdding(false); setForm({ personName: '', personRole: '', displayOrder: 1, file: null }) } }
    )
  }

  const startEdit = (sig: CertificateSignature) => {
    setEditingId(sig.id)
    setForm({ personName: sig.personName, personRole: sig.personRole, displayOrder: sig.displayOrder, file: null })
  }

  const handleUpdate = (id: string) => {
    update({ id, data: { personName: form.personName, personRole: form.personRole, displayOrder: form.displayOrder } }, {
      onSuccess: () => setEditingId(null),
    })
  }

  const baseUrl = process.env['NEXT_PUBLIC_API_URL'] ?? ''

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {signatures.map((sig) => (
          <div key={sig.id} className="rounded-lg border border-secondary-200 p-3 space-y-2">
            {editingId === sig.id ? (
              <>
                <input
                  value={form.personName}
                  onChange={(e) => setForm((f) => ({ ...f, personName: e.target.value }))}
                  className="w-full rounded border border-secondary-300 px-2 py-1 text-sm"
                  placeholder="Nome"
                />
                <input
                  value={form.personRole}
                  onChange={(e) => setForm((f) => ({ ...f, personRole: e.target.value }))}
                  className="w-full rounded border border-secondary-300 px-2 py-1 text-sm"
                  placeholder="Cargo"
                />
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => handleUpdate(sig.id)} loading={isUpdating}>
                    <Save className="h-3 w-3 mr-1" /> Salvar
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>
                    <X className="h-3 w-3 mr-1" /> Cancelar
                  </Button>
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center gap-3">
                  <img
                    src={`${baseUrl}/uploads/${sig.imagePath}`}
                    alt={sig.personName}
                    className="h-12 w-12 object-contain rounded border border-secondary-100"
                  />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-secondary-900 truncate">{sig.personName}</p>
                    <p className="text-xs text-secondary-500 truncate">{sig.personRole}</p>
                    <p className="text-xs text-secondary-400">Ordem: {sig.displayOrder}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" onClick={() => startEdit(sig)}>
                    <Edit2 className="h-3 w-3 mr-1" /> Editar
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => remove(sig.id)} loading={isRemoving}>
                    <Trash2 className="h-3 w-3 mr-1 text-danger-500" /> Remover
                  </Button>
                </div>
              </>
            )}
          </div>
        ))}
      </div>

      {isAdding && (
        <div className="rounded-lg border border-secondary-200 p-4 space-y-3">
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png"
            onChange={(e) => setForm((f) => ({ ...f, file: e.target.files?.[0] ?? null }))}
          />
          <input
            value={form.personName}
            onChange={(e) => setForm((f) => ({ ...f, personName: e.target.value }))}
            className="w-full rounded border border-secondary-300 px-2 py-1 text-sm"
            placeholder="Nome de quem assina"
          />
          <input
            value={form.personRole}
            onChange={(e) => setForm((f) => ({ ...f, personRole: e.target.value }))}
            className="w-full rounded border border-secondary-300 px-2 py-1 text-sm"
            placeholder="Cargo"
          />
          <select
            value={form.displayOrder}
            onChange={(e) => setForm((f) => ({ ...f, displayOrder: parseInt(e.target.value, 10) as 1 | 2 | 3 }))}
            className="w-full rounded border border-secondary-300 px-2 py-1 text-sm"
          >
            <option value={1}>Posição 1</option>
            <option value={2}>Posição 2</option>
            <option value={3}>Posição 3</option>
          </select>
          <div className="flex gap-2">
            <Button size="sm" onClick={handleAdd} loading={isAddingSig} disabled={!form.file || !form.personName}>
              Adicionar
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setIsAdding(false)}>
              Cancelar
            </Button>
          </div>
        </div>
      )}

      {!isAdding && signatures.length < 3 && (
        <Button variant="secondary" size="sm" onClick={() => setIsAdding(true)}>
          <Plus className="h-4 w-4 mr-1" /> Adicionar assinatura
        </Button>
      )}
    </div>
  )
}
