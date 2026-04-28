import { z } from 'zod'

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  LOG_LEVEL: z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal']).default('info'),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL é obrigatória'),
  CORS_ORIGIN: z.string().url('CORS_ORIGIN deve ser uma URL válida').default('http://localhost:3001'),
})

const parsed = envSchema.safeParse(process.env)

if (!parsed.success) {
  const errors = parsed.error.flatten().fieldErrors
  const message = Object.entries(errors)
    .map(([field, msgs]) => `  ${field}: ${(msgs ?? []).join(', ')}`)
    .join('\n')
  throw new Error(`Variáveis de ambiente inválidas:\n${message}`)
}

export const env = parsed.data
export type Env = typeof env
