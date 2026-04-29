'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/api'
import type { CategoryResponse, CreateCategoryDto, UpdateCategoryDto } from '@judging/shared'
import { toast } from 'sonner'

export function useCategories(eventId: string) {
  return useQuery({
    queryKey: ['events', eventId, 'categories'],
    queryFn: () => apiClient<CategoryResponse[]>({ method: 'GET', path: `/events/${eventId}/categories` }),
    enabled: !!eventId,
  })
}

export function useCreateCategory(eventId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: CreateCategoryDto) =>
      apiClient<CategoryResponse, CreateCategoryDto>({ method: 'POST', path: `/events/${eventId}/categories`, body: data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events', eventId, 'categories'] })
      toast.success('Categoria adicionada!')
    },
  })
}

export function useUpdateCategory(eventId: string, categoryId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: UpdateCategoryDto) =>
      apiClient<CategoryResponse, UpdateCategoryDto>({ method: 'PATCH', path: `/events/${eventId}/categories/${categoryId}`, body: data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events', eventId, 'categories'] })
      toast.success('Categoria atualizada!')
    },
  })
}

export function useDeleteCategory(eventId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (categoryId: string) =>
      apiClient({ method: 'DELETE', path: `/events/${eventId}/categories/${categoryId}` }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events', eventId, 'categories'] })
      toast.success('Categoria excluída!')
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao excluir categoria.')
    }
  })
}

export function useReorderCategories(eventId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (categoryIds: string[]) =>
      apiClient({ method: 'POST', path: `/events/${eventId}/categories/reorder`, body: { categoryIds } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events', eventId, 'categories'] })
    },
  })
}
