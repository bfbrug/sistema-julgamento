import { createParticipantSchema } from '../schemas/participant.schema'

describe('participant.schema', () => {
  it('accepts valid participant', () => {
    const payload = {
      name: 'Test Participant',
      presentationOrder: 1,
    }
    expect(createParticipantSchema.parse(payload)).toEqual(payload)
  })

  it('rejects missing name', () => {
    const res = createParticipantSchema.safeParse({ presentationOrder: 1 })
    expect(res.success).toBe(false)
  })
})
