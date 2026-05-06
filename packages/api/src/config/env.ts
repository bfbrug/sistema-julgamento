import { z } from 'zod'

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  LOG_LEVEL: z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal']).default('info'),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL é obrigatória'),
  // Aceita múltiplas origens separadas por vírgula: "https://a.railway.app,https://b.com"
  CORS_ORIGIN: z.string().min(1, 'CORS_ORIGIN é obrigatória').default('http://localhost:3001'),
  JWT_ACCESS_SECRET: z.string().min(32, 'JWT_ACCESS_SECRET deve ter no mínimo 32 caracteres'),
  JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_SECRET: z.string().min(32, 'JWT_REFRESH_SECRET deve ter no mínimo 32 caracteres'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),
  BCRYPT_ROUNDS: z.coerce.number().int().min(10).max(14).default(10),
  THROTTLE_AUTH_TTL: z.coerce.number().int().positive().default(60),
  THROTTLE_AUTH_LIMIT: z.coerce.number().int().positive().default(5),
  STORAGE_DRIVER: z.enum(['local']).default('local'),
  STORAGE_LOCAL_ROOT: z.string().default('./uploads'),
  PARTICIPANT_PHOTO_MAX_BYTES: z.coerce.number().int().positive().default(2097152),
  PARTICIPANT_PHOTO_ALLOWED_MIMES: z.string().default('image/jpeg,image/png'),
  REDIS_URL: z.string().default('redis://localhost:6379'),
  REDIS_HOST: z.string().default('localhost'),
  REDIS_PORT: z.coerce.number().int().positive().default(6379),
}).refine(data => data.JWT_ACCESS_SECRET !== data.JWT_REFRESH_SECRET, {
  message: 'JWT_ACCESS_SECRET e JWT_REFRESH_SECRET não podem ser iguais',
  path: ['JWT_REFRESH_SECRET']
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
