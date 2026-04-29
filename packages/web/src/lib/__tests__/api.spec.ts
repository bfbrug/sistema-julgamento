import { describe, it, expect, vi, beforeEach } from 'vitest'
import { apiClient, ApiError } from '../api'
import { useAuthStore } from '@/stores/auth.store'

vi.mock('@/stores/auth.store', () => ({
  useAuthStore: {
    getState: vi.fn(() => ({
      accessToken: 'test-token',
      refreshToken: 'refresh-token',
      clearSession: vi.fn(),
      setTokens: vi.fn(),
    })),
  },
}))

describe('apiClient', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    global.fetch = vi.fn()
  })

  it('should include Authorization header if token exists', async () => {
    ;(global.fetch as any).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: { success: true } }),
    })

    await apiClient({ method: 'GET', path: '/test' })

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/test'),
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer test-token',
        }),
      })
    )
  })

  it('should throw ApiError if response is not ok', async () => {
    ;(global.fetch as any).mockResolvedValue({
      ok: false,
      status: 400,
      json: () => Promise.resolve({ error: 'Bad Request', code: 'BAD_REQUEST' }),
    })

    await expect(apiClient({ method: 'GET', path: '/test' })).rejects.toThrow(ApiError)
  })

  it('should return data on success', async () => {
    const mockData = { id: 1, name: 'Test' }
    ;(global.fetch as any).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: mockData }),
    })

    const result = await apiClient({ method: 'GET', path: '/test' })

    expect(result).toEqual(mockData)
  })
})
