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

interface ApiErrorBody {
  error: string
  code?: string
}

interface ApiSuccessBody<T> {
  data: T
}

type ApiResponseBody<T> = ApiSuccessBody<T> | ApiErrorBody

interface ApiClientOptions<B> {
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  path: string
  body?: B
  headers?: Record<string, string>
}

function isApiError(body: unknown): body is ApiErrorBody {
  return typeof body === 'object' && body !== null && 'error' in body
}

function isApiSuccess<T>(body: unknown): body is ApiSuccessBody<T> {
  return typeof body === 'object' && body !== null && 'data' in body
}

export async function apiClient<T, B = unknown>({
  method,
  path,
  body,
  headers,
}: ApiClientOptions<B>): Promise<T> {
  const baseUrl = process.env['NEXT_PUBLIC_API_URL'] ?? ''
  const url = `${baseUrl}${path}`

  const res = await fetch(url, {
    method,
    credentials: 'include', // TODO P03: necessário quando cookies de auth forem adicionados
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })

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
