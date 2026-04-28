import type { UserRole } from '../enums'

export interface User {
  id: string
  email: string
  name: string
  role: UserRole
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface UserSummary {
  id: string
  name: string
  role: UserRole
}
