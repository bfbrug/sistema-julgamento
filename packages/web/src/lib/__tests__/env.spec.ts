import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

describe('env', () => {
  const originalEnv = process.env

  beforeEach(() => {
    vi.resetModules()
    process.env = { ...originalEnv }
  })

  afterEach(() => {
    process.env = originalEnv
  })

  it('lança erro quando NEXT_PUBLIC_API_URL está ausente', async () => {
    delete process.env['NEXT_PUBLIC_API_URL']
    await expect(import('../env')).rejects.toThrow()
  })

  it('retorna env validada com valores válidos', async () => {
    process.env['NEXT_PUBLIC_API_URL'] = 'http://localhost:3000/api'
    process.env['NEXT_PUBLIC_WS_URL'] = 'http://localhost:3000'
    const { env } = await import('../env')
    expect(env.NEXT_PUBLIC_API_URL).toBe('http://localhost:3000/api')
    expect(env.NEXT_PUBLIC_WS_URL).toBe('http://localhost:3000')
  })
})
