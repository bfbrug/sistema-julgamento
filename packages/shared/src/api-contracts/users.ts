import type { UserRole } from '../enums'
import type { User } from '../domain/user'
import type { Paginated } from './common'

export interface CreateUserRequest {
  email: string
  name: string
  password: string
  role: UserRole
}

export interface UpdateUserRequest {
  email?: string
  name?: string
  password?: string
  role?: UserRole
  isActive?: boolean
}

export interface ListUsersQuery {
  page?: number
  pageSize?: number
  search?: string
  role?: UserRole
  isActive?: boolean
}

export type UserResponse = User

export type ListUsersResponse = Paginated<UserResponse>

export interface UpdateMeRequest {
  name?: string
  email?: string
}

export interface ChangePasswordRequest {
  currentPassword: string
  newPassword: string
}
