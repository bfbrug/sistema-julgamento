import { z } from 'zod'

export const createParticipantSchema = z.object({
  name: z.string().min(2, 'Nome muito curto').max(200, 'Nome muito longo'),
  photoPath: z.string().optional().nullable(),
  presentationOrder: z.number().int().min(1),
})

export const updateParticipantSchema = createParticipantSchema.partial().extend({
  isAbsent: z.boolean().optional(),
})
