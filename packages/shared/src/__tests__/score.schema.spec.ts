import { createScoreSchema } from '../schemas/score.schema'

describe('score.schema', () => {
  const schema = createScoreSchema(5, 10)

  it('validates a correct score', () => {
    expect(schema.parse(7.5)).toBe(7.5)
  })

  it('rejects a score below min', () => {
    const res = schema.safeParse(4.9)
    expect(res.success).toBe(false)
    if (!res.success) {
      expect(res.error.errors[0]!.message).toBe('A nota mínima é 5.0')
    }
  })

  it('rejects a score above max', () => {
    const res = schema.safeParse(10.1)
    expect(res.success).toBe(false)
    if (!res.success) {
      expect(res.error.errors[0]!.message).toBe('A nota máxima é 10.0')
    }
  })

  it('rejects more than one decimal place', () => {
    const res = schema.safeParse(7.55)
    expect(res.success).toBe(false)
    if (!res.success) {
      expect(res.error.errors[0]!.message).toBe('A nota deve ter no máximo 1 casa decimal')
    }
  })


  it('accepts limits', () => {
    expect(schema.parse(5.0)).toBe(5.0)
    expect(schema.parse(10.0)).toBe(10.0)
  })

  it('works with different range', () => {
    const bigSchema = createScoreSchema(0, 100)
    expect(bigSchema.parse(50)).toBe(50)
  })
})
