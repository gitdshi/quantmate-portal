import { describe, expect, it, vi } from 'vitest'
import { useAuthStore } from '../auth'

describe('Auth Store', () => {
  it('initializes with no user and not authenticated', () => {
    const { user, isAuthenticated } = useAuthStore.getState()
    
    expect(user).toBeNull()
    expect(isAuthenticated).toBe(false)
  })

  it('sets user and tokens on successful login', async () => {
    const mockUser = {
      id: 1,
      username: 'testuser',
      email: 'test@example.com',
      created_at: '2024-01-01T00:00:00Z',
    }
    
    const mockAxiosResponse = {
      data: {
        access_token: 'test-access-token',
        refresh_token: 'test-refresh-token',
        user: mockUser,
      },
    }
    
    // Mock API call
    vi.mock('../../lib/api', () => ({
      authAPI: {
        login: vi.fn().mockResolvedValue(mockAxiosResponse),
      },
    }))
    
    const { login } = useAuthStore.getState()
    await login('testuser', 'password')
    
    const { user, isAuthenticated } = useAuthStore.getState()
    expect(user).toEqual(mockUser)
    expect(isAuthenticated).toBe(true)
  })

  it('clears user and tokens on logout', () => {
    const { logout } = useAuthStore.getState()
    logout()
    
    const { user, isAuthenticated } = useAuthStore.getState()
    expect(user).toBeNull()
    expect(isAuthenticated).toBe(false)
    expect(localStorage.getItem('access_token')).toBeNull()
    expect(localStorage.getItem('refresh_token')).toBeNull()
  })

  it('persists tokens to localStorage', async () => {
    const mockUser = {
      id: 1,
      username: 'testuser',
      email: 'test@example.com',
      created_at: '2024-01-01T00:00:00Z',
    }
    
    const mockAxiosResponse = {
      data: {
        access_token: 'test-access-token',
        refresh_token: 'test-refresh-token',
        user: mockUser,
      },
    }
    
    vi.mock('../../lib/api', () => ({
      authAPI: {
        login: vi.fn().mockResolvedValue(mockAxiosResponse),
      },
    }))
    
    const { login } = useAuthStore.getState()
    await login('testuser', 'password')
    
    expect(localStorage.getItem('access_token')).toBe('test-access-token')
    expect(localStorage.getItem('refresh_token')).toBe('test-refresh-token')
  })
})
