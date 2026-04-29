import { describe, it, expect, beforeEach } from 'vitest'
import { useAuthStore } from '../auth.store'
import { UserRole } from '@judging/shared'

describe('useAuthStore', () => {
  beforeEach(() => {
    useAuthStore.getState().clearSession()
    sessionStorage.clear()
  })

  it('should initialize with null values', () => {
    const state = useAuthStore.getState()
    expect(state.user).toBeNull()
    expect(state.accessToken).toBeNull()
    expect(state.isAuthenticated).toBe(false)
  })

  it('should set session correctly', () => {
    const mockUser = { id: '1', name: 'Admin', email: 'admin@test.com', role: UserRole.GESTOR, isActive: true, createdAt: new Date().toISOString() }
    const mockResponse = {
      accessToken: 'access',
      refreshToken: 'refresh',
      user: mockUser,
    }

    useAuthStore.getState().setSession(mockResponse)

    const state = useAuthStore.getState()
    expect(state.user).toEqual(mockUser)
    expect(state.accessToken).toBe('access')
    expect(state.isAuthenticated).toBe(true)
  })

  it('should clear session correctly', () => {
    const mockUser = { id: '1', name: 'Admin', email: 'admin@test.com', role: UserRole.GESTOR, isActive: true, createdAt: new Date().toISOString() }
    useAuthStore.getState().setSession({
      accessToken: 'access',
      refreshToken: 'refresh',
      user: mockUser,
    })

    useAuthStore.getState().clearSession()

    const state = useAuthStore.getState()
    expect(state.user).toBeNull()
    expect(state.isAuthenticated).toBe(false)
  })
})
