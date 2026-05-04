export class PublicApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message)
    this.name = 'PublicApiError'
  }
}

const baseUrl = process.env['NEXT_PUBLIC_API_URL'] ?? ''

export async function publicApiClient<T>(path: string): Promise<T> {
  const cleanPath = path.startsWith('/api') ? path.slice(4) : path
  const url = `${baseUrl}${cleanPath}`
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
  })

  if (!res.ok) {
    throw new PublicApiError(`HTTP ${res.status}`, res.status)
  }

  const body = (await res.json()) as unknown
  if (typeof body === 'object' && body !== null && 'data' in body) {
    return (body as { data: T }).data
  }
  return body as T
}
