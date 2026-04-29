'use client'

import { useParams } from 'next/navigation'
import { useCategories, useCreateCategory, useDeleteCategory, useReorderCategories } from '@/hooks/useCategories'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card } from '@/components/ui/Card'
import { Trash2, GripVertical, Plus } from 'lucide-react'
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

export default function EventCategoriesPage() {
  const { id: eventId } = useParams() as { id: string }
  const { data: categories, isLoading } = useCategories(eventId)
  const { mutate: createCategory, isPending: isCreating } = useCreateCategory(eventId)
  const { mutate: deleteCategory } = useDeleteCategory(eventId)
  const { mutate: reorderCategories } = useReorderCategories(eventId)

  const [newName, setNewName] = useState('')

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    if (over && active.id !== over.id && categories) {
      const oldIndex = categories.findIndex((c) => c.id === active.id)
      const newIndex = categories.findIndex((c) => c.id === over.id)
      const newOrder = arrayMove(categories, oldIndex, newIndex)
      reorderCategories(newOrder.map((c) => c.id))
    }
  }

  const handleAddCategory = (e: FormEvent) => {
    e.preventDefault()
    if (!newName.trim()) return
    createCategory({ name: newName.trim(), weight: 1 }, {
      onSuccess: () => setNewName('')
    })
  }

  if (isLoading) return <div>Carregando categorias...</div>

  return (
    <div className="max-w-2xl space-y-6">
      <Card
        header={<h3 className="font-semibold">Adicionar Categoria</h3>}
        body={
          <form onSubmit={handleAddCategory} className="flex gap-3">
            <div className="flex-1">
              <Input
                id="category-name"
                label="Nome da Categoria"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Ex: Originalidade, Execução..."
              />
            </div>
            <div className="flex items-end pb-1">
              <Button type="submit" loading={isCreating}>
                <Plus className="mr-2 h-4 w-4" />
                Adicionar
              </Button>
            </div>
          </form>
        }
      />

      <div className="space-y-2">
        <h3 className="text-sm font-medium text-secondary-500 uppercase tracking-wider">Categorias Cadastradas</h3>
        {!categories || categories.length === 0 ? (
          <p className="text-secondary-500 text-center py-8 bg-white rounded-lg border border-dashed border-secondary-200">
            Nenhuma categoria cadastrada para este evento.
          </p>
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={categories.map((c) => c.id)} strategy={verticalListSortingStrategy}>
              <div className="space-y-2">
                {categories.map((category) => (
                  <SortableCategoryItem key={category.id} category={category} onDelete={() => deleteCategory(category.id)} />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </div>
    </div>
  )
}

interface CategoryItem {
  id: string
  name: string
  [key: string]: unknown
}

function SortableCategoryItem({ category, onDelete }: { category: CategoryItem; onDelete: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: category.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-4 rounded-lg border border-secondary-200 bg-white p-4 shadow-sm"
    >
      <button {...attributes} {...listeners} className="cursor-grab text-secondary-400 hover:text-secondary-600">
        <GripVertical className="h-5 w-5" />
      </button>
      <span className="flex-1 font-medium text-secondary-900">{category.name}</span>
      <Button
        variant="ghost"
        size="sm"
        className="text-danger-600 hover:text-danger-700 hover:bg-danger-50"
        onClick={onDelete}
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  )
}
