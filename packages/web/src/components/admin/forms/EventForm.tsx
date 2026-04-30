'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { createEventSchema, type CreateEventDto, CalculationRule } from '@judging/shared'
import type { Resolver } from 'react-hook-form'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'

interface EventFormProps {
  initialData?: Partial<CreateEventDto>
  onSubmit: (data: CreateEventDto) => void
  isLoading?: boolean
}

export function EventForm({ initialData, onSubmit, isLoading }: EventFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CreateEventDto>({
    resolver: zodResolver(createEventSchema) as Resolver<CreateEventDto>,
    defaultValues: {
      calculationRule: CalculationRule.R2,
      scoreMin: 0,
      scoreMax: 10,
      topN: 3,
      ...initialData,
      eventDate: initialData?.eventDate ? new Date(initialData.eventDate).toISOString().split('T')[0] : undefined,
    },
  })

  return (
    <Card
      body={
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <Input
              id="name"
              label="Nome do Evento"
              {...register('name')}
              error={errors.name?.message}
              placeholder="Ex: Campeonato de Skate 2026"
            />
            <Input
              id="eventDate"
              label="Data"
              type="date"
              {...register('eventDate')}
              error={errors.eventDate?.message}
            />
            <Input
              id="location"
              label="Local"
              {...register('location')}
              error={errors.location?.message}
              placeholder="Ex: Ginásio Municipal"
            />
            <Input
              id="organizer"
              label="Organizador"
              {...register('organizer')}
              error={errors.organizer?.message}
              placeholder="Ex: Liga de Skate"
            />
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-4">
            <div>
              <label className="text-sm font-medium text-secondary-700">Regra de Cálculo</label>
              <select
                {...register('calculationRule')}
                className="mt-1 block w-full rounded-md border border-secondary-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              >
                <option value={CalculationRule.R1}>Média Aritmética (R1)</option>
                <option value={CalculationRule.R2}>Média (descarta maior/menor) (R2)</option>
              </select>
              {errors.calculationRule && (
                <p className="mt-1 text-xs text-danger-500">{errors.calculationRule.message}</p>
              )}
            </div>
            <Input
              id="scoreMin"
              label="Nota Mínima"
              type="number"
              step="0.1"
              {...register('scoreMin', { valueAsNumber: true })}
              error={errors.scoreMin?.message}
            />
            <Input
              id="scoreMax"
              label="Nota Máxima"
              type="number"
              step="0.1"
              {...register('scoreMax', { valueAsNumber: true })}
              error={errors.scoreMax?.message}
            />
            <Input
              id="topN"
              label="Top N (Ranking)"
              type="number"
              {...register('topN', { valueAsNumber: true })}
              error={errors.topN?.message}
            />
          </div>

          <div className="flex justify-end gap-3">
            <Button type="submit" loading={isLoading}>
              {initialData ? 'Salvar Alterações' : 'Criar Evento'}
            </Button>
          </div>
        </form>
      }
    />
  )
}
