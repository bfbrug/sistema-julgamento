import { describe, it, expect, vi, beforeEach } from 'vitest'
import { apiClient, ApiError } from '../api'

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
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      headers: new Headers(),
      json: () => Promise.resolve({ data: { success: true } }),
    } as unknown as Response)

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
    vi.mocked(global.fetch).mockResolvedValue({
      ok: false,
      status: 400,
      headers: new Headers(),
      json: () => Promise.resolve({ error: 'Bad Request', code: 'BAD_REQUEST' }),
    } as unknown as Response)

    await expect(apiClient({ method: 'GET', path: '/test' })).rejects.toThrow(ApiError)
  })

  it('should return data on success', async () => {
    const mockData = { id: 1, name: 'Test' }
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      headers: new Headers(),
      json: () => Promise.resolve({ data: mockData }),
    } as unknown as Response)

    const result = await apiClient({ method: 'GET', path: '/test' })

    expect(result).toEqual(mockData)
  })
})
