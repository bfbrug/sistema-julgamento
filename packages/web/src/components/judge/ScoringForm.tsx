'use client'

import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { createScoreSchema } from '@judging/shared'
import { User, Minus, Plus, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

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
    formState: { errors, isValid, touchedFields },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    mode: 'onBlur',
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
        // rascunho corrompido
      }
    }
  }, [draftKey, categories, setValue])

  useEffect(() => {
    const hasValues = categories.some((cat) => values[cat.id] !== undefined && values[cat.id] !== null)
    if (hasValues) {
      const toSave: Record<string, number> = {}
      for (const cat of categories) {
        const val = values[cat.id]
        if (val !== undefined && val !== null) toSave[cat.id] = val
      }
      sessionStorage.setItem(draftKey, JSON.stringify(toSave))
    }
  }, [values, draftKey, categories])

  const handleFormSubmit = (data: FormData) => {
    sessionStorage.removeItem(draftKey)
    onSubmit(data)
  }

  const adjustValue = (categoryId: string, delta: number) => {
    const current = values[categoryId] ?? scoreMin
    const next = Math.round((current + delta) * 10) / 10
    if (next >= scoreMin && next <= scoreMax) {
      setValue(categoryId, next, { shouldValidate: true })
    }
  }

  const sortedCategories = [...categories].sort((a, b) => a.displayOrder - b.displayOrder)
  const filledCount = sortedCategories.filter((cat) => {
    const v = values[cat.id]
    return v !== undefined && v !== null && !isNaN(v)
  }).length
  const allFilled = filledCount === sortedCategories.length

  return (
    <div className="min-h-full bg-slate-50 flex flex-col items-center">
      <div className="w-full max-w-lg flex flex-col flex-1">

        {/* Cabeçalho do participante */}
        <div className="bg-white border-b border-slate-200 px-5 py-5 flex items-center gap-4">
          <div className="relative flex-shrink-0">
            <div className="h-20 w-20 rounded-2xl overflow-hidden bg-slate-100 border border-slate-200 shadow-sm">
              {photoUrl ? (
                <img src={photoUrl} alt={participantName} className="h-full w-full object-cover object-top" />
              ) : (
                <div className="h-full w-full flex items-center justify-center">
                  <User className="h-8 w-8 text-slate-400" />
                </div>
              )}
            </div>
            <div className="absolute -bottom-1.5 -right-1.5 h-6 w-6 rounded-full bg-primary-600 flex items-center justify-center border-2 border-white shadow">
              <span className="text-[9px] font-bold text-white">{presentationOrder}</span>
            </div>
          </div>

          <div className="flex-1 min-w-0">
            <h1 className="text-slate-900 font-bold text-xl leading-tight truncate">{participantName}</h1>
            <p className="text-slate-500 text-sm mt-1">Participante {presentationOrder} de {totalParticipants}</p>
          </div>

          {/* Progresso */}
          <div className={cn(
            'flex-shrink-0 flex items-center gap-1 rounded-full px-3 py-1.5 text-sm font-bold border',
            allFilled
              ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
              : 'bg-slate-100 border-slate-200 text-slate-500'
          )}>
            {filledCount}/{sortedCategories.length}
          </div>
        </div>

        {/* Linhas de categoria */}
        <form onSubmit={handleSubmit(handleFormSubmit)} className="flex-1 flex flex-col">
          <div className="flex-1 bg-white mt-3 border-y border-slate-200 divide-y divide-slate-100">
            {sortedCategories.map((cat, idx) => {
              const val = values[cat.id]
              const hasValue = val !== undefined && val !== null && !isNaN(val)
              const isTouched = !!touchedFields[cat.id]
              const fieldError = (isTouched && hasValue) ? errors[cat.id]?.message : undefined
              const pct = hasValue ? ((val - scoreMin) / (scoreMax - scoreMin)) * 100 : 0

              return (
                <div
                  key={cat.id}
                  className={cn(
                    'relative flex items-center transition-colors',
                    hasValue ? 'bg-primary-50/40' : 'bg-white',
                  )}
                >
                  {/* Barra de progresso na esquerda */}
                  <div
                    className="absolute left-0 top-0 bottom-0 w-0.5 bg-primary-500 transition-opacity duration-200"
                    style={{ opacity: hasValue ? 1 : 0 }}
                  />

                  {/* Número + nome */}
                  <div className="flex-1 pl-5 pr-3 py-4">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-400 w-4 text-right flex-shrink-0 tabular-nums">{idx + 1}</span>
                      <span className={cn(
                        'text-base font-semibold',
                        hasValue ? 'text-slate-800' : 'text-slate-500'
                      )}>
                        {cat.name}
                      </span>
                    </div>
                    {fieldError && (
                      <p className="text-[10px] text-red-500 font-medium ml-6 mt-0.5">{fieldError}</p>
                    )}
                  </div>

                  {/* Controles */}
                  <div className="flex items-center gap-1.5 pr-4 py-3">
                    <button
                      type="button"
                      tabIndex={-1}
                      onClick={() => adjustValue(cat.id, -0.5)}
                      className="cursor-pointer h-11 w-11 rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-100 hover:border-slate-300 hover:text-slate-800 active:scale-95 transition-all flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 shadow-sm"
                      aria-label={`Diminuir ${cat.name}`}
                    >
                      <Minus className="h-4 w-4" />
                    </button>

                    <div className="relative">
                      <input
                        id={cat.id}
                        type="number"
                        step="0.1"
                        min={scoreMin}
                        max={scoreMax}
                        {...register(cat.id, { valueAsNumber: true })}
                        onKeyDown={(e) => {
                          // bloqueia segunda casa decimal
                          const current = String(e.currentTarget.value)
                          const decimalIdx = current.indexOf('.')
                          if (decimalIdx !== -1 && current.length - decimalIdx > 1 && /[0-9]/.test(e.key) && e.currentTarget.selectionStart! > decimalIdx) {
                            e.preventDefault()
                          }
                        }}
                        onChange={(e) => {
                          const raw = e.target.value
                          const match = raw.match(/^-?\d*\.?\d{0,1}$/)
                          if (!match) {
                            e.target.value = raw.slice(0, -1)
                          }
                        }}
                        className={cn(
                          'w-20 text-center text-2xl font-bold rounded-lg border py-2.5 transition-all focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-400 tabular-nums appearance-none [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none bg-white shadow-sm',
                          hasValue
                            ? 'text-slate-900 border-slate-300'
                            : 'text-slate-400 border-slate-200',
                          fieldError ? 'border-red-400 focus:ring-red-400' : '',
                        )}
                      />
                    </div>

                    <button
                      type="button"
                      tabIndex={-1}
                      onClick={() => adjustValue(cat.id, 0.5)}
                      className="cursor-pointer h-11 w-11 rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-100 hover:border-slate-300 hover:text-slate-800 active:scale-95 transition-all flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 shadow-sm"
                      aria-label={`Aumentar ${cat.name}`}
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Rodapé */}
          <div className="px-5 py-4 flex items-center gap-3">
            <button
              type="button"
              onClick={onCancel}
              disabled={isSubmitting}
              className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm font-semibold hover:bg-white hover:border-slate-300 transition-colors disabled:opacity-40 bg-white shadow-sm"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!isValid || isSubmitting}
              className={cn(
                'flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all shadow-sm',
                isValid && !isSubmitting
                  ? 'bg-primary-600 hover:bg-primary-700 text-white active:scale-[0.98]'
                  : 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
              )}
            >
              {isSubmitting ? (
                <div className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
              Revisar notas
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
