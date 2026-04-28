import { describe, it, expect, vi, beforeEach } from 'vitest'
import { apiClient, ApiError } from '../api'

const mockFetch = vi.fn()

beforeEach(() => {
  vi.stubGlobal('fetch', mockFetch)
  mockFetch.mockReset()
  vi.stubEnv('NEXT_PUBLIC_API_URL', 'http://localhost:3000/api')
  vi.stubEnv('NEXT_PUBLIC_WS_URL', 'http://localhost:3000')
})

describe('apiClient', () => {
  it('faz requisição GET e desempacota { data }', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ data: [{ id: 1 }] }),
    })

    const result = await apiClient<{ id: number }[]>({ method: 'GET', path: '/events' })

    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:3000/api/events',
      expect.objectContaining({ method: 'GET' }),
    )
    expect(result).toEqual([{ id: 1 }])
  })

  it('lança ApiError em resposta 4xx', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 404,
      json: async () => ({ error: 'Not found', code: 'NOT_FOUND' }),
    })

    await expect(
      apiClient<unknown>({ method: 'GET', path: '/missing' }),
    ).rejects.toBeInstanceOf(ApiError)
  })

  it('lança ApiError em resposta 5xx', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => ({ error: 'Internal server error' }),
    })

    await expect(
      apiClient<unknown>({ method: 'GET', path: '/broken' }),
    ).rejects.toBeInstanceOf(ApiError)
  })

  it('ApiError carrega status e mensagem', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 422,
      json: async () => ({ error: 'Unprocessable', code: 'VALIDATION_ERROR' }),
    })

    try {
      await apiClient<unknown>({ method: 'POST', path: '/validate', body: {} })
    } catch (err) {
      expect(err).toBeInstanceOf(ApiError)
      const apiErr = err as ApiError
      expect(apiErr.status).toBe(422)
      expect(apiErr.message).toBe('Unprocessable')
      expect(apiErr.code).toBe('VALIDATION_ERROR')
    }
  })

  it('lança ApiError genérico quando corpo de erro não tem campo error', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 503,
      json: async () => 'Service Unavailable',
    })

    await expect(
      apiClient<unknown>({ method: 'GET', path: '/unavailable' }),
    ).rejects.toBeInstanceOf(ApiError)
  })

  it('retorna responseBody diretamente quando não tem campo data', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ id: 42, name: 'test' }),
    })

    const result = await apiClient<{ id: number; name: string }>({ method: 'GET', path: '/raw' })
    expect(result).toEqual({ id: 42, name: 'test' })
  })
})
