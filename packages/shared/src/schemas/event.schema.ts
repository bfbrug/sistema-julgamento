import { z } from 'zod'
import { CalculationRule, EventStatus } from '../enums'

export const calculationRuleSchema = z.nativeEnum(CalculationRule)
export const eventStatusSchema = z.nativeEnum(EventStatus)

export const eventBaseSchema = z.object({
  name: z.string().min(2, 'Nome muito curto').max(200, 'Nome muito longo'),
  eventDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data inválida (formato YYYY-MM-DD)'),
  location: z.string().min(2, 'Localização muito curta'),
  organizer: z.string().min(2, 'Organizador muito curto'),
  calculationRule: calculationRuleSchema,
  scoreMin: z.number().min(0).max(100),
  scoreMax: z.number().min(0).max(100),
  topN: z.number().int().min(1).max(1000),
})

export const createEventSchema = eventBaseSchema.refine((data) => data.scoreMin < data.scoreMax, {
  message: 'Nota mínima deve ser menor que a máxima',
  path: ['scoreMax'],
})

export const updateEventSchema = eventBaseSchema.partial().extend({
  status: eventStatusSchema.optional(),
})

export const transitionEventSchema = z.object({
  targetStatus: eventStatusSchema,
  acknowledgeR2Coverage: z.boolean().optional(),
})

