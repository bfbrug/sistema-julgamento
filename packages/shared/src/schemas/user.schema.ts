import { z } from 'zod'
import { UserRole } from '../enums'

export const userRoleSchema = z.nativeEnum(UserRole)

export const createUserSchema = z.object({
  email: z.string().email('Email inválido'),
  name: z.string().min(2, 'Nome muito curto').max(120, 'Nome muito longo'),
  password: z.string().min(8, 'Senha precisa de no mínimo 8 caracteres').max(72, 'Senha muito longa'),
  role: userRoleSchema,
})

export const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(1, 'Senha é obrigatória'),
})

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Senha atual é obrigatória'),
    newPassword: z.string().min(8, 'Nova senha precisa de no mínimo 8 caracteres').max(72, 'Senha muito longa'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'As senhas não coincidem',
    path: ['confirmPassword'],
  })

export const updateUserSchema = z.object({
  email: z.string().email('Email inválido').optional(),
  name: z.string().min(2, 'Nome muito curto').max(120, 'Nome muito longo').optional(),
  password: z.string().min(8, 'Senha precisa de no mínimo 8 caracteres').max(72, 'Senha muito longa').optional(),
  role: userRoleSchema.optional(),
  isActive: z.boolean().optional(),
})
