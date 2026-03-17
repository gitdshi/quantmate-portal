/**
 * Comprehensive Auth Store Tests
 * Tests Zustand store state management, persistence, and edge cases
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { useAuthStore } from './auth'

describe('Auth Store - Comprehensive', () => {
  beforeEach(() => {
    localStorage.clear()
    // Reset store state
    useAuthStore.setState({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
    })
  })

  afterEach(() => {
    localStorage.clear()
  })

  describe('initial state', () => {
    it('starts with null user', () => {
      expect(useAuthStore.getState().user).toBeNull()
    })

    it('starts unauthenticated', () => {
      expect(useAuthStore.getState().isAuthenticated).toBe(false)
    })

    it('starts with null tokens', () => {
      const state = useAuthStore.getState()
      expect(state.accessToken).toBeNull()
      expect(state.refreshToken).toBeNull()
    })
  })

  describe('setAuth', () => {
    const mockUser = { id: 1, username: 'trader', email: 'trader@qm.com' }

    it('sets user object', () => {
      useAuthStore.getState().setAuth(mockUser, 'at-1', 'rt-1')
      expect(useAuthStore.getState().user).toEqual(mockUser)
    })

    it('sets isAuthenticated to true', () => {
      useAuthStore.getState().setAuth(mockUser, 'at-1', 'rt-1')
      expect(useAuthStore.getState().isAuthenticated).toBe(true)
    })

    it('stores access token in state', () => {
      useAuthStore.getState().setAuth(mockUser, 'access-tok', 'refresh-tok')
      expect(useAuthStore.getState().accessToken).toBe('access-tok')
    })

    it('stores refresh token in state', () => {
      useAuthStore.getState().setAuth(mockUser, 'access-tok', 'refresh-tok')
      expect(useAuthStore.getState().refreshToken).toBe('refresh-tok')
    })

    it('persists access_token to localStorage', () => {
      useAuthStore.getState().setAuth(mockUser, 'my-access', 'my-refresh')
      expect(localStorage.getItem('access_token')).toBe('my-access')
    })

    it('persists refresh_token to localStorage', () => {
      useAuthStore.getState().setAuth(mockUser, 'my-access', 'my-refresh')
      expect(localStorage.getItem('refresh_token')).toBe('my-refresh')
    })

    it('overwrites previous auth state', () => {
      const user1 = { id: 1, username: 'user1', email: 'a@test.com' }
      const user2 = { id: 2, username: 'user2', email: 'b@test.com' }

      useAuthStore.getState().setAuth(user1, 'at-1', 'rt-1')
      useAuthStore.getState().setAuth(user2, 'at-2', 'rt-2')

      const state = useAuthStore.getState()
      expect(state.user).toEqual(user2)
      expect(state.accessToken).toBe('at-2')
    })
  })

  describe('logout', () => {
    const mockUser = { id: 1, username: 'trader', email: 'trader@qm.com' }

    beforeEach(() => {
      useAuthStore.getState().setAuth(mockUser, 'at-1', 'rt-1')
    })

    it('clears user', () => {
      useAuthStore.getState().logout()
      expect(useAuthStore.getState().user).toBeNull()
    })

    it('sets isAuthenticated to false', () => {
      useAuthStore.getState().logout()
      expect(useAuthStore.getState().isAuthenticated).toBe(false)
    })

    it('clears access token from state', () => {
      useAuthStore.getState().logout()
      expect(useAuthStore.getState().accessToken).toBeNull()
    })

    it('clears refresh token from state', () => {
      useAuthStore.getState().logout()
      expect(useAuthStore.getState().refreshToken).toBeNull()
    })

    it('removes access_token from localStorage', () => {
      useAuthStore.getState().logout()
      expect(localStorage.getItem('access_token')).toBeNull()
    })

    it('removes refresh_token from localStorage', () => {
      useAuthStore.getState().logout()
      expect(localStorage.getItem('refresh_token')).toBeNull()
    })

    it('is idempotent — calling twice does not throw', () => {
      useAuthStore.getState().logout()
      expect(() => useAuthStore.getState().logout()).not.toThrow()
    })
  })

  describe('store persistence', () => {
    it('store name is auth-storage', () => {
      // Zustand persist writes to localStorage under the configured name
      const mockUser = { id: 1, username: 'u', email: 'e@t.com' }
      useAuthStore.getState().setAuth(mockUser, 'a', 'r')

      const stored = localStorage.getItem('auth-storage')
      expect(stored).not.toBeNull()
      if (stored) {
        const parsed = JSON.parse(stored)
        expect(parsed.state.user.username).toBe('u')
        expect(parsed.state.isAuthenticated).toBe(true)
      }
    })
  })
})
