import { beforeEach, describe, expect, it } from 'vitest'
import { useAuthStore } from '@/stores/auth'

describe('Auth Store', () => {
  beforeEach(() => {
    localStorage.clear()
    useAuthStore.setState({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
    })
  })

  it('initializes with no user and not authenticated', () => {
    const { user, isAuthenticated } = useAuthStore.getState()
    
    expect(user).toBeNull()
    expect(isAuthenticated).toBe(false)
  })

  it('sets user and tokens via setAuth', () => {
    const mockUser = {
      id: 1,
      username: 'testuser',
      email: 'test@example.com',
    }
    
    const { setAuth } = useAuthStore.getState()
    setAuth(mockUser, 'test-access-token', 'test-refresh-token')
    
    const { user, isAuthenticated } = useAuthStore.getState()
    expect(user).toEqual(mockUser)
    expect(isAuthenticated).toBe(true)
  })

  it('clears user and tokens on logout', () => {
    // First set auth
    const { setAuth } = useAuthStore.getState()
    setAuth({ id: 1, username: 'test', email: 'test@test.com' }, 'token', 'refresh')
    
    const { logout } = useAuthStore.getState()
    logout()
    
    const { user, isAuthenticated } = useAuthStore.getState()
    expect(user).toBeNull()
    expect(isAuthenticated).toBe(false)
    expect(localStorage.getItem('access_token')).toBeNull()
    expect(localStorage.getItem('refresh_token')).toBeNull()
  })

  it('persists tokens to localStorage', () => {
    const mockUser = {
      id: 1,
      username: 'testuser',
      email: 'test@example.com',
    }
    
    const { setAuth } = useAuthStore.getState()
    setAuth(mockUser, 'test-access-token', 'test-refresh-token')
    
    expect(localStorage.getItem('access_token')).toBe('test-access-token')
    expect(localStorage.getItem('refresh_token')).toBe('test-refresh-token')
  })
})

