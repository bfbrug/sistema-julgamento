'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { createEventSchema, type CreateEventDto, CalculationRule } from '@judging/shared'
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
    resolver: zodResolver(createEventSchema),
    defaultValues: {
      calculationRule: CalculationRule.R2,
      minScore: 0,
      maxScore: 10,
      topN: 3,
      ...initialData,
      date: initialData?.date ? new Date(initialData.date).toISOString().split('T')[0] : undefined,
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
              id="date"
              label="Data"
              type="date"
              {...register('date')}
              error={errors.date?.message}
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
              id="minScore"
              label="Nota Mínima"
              type="number"
              step="0.1"
              {...register('minScore', { valueAsNumber: true })}
              error={errors.minScore?.message}
            />
            <Input
              id="maxScore"
              label="Nota Máxima"
              type="number"
              step="0.1"
              {...register('maxScore', { valueAsNumber: true })}
              error={errors.maxScore?.message}
            />
            <Input
              id="topN"
              label="Top N (Ranking)"
              type="number"
              {...register('topN', { valueAsNumber: true })}
              error={errors.topN?.message}
            />
          </div>

          <div>
            <label className="text-sm font-medium text-secondary-700">Texto do Certificado</label>
            <textarea
              {...register('certificateText')}
              rows={4}
              placeholder="Ex: Certificamos que {participant_name} participou do {event_name}..."
              className="mt-1 block w-full rounded-md border border-secondary-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            />
            <p className="mt-2 text-xs text-secondary-500">
              Placeholders: {'{participant_name}'}, {'{event_name}'}, {'{date}'}, {'{rank}'}, {'{score}'}
            </p>
            {errors.certificateText && (
              <p className="mt-1 text-xs text-danger-500">{errors.certificateText.message}</p>
            )}
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
