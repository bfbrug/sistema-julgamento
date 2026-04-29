import { createUserSchema, changePasswordSchema } from '../schemas/user.schema'
import { UserRole } from '../enums'

describe('user.schema', () => {
  describe('createUserSchema', () => {
    it('accepts valid payload', () => {
      const payload = {
        email: 'test@example.com',
        name: 'Test User',
        password: 'password123',
        role: UserRole.GESTOR,
      }
      expect(createUserSchema.parse(payload)).toEqual(payload)
    })

    it('rejects malformed email', () => {
      const res = createUserSchema.safeParse({ email: 'invalid', name: 't', password: 'p', role: 'x' })
      expect(res.success).toBe(false)
    })
  })

  describe('changePasswordSchema', () => {
    it('fails when confirmPassword differs', () => {
      const res = changePasswordSchema.safeParse({
        currentPassword: 'old',
        newPassword: 'newPassword123',
        confirmPassword: 'different',
      })
      expect(res.success).toBe(false)
      if (!res.success) {
        expect(res.error.errors[0]!.message).toBe('As senhas não coincidem')
      }
    })
  })
})


