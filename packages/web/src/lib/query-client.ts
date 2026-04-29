import { QueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { ApiError } from './api'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30 * 1000, // 30 seconds
      refetchOnWindowFocus: true,
      retry: (failureCount, error) => {
        if (error instanceof ApiError && error.status === 401) return false
        return failureCount < 1
      },
    },
    mutations: {
      retry: 1,
      onError: (error) => {
        if (error instanceof ApiError) {
          toast.error(error.message)
        } else {
          toast.error('Ocorreu um erro inesperado. Tente novamente.')
        }
      },
    },
  },
})
