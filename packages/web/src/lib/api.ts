import type { ApiError as SharedApiError, ApiSuccess } from '@judging/shared'
import { useAuthStore } from '@/stores/auth.store'
import { toast } from 'sonner'

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code?: string,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

type ApiResponseBody<T> = ApiSuccess<T> | SharedApiError

interface ApiClientOptions<B> {
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  path: string
  body?: B
  headers?: Record<string, string>
}

function isApiError(body: unknown): body is SharedApiError {
  return typeof body === 'object' && body !== null && 'error' in body
}

function isApiSuccess<T>(body: unknown): body is ApiSuccess<T> {
  return typeof body === 'object' && body !== null && 'data' in body
}

let isRefreshing = false
let refreshSubscribers: ((accessToken: string) => void)[] = []

function subscribeTokenRefresh(cb: (accessToken: string) => void) {
  refreshSubscribers.push(cb)
}

function onRefreshed(accessToken: string) {
  refreshSubscribers.map((cb) => cb(accessToken))
  refreshSubscribers = []
}

async function handleRefresh(): Promise<string | null> {
  const { refreshToken, setTokens, clearSession } = useAuthStore.getState()
  
  if (!refreshToken) {
    clearSession()
    return null
  }

  try {
    const baseUrl = process.env['NEXT_PUBLIC_API_URL'] ?? ''
    const res = await fetch(`${baseUrl}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    })

    if (!res.ok) {
      throw new Error('Refresh failed')
    }

    const body = await res.json()
    if (isApiSuccess<{ accessToken: string; refreshToken: string }>(body)) {
      setTokens(body.data)
      return body.data.accessToken
    }
    
    throw new Error('Refresh failed')
  } catch {
    clearSession()
    window.location.href = `/auth/login?next=${window.location.pathname}`
    return null
  }
}

export async function apiClient<T, B = unknown>({
  method,
  path,
  body,
  headers: customHeaders,
}: ApiClientOptions<B>): Promise<T> {
  const baseUrl = process.env['NEXT_PUBLIC_API_URL'] ?? ''
  const url = `${baseUrl}${path}`
  
  const getHeaders = () => {
    const { accessToken } = useAuthStore.getState()
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...customHeaders,
    }
    if (accessToken) {
      headers['Authorization'] = `Bearer ${accessToken}`
    }
    return headers
  }

  const fetchWithAuth = async (): Promise<Response> => {
    try {
      return await fetch(url, {
        method,
        headers: getHeaders(),
        body: body !== undefined ? JSON.stringify(body) : undefined,
      })
    } catch {
      toast.error('Erro de conexão. Verifique sua internet.')
      throw new Error('Network error')
    }
  }

  let res = await fetchWithAuth()

  if (res.status === 401) {
    const responseBody = (await res.clone().json()) as ApiResponseBody<T>
    const errorCode = isApiError(responseBody) ? responseBody.code : undefined

    if (errorCode === 'TOKEN_EXPIRED') {
      if (!isRefreshing) {
        isRefreshing = true
        const newAccessToken = await handleRefresh()
        isRefreshing = false
        if (newAccessToken) {
          onRefreshed(newAccessToken)
        }
      }

      const retryRequest = new Promise<Response>((resolve) => {
        subscribeTokenRefresh(() => {
          resolve(fetchWithAuth())
        })
      })

      res = await retryRequest
    } else if (errorCode === 'INVALID_TOKEN' || !errorCode) {
      useAuthStore.getState().clearSession()
      window.location.href = `/auth/login?next=${window.location.pathname}`
      throw new ApiError('Sessão inválida', 401, 'INVALID_TOKEN')
    }
  }

  if (res.status === 403) {
    toast.error('Sem permissão para realizar esta ação.')
  }

  const responseBody = (await res.json()) as ApiResponseBody<T>

  if (!res.ok) {
    if (isApiError(responseBody)) {
      throw new ApiError(responseBody.error, res.status, responseBody.code)
    }
    throw new ApiError(`HTTP ${res.status}`, res.status)
  }

  if (isApiSuccess<T>(responseBody)) {
    return responseBody.data
  }

  return responseBody as T
}

