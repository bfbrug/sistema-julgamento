'use client'

import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { createScoreSchema } from '@judging/shared'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { User, ChevronUp, ChevronDown } from 'lucide-react'

interface CategoryToScore {
  id: string
  name: string
  displayOrder: number
}

interface ScoringFormProps {
  participantName: string
  photoUrl: string | null
  presentationOrder: number
  totalParticipants: number
  categories: CategoryToScore[]
  scoreMin: number
  scoreMax: number
  initialValues?: Record<string, number>
  onSubmit: (values: Record<string, number>) => void
  onCancel: () => void
  isSubmitting?: boolean
  draftKey: string
}

function buildSchema(categories: CategoryToScore[], scoreMin: number, scoreMax: number) {
  const shape: Record<string, z.ZodType<number>> = {}
  for (const cat of categories) {
    shape[cat.id] = createScoreSchema(scoreMin, scoreMax)
  }
  return z.object(shape)
}

export function ScoringForm({
  participantName,
  photoUrl,
  presentationOrder,
  totalParticipants,
  categories,
  scoreMin,
  scoreMax,
  initialValues,
  onSubmit,
  onCancel,
  isSubmitting,
  draftKey,
}: ScoringFormProps) {
  const schema = buildSchema(categories, scoreMin, scoreMax)
  type FormData = z.infer<typeof schema>

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isValid },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    mode: 'onChange',
    defaultValues: initialValues,
  })

  const values = watch()

  useEffect(() => {
    const draft = sessionStorage.getItem(draftKey)
    if (draft) {
      try {
        const parsed = JSON.parse(draft) as Record<string, number>
        for (const cat of categories) {
          const val = parsed[cat.id]
          if (val !== undefined) {
            setValue(cat.id, val, { shouldValidate: true })
          }
        }
      } catch {
        // ignore corrupt draft
      }
    }
  }, [draftKey, categories, setValue])

  useEffect(() => {
    const hasValues = categories.some((cat) => values[cat.id] !== undefined && values[cat.id] !== null)
    if (hasValues) {
      const toSave: Record<string, number> = {}
      for (const cat of categories) {
        const val = values[cat.id]
        if (val !== undefined && val !== null) {
          toSave[cat.id] = val
        }
      }
      sessionStorage.setItem(draftKey, JSON.stringify(toSave))
    }
  }, [values, draftKey, categories])

  const handleFormSubmit = (data: FormData) => {
    sessionStorage.removeItem(draftKey)
    onSubmit(data)
  }

  const adjustValue = (categoryId: string, delta: number) => {
    const current = values[categoryId] ?? 0
    const next = Math.round((current + delta) * 10) / 10
    if (next >= scoreMin && next <= scoreMax) {
      setValue(categoryId, next, { shouldValidate: true })
    }
  }

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="mx-auto max-w-md px-4 py-8">
      <div className="mb-6 flex items-center gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-secondary-100">
          {photoUrl ? (
            <img src={photoUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <User className="h-6 w-6 text-secondary-400" />
          )}
        </div>
        <div>
          <h2 className="text-lg font-semibold text-secondary-900">{participantName}</h2>
          <p className="text-sm text-secondary-500">
            Participante {presentationOrder} de {totalParticipants}
          </p>
        </div>
      </div>

      <div className="space-y-5">
        {categories
          .sort((a, b) => a.displayOrder - b.displayOrder)
          .map((cat) => {
            const fieldError = errors[cat.id]?.message
            return (
              <div key={cat.id} className="flex items-end gap-2">
                <div className="flex-1">
                  <Input
                    id={cat.id}
                    label={cat.name}
                    type="number"
                    step="0.1"
                    min={scoreMin}
                    max={scoreMax}
                    helperText={`Mínimo: ${scoreMin.toFixed(1)} — Máximo: ${scoreMax.toFixed(1)}`}
                    error={typeof fieldError === 'string' ? fieldError : undefined}
                    className="text-lg"
                    {...register(cat.id, { valueAsNumber: true })}
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <button
                    type="button"
                    onClick={() => adjustValue(cat.id, 0.1)}
                    className="flex h-10 w-10 items-center justify-center rounded border border-secondary-300 bg-white text-secondary-600 hover:bg-secondary-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
                    aria-label={`Aumentar nota de ${cat.name}`}
                  >
                    <ChevronUp className="h-5 w-5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => adjustValue(cat.id, -0.1)}
                    className="flex h-10 w-10 items-center justify-center rounded border border-secondary-300 bg-white text-secondary-600 hover:bg-secondary-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
                    aria-label={`Diminuir nota de ${cat.name}`}
                  >
                    <ChevronDown className="h-5 w-5" />
                  </button>
                </div>
              </div>
            )
          })}
      </div>

      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <Button
          type="button"
          variant="secondary"
          size="lg"
          className="flex-1"
          onClick={onCancel}
          disabled={isSubmitting}
        >
          Cancelar
        </Button>
        <Button
          type="submit"
          variant="primary"
          size="lg"
          className="flex-1"
          disabled={!isValid || isSubmitting}
          loading={isSubmitting}
        >
          Confirmar notas
        </Button>
      </div>
    </form>
  )
}
