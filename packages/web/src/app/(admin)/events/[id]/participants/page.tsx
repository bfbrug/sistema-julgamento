'use client'

import { useParams } from 'next/navigation'
import { useParticipants, useCreateParticipant, useDeleteParticipant, useShuffleParticipants, useReorderParticipants } from '@/hooks/useParticipants'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card } from '@/components/ui/Card'
import { Trash2, GripVertical, Plus, Shuffle, Upload } from 'lucide-react'
import { useState, type FormEvent } from 'react'
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
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

export default function EventParticipantsPage() {
  const { id: eventId } = useParams() as { id: string }
  const { data: participants, isLoading } = useParticipants(eventId)
  const { mutate: createParticipant, isPending: isCreating } = useCreateParticipant(eventId)
  const { mutate: deleteParticipant } = useDeleteParticipant(eventId)
  const { mutate: shuffleParticipants } = useShuffleParticipants(eventId)
  const { mutate: reorderParticipants } = useReorderParticipants(eventId)

  const [newName, setNewName] = useState('')

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
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
    if (!newName.trim()) return
    createParticipant({ name: newName.trim() }, {
      onSuccess: () => setNewName('')
    })
  }

  if (isLoading) return <div>Carregando participantes...</div>

  return (
    <div className="max-w-4xl space-y-6">
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <Card
          header={<h3 className="font-semibold">Cadastrar Participante</h3>}
          body={
            <form onSubmit={handleAddParticipant} className="space-y-4">
              <Input
                id="participant-name"
                label="Nome do Participante"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Nome completo ou artístico"
              />
              <div className="flex justify-end">
                <Button type="submit" loading={isCreating}>
                  <Plus className="mr-2 h-4 w-4" />
                  Cadastrar
                </Button>
              </div>
            </form>
          }
        />

        <Card
          header={<h3 className="font-semibold">Ações em Massa</h3>}
          body={
            <div className="space-y-4">
              <p className="text-sm text-secondary-500">
                Sorteie a ordem de apresentação de todos os participantes cadastrados de uma só vez.
              </p>
              <Button variant="secondary" onClick={() => shuffleParticipants()} className="w-full">
                <Shuffle className="mr-2 h-4 w-4" />
                Sortear Ordem Aleatória
              </Button>
            </div>
          }
        />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-secondary-500 uppercase tracking-wider">Fila de Apresentação</h3>
          <span className="text-xs text-secondary-400">{participants?.length || 0} participantes</span>
        </div>
        
        {!participants || participants.length === 0 ? (
          <p className="text-secondary-500 text-center py-12 bg-white rounded-lg border border-dashed border-secondary-200">
            Nenhum participante cadastrado.
          </p>
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={participants.map((p) => p.id)} strategy={verticalListSortingStrategy}>
              <div className="space-y-2">
                {participants.map((participant, index) => (
                  <SortableParticipantItem
                    key={participant.id}
                    participant={participant}
                    index={index}
                    onDelete={() => deleteParticipant(participant.id)}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </div>
    </div>
  )
}

interface ParticipantItem {
  id: string
  name: string
}

function SortableParticipantItem({ participant, index, onDelete }: { participant: ParticipantItem; index: number; onDelete: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: participant.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-4 rounded-lg border border-secondary-200 bg-white p-3 shadow-sm group hover:border-primary-200 transition-colors"
    >
      <button {...attributes} {...listeners} className="cursor-grab text-secondary-300 hover:text-secondary-500">
        <GripVertical className="h-5 w-5" />
      </button>
      
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary-100 text-secondary-600 font-bold text-sm">
        {index + 1}
      </div>

      <div className="flex-1 min-w-0">
        <p className="font-semibold text-secondary-900 truncate">{participant.name}</p>
        <p className="text-xs text-secondary-500">ID: {participant.id.split('-')[0]}</p>
      </div>

      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" title="Upload de foto">
          <Upload className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="text-danger-600 hover:text-danger-700 hover:bg-danger-50"
          onClick={onDelete}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
