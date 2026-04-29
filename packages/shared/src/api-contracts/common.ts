export interface Paginated<T> {
  data: T[]
  meta: {
    page: number
    pageSize: number
    total: number
    totalPages: number
  }
}

export interface ApiError {
  error: string
  code?: string
  details?: unknown
}

export interface ApiSuccess<T> {
  data: T
}
