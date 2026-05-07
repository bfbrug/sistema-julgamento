'use client'

import React from 'react'
import { useParams } from 'next/navigation'
import { useParticipants, useCreateParticipant, useDeleteParticipant, useShuffleParticipants, useReorderParticipants, useUploadParticipantPhoto } from '@/hooks/useParticipants'
import { useEvent } from '@/hooks/useEvents'
import { EventStatus } from '@judging/shared'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card } from '@/components/ui/Card'
import { Trash2, GripVertical, Plus, Shuffle, Upload, UserCircle2 } from 'lucide-react'
import { useState, useRef, type FormEvent } from 'react'
import { ImportParticipantsModal } from '@/components/admin/participants/ImportParticipantsModal'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

export default function EventParticipantsPage() {
  const { id: eventId } = useParams() as { id: string }
  const { data: event } = useEvent(eventId)
  const isFinished = event?.status === EventStatus.FINISHED
  const { data: participants, isLoading } = useParticipants(eventId)
  const { mutate: createParticipant, isPending: isCreating } = useCreateParticipant(eventId)
  const { mutate: deleteParticipant } = useDeleteParticipant(eventId)
  const { mutate: shuffleParticipants } = useShuffleParticipants(eventId)
  const { mutate: reorderParticipants } = useReorderParticipants(eventId)

  const [newName, setNewName] = useState('')
  const [newGender, setNewGender] = useState<'MALE' | 'FEMALE' | ''>('')
  const [showImportModal, setShowImportModal] = useState(false)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (over && active.id !== over.id && participants) {
      const oldIndex = participants.findIndex((p) => p.id === active.id)
      const newIndex = participants.findIndex((p) => p.id === over.id)
      const newOrder = arrayMove(participants, oldIndex, newIndex)
      reorderParticipants(newOrder.map((p) => p.id))
    }
  }

  const handleAddParticipant = (e: FormEvent) => {
    e.preventDefault()
    if (!newName.trim() || !newGender) return
    createParticipant(
      { name: newName.trim(), gender: newGender },
      { onSuccess: () => { setNewName(''); setNewGender('') } },
    )
  }

  if (isLoading) return <div>Carregando participantes...</div>

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <Card
          header={<h3 className="font-semibold">Cadastrar Participante</h3>}
          body={
            isFinished ? (
              <p className="text-sm text-secondary-500">Evento finalizado. Não é possível cadastrar participantes.</p>
            ) : (
              <form onSubmit={handleAddParticipant} className="space-y-4">
                <Input
                  id="participant-name"
                  label="Nome do Participante"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Nome completo ou artístico"
                />
                <fieldset>
                  <legend className="text-sm font-medium text-secondary-700 mb-2">Gênero *</legend>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="gender"
                        value="MALE"
                        checked={newGender === 'MALE'}
                        onChange={() => setNewGender('MALE')}
                        required
                        className="accent-primary-600"
                      />
                      <span className="text-sm">Masculino</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="gender"
                        value="FEMALE"
                        checked={newGender === 'FEMALE'}
                        onChange={() => setNewGender('FEMALE')}
                        className="accent-primary-600"
                      />
                      <span className="text-sm">Feminino</span>
                    </label>
                  </div>
                </fieldset>
                <div className="flex justify-end">
                  <Button type="submit" loading={isCreating} disabled={!newGender}>
                    <Plus className="mr-2 h-4 w-4" />
                    Cadastrar
                  </Button>
                </div>
              </form>
            )
          }
        />

        <Card
          header={<h3 className="font-semibold">Ações em Massa</h3>}
          body={
            <div className="space-y-4">
              <p className="text-sm text-secondary-500">
                Sorteie a ordem de apresentação de todos os participantes cadastrados de uma só vez.
              </p>
              <Button
                variant="secondary"
                onClick={() => setShowImportModal(true)}
                disabled={isFinished}
              >
                Importar
              </Button>
              <Button variant="secondary" onClick={() => shuffleParticipants()} className="w-full" disabled={isFinished}>
                <Shuffle className="mr-2 h-4 w-4" />
                Sortear Ordem Aleatória
              </Button>
            </div>
          }
        />
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-secondary-500 uppercase tracking-wider">Ordem de Apresentação</h3>
          <span className="text-xs text-secondary-400">{participants?.length || 0} participantes</span>
        </div>

        {!participants || participants.length === 0 ? (
          <p className="text-secondary-500 text-center py-12 bg-white rounded-lg border border-dashed border-secondary-200">
            Nenhum participante cadastrado.
          </p>
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={participants.map((p) => p.id)} strategy={rectSortingStrategy}>
              <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8">
                {participants.map((participant, index) => (
                  <SortableParticipantCard
                    key={participant.id}
                    participant={participant}
                    index={index}
                    eventId={eventId}
                    onDelete={() => deleteParticipant(participant.id)}
                    isFinished={isFinished}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </div>

      {showImportModal && (
        <ImportParticipantsModal
          eventId={eventId}
          existingParticipants={participants ?? []}
          onClose={() => setShowImportModal(false)}
        />
      )}
    </div>
  )
}

interface ParticipantItem {
  id: string
  name: string
  photoUrl?: string | null
}

function SortableParticipantCard({ participant, index, eventId, onDelete, isFinished }: {
  participant: ParticipantItem
  index: number
  eventId: string
  onDelete: () => void
  isFinished: boolean
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: participant.id })
  const { mutate: uploadPhoto, isPending: isUploading } = useUploadParticipantPhoto(eventId)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    zIndex: isDragging ? 50 : undefined,
    scale: isDragging ? '1.05' : undefined,
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    uploadPhoto({ participantId: participant.id, file })
    e.target.value = ''
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex flex-col rounded-2xl border border-secondary-200 bg-white shadow-sm hover:border-primary-300 hover:shadow-lg transition-all duration-200"
    >
      {/* drag handle + número */}
      <div className="flex items-center justify-between px-2 pt-2">
        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary-100 text-[10px] font-bold text-primary-700">
          {index + 1}
        </span>
        {!isFinished && (
          <button
            {...attributes}
            {...listeners}
            className="cursor-grab active:cursor-grabbing rounded p-1 text-secondary-300 hover:bg-secondary-100 hover:text-secondary-600 touch-none transition-colors"
            title="Arrastar para reordenar"
          >
            <GripVertical className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* foto */}
      <div className="flex flex-col items-center px-2 py-2 gap-1.5">
        {participant.photoUrl ? (
          <img
            src={participant.photoUrl}
            alt={participant.name}
            className="h-14 w-14 rounded-full object-cover border-2 border-secondary-100"
          />
        ) : (
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-secondary-100 text-secondary-400">
            <UserCircle2 className="h-9 w-9" />
          </div>
        )}
        <p className="text-center text-xs font-semibold text-secondary-900 leading-tight line-clamp-2 w-full">
          {participant.name}
        </p>
      </div>

      {/* ações */}
      {!isFinished && (
        <div className="flex border-t border-secondary-100 mt-auto">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={handleFileChange}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="flex flex-1 items-center justify-center py-1.5 text-secondary-400 hover:bg-secondary-50 hover:text-primary-600 transition-colors rounded-bl-2xl"
            title="Upload de foto"
          >
            <Upload className="h-3 w-3" />
          </button>
          <div className="w-px bg-secondary-100" />
          <button
            onClick={onDelete}
            className="flex flex-1 items-center justify-center py-1.5 text-secondary-400 hover:bg-danger-50 hover:text-danger-600 transition-colors rounded-br-2xl"
            title="Remover"
          >
            <Trash2 className="h-3 w-3" />
          </button>
        </div>
      )}
    </div>
  )
}
