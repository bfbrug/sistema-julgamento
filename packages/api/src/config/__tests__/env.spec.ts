import { describe, it, expect, beforeEach, afterEach } from 'vitest'

describe('env validation', () => {
  const originalEnv = process.env

  beforeEach(() => {
    process.env = { ...originalEnv }
    vi.resetModules()
  })

  afterEach(() => {
    process.env = originalEnv
  })

  it('falha quando DATABASE_URL está ausente', async () => {
    delete process.env['DATABASE_URL']
    await expect(() => import('../env')).rejects.toThrow()
  })

  it('falha quando PORT não é numérica', async () => {
    process.env['PORT'] = 'abc'
    process.env['DATABASE_URL'] = 'postgresql://localhost/test'
    await expect(() => import('../env')).rejects.toThrow()
  })

  it('retorna objeto tipado com env válida', async () => {
    process.env['NODE_ENV'] = 'development'
    process.env['PORT'] = '3000'
    process.env['DATABASE_URL'] = 'postgresql://localhost/test'
    process.env['CORS_ORIGIN'] = 'http://localhost:3001'
    process.env['LOG_LEVEL'] = 'info'
    process.env['JWT_ACCESS_SECRET'] = 'secret-1'
    process.env['JWT_REFRESH_SECRET'] = 'secret-2'

    const { env } = await import('../env')

    expect(env.PORT).toBe(3000)
    expect(env.NODE_ENV).toBe('development')
    expect(env.DATABASE_URL).toBe('postgresql://localhost/test')
  })
})
