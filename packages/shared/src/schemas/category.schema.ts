import { z } from 'zod'

export const createCategorySchema = z.object({
  name: z.string().min(2, 'Nome muito curto').max(100, 'Nome muito longo'),
  displayOrder: z.number().int().min(1),
})

export const updateCategorySchema = createCategorySchema.partial()
