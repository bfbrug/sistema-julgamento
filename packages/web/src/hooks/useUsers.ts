'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/api'
import type { UserResponse, CreateUserDto, UpdateUserDto } from '@judging/shared'
import { toast } from 'sonner'

export function useUsers(filters?: { role?: string; isActive?: boolean }) {
  const queryParams = new URLSearchParams()
  if (filters?.role) queryParams.append('role', filters.role)
  if (filters?.isActive !== undefined) queryParams.append('isActive', String(filters.isActive))

  return useQuery({
    queryKey: ['users', filters],
    queryFn: () => apiClient<UserResponse[]>({ method: 'GET', path: `/users?${queryParams.toString()}` }),
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
