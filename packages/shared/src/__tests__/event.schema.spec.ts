import { createEventSchema } from '../schemas/event.schema'
import { CalculationRule } from '../enums'

describe('event.schema', () => {
  it('accepts valid event', () => {
    const payload = {
      name: 'Test Event',
      eventDate: '2026-12-15',
      location: 'Test Location',
      organizer: 'Test Organizer',
      calculationRule: CalculationRule.R1,
      scoreMin: 5,
      scoreMax: 10,
      topN: 10,
    }
    expect(createEventSchema.parse(payload)).toEqual(payload)
  })

  it('rejects invalid date format', () => {
    const res = createEventSchema.safeParse({
      name: 'Event',
      eventDate: '15/12/2026',
      location: 'L',
      organizer: 'O',
      calculationRule: CalculationRule.R1,
      scoreMin: 5,
      scoreMax: 10,
      topN: 10,
    })
    expect(res.success).toBe(false)
  })

  it('rejects scoreMin >= scoreMax', () => {
    const res = createEventSchema.safeParse({
      name: 'Event',
      eventDate: '2026-12-15',
      location: 'Valid Location',
      organizer: 'Valid Organizer',
      calculationRule: CalculationRule.R1,
      scoreMin: 10,
      scoreMax: 5,
      topN: 10,
    })
    expect(res.success).toBe(false)
    if (!res.success) {
      // Find the specific error for scoreMax/refinement
      const refineError = res.error.errors.find(e => e.message === 'Nota mínima deve ser menor que a máxima')
      expect(refineError).toBeDefined()
    }
  })

})
