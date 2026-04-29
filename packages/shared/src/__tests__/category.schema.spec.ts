import { createCategorySchema } from '../schemas/category.schema'

describe('category.schema', () => {
  it('accepts valid category', () => {
    const payload = {
      name: 'Test Category',
      displayOrder: 1,
    }
    expect(createCategorySchema.parse(payload)).toEqual(payload)
  })

  it('rejects short name', () => {
    const res = createCategorySchema.safeParse({ name: 'T', displayOrder: 1 })
    expect(res.success).toBe(false)
  })
})
