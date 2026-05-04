'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/api'
import type { UserResponse, CreateUserDto, UpdateUserDto } from '@judging/shared'
import { toast } from 'sonner'

export function useUsers(filters?: { role?: string; excludeRole?: string; isActive?: boolean }) {
  const queryParams = new URLSearchParams()
  if (filters?.role) queryParams.append('role', filters.role)
  if (filters?.excludeRole) queryParams.append('excludeRole', filters.excludeRole)
  if (filters?.isActive !== undefined) queryParams.append('isActive', String(filters.isActive))

  return useQuery({
    queryKey: ['users', filters],
    queryFn: async () => {
      const res = await apiClient<UserResponse[]>({ method: 'GET', path: `/users?${queryParams.toString()}` })
      // Defensive: API may return paginated object { data: [...], meta: {...} }
      if (res && typeof res === 'object' && 'data' in res && Array.isArray((res as any).data)) {
        return (res as any).data as UserResponse[]
      }
      return res
    },
  })
}

export function useUser(id: string) {
  return useQuery({
    queryKey: ['users', id],
    queryFn: () => apiClient<UserResponse>({ method: 'GET', path: `/users/${id}` }),
    enabled: !!id,
  })
}

export function useResetUserPassword(id: string) {
  return useMutation({
    mutationFn: (newPassword: string) =>
      apiClient({ method: 'POST', path: `/users/${id}/reset-password`, body: { newPassword } }),
    onError: (error: Error) => {
      toast.error(error.message || 'Erro ao redefinir senha.')
    },
  })
}

export function useCreateUser() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: CreateUserDto) =>
      apiClient<UserResponse, CreateUserDto>({ method: 'POST', path: '/users', body: data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      toast.success('Usuário criado com sucesso!')
    },
  })
}

export function useUpdateUser(id: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: UpdateUserDto) =>
      apiClient<UserResponse, UpdateUserDto>({ method: 'PATCH', path: `/users/${id}`, body: data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      toast.success('Usuário atualizado com sucesso!')
    },
  })
}

export function useUpdateUserStatus() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateUserDto }) =>
      apiClient<UserResponse, UpdateUserDto>({ method: 'PATCH', path: `/users/${id}`, body: data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      toast.success('Status atualizado com sucesso!')
    },
  })
}

export function useDeleteUser() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => apiClient({ method: 'DELETE', path: `/users/${id}` }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      toast.success('Usuário excluído com sucesso!')
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Erro ao excluir usuário.')
    },
  })
}
