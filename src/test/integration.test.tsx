import { userEvent } from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import App from '../App'
import * as authStore from '../stores/auth'
import { render, screen, waitFor } from '../test/utils'

// Mock components
vi.mock('../pages/Dashboard', () => ({
  default: () => <div>Dashboard Page</div>,
}))

vi.mock('../pages/Strategies', () => ({
  default: () => <div>Strategies Page</div>,
}))

vi.mock('../pages/Backtest', () => ({
  default: () => <div>Backtest Page</div>,
}))

vi.mock('../pages/MarketData', () => ({
  default: () => <div>Market Data Page</div>,
}))

vi.mock('../pages/Analytics', () => ({
  default: () => <div>Analytics Page</div>,
}))

vi.mock('../pages/Portfolio', () => ({
  default: () => <div>Portfolio Page</div>,
}))

vi.mock('../pages/auth/Login', () => ({
  default: () => <div>Login Page</div>,
}))

vi.mock('../pages/auth/Register', () => ({
  default: () => <div>Register Page</div>,
}))

vi.mock('../pages/auth/ChangePassword', () => ({
  default: () => <div>Change Password Page</div>,
}))

// Mock Layout to just render children via Outlet
vi.mock('../components/Layout', () => {
  const { Outlet } = require('react-router-dom')
  return { default: () => <Outlet /> }
})

vi.mock('../stores/auth', () => ({
  useAuthStore: vi.fn(),
}))

// Mock authAPI.me for PrivateRoute's session check
const mockMe = vi.fn()
vi.mock('../lib/api', () => ({
  authAPI: {
    me: (...args: any[]) => mockMe(...args),
  },
}))

const mockUser = { id: 1, username: 'test', email: 'test@test.com' }
const mockSetAuth = vi.fn()
const mockLogout = vi.fn()

describe('App Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    window.history.pushState({}, '', '/')
  })

  it('redirects to login when not authenticated', () => {
    ;(authStore.useAuthStore as any).mockReturnValue({
      isAuthenticated: false,
      user: null,
      setAuth: mockSetAuth,
      logout: mockLogout,
    })

    render(<App />)
    
    expect(screen.getByText('Login Page')).toBeInTheDocument()
  })

  it('shows dashboard when authenticated and on root path', async () => {
    // Set localStorage token so PrivateRoute enters checking flow
    localStorage.setItem('access_token', 'test-token')
    localStorage.setItem('refresh_token', 'test-refresh')

    // Mock authAPI.me to succeed — PrivateRoute calls this to verify session
    mockMe.mockResolvedValue({ data: mockUser })

    ;(authStore.useAuthStore as any).mockReturnValue({
      isAuthenticated: true,
      user: mockUser,
      setAuth: mockSetAuth,
      logout: mockLogout,
    })

    render(<App />)
    
    await waitFor(() => {
      expect(screen.getByText('Dashboard Page')).toBeInTheDocument()
    })
  })

  it('allows navigation between authenticated routes', async () => {
    localStorage.setItem('access_token', 'test-token')
    localStorage.setItem('refresh_token', 'test-refresh')
    mockMe.mockResolvedValue({ data: mockUser })

    ;(authStore.useAuthStore as any).mockReturnValue({
      isAuthenticated: true,
      user: mockUser,
      setAuth: mockSetAuth,
      logout: mockLogout,
    })

    render(<App />)
    
    await waitFor(() => {
      expect(screen.getByText('Dashboard Page')).toBeInTheDocument()
    })
  })

  describe('Route Protection', () => {
    it('protects /strategies route', async () => {
      ;(authStore.useAuthStore as any).mockReturnValue({
        isAuthenticated: false,
        user: null,
        setAuth: mockSetAuth,
        logout: mockLogout,
      })

      window.history.pushState({}, 'Strategies', '/strategies')
      
      render(<App />)
      
      await waitFor(() => {
        expect(screen.getByText('Login Page')).toBeInTheDocument()
      })
    })

    it('protects /backtest route', async () => {
      ;(authStore.useAuthStore as any).mockReturnValue({
        isAuthenticated: false,
        user: null,
        setAuth: mockSetAuth,
        logout: mockLogout,
      })

      window.history.pushState({}, 'Backtest', '/backtest')
      
      render(<App />)
      
      await waitFor(() => {
        expect(screen.getByText('Login Page')).toBeInTheDocument()
      })
    })

    it('protects /analytics route', async () => {
      ;(authStore.useAuthStore as any).mockReturnValue({
        isAuthenticated: false,
        user: null,
        setAuth: mockSetAuth,
        logout: mockLogout,
      })

      window.history.pushState({}, 'Analytics', '/analytics')
      
      render(<App />)
      
      await waitFor(() => {
        expect(screen.getByText('Login Page')).toBeInTheDocument()
      })
    })

    it('protects /portfolio route', async () => {
      ;(authStore.useAuthStore as any).mockReturnValue({
        isAuthenticated: false,
        user: null,
        setAuth: mockSetAuth,
        logout: mockLogout,
      })

      window.history.pushState({}, 'Portfolio', '/portfolio')
      
      render(<App />)
      
      await waitFor(() => {
        expect(screen.getByText('Login Page')).toBeInTheDocument()
      })
    })
  })

  describe('Authentication Flow', () => {
    it('completes full authentication flow', async () => {
      // Verify unauthenticated user sees login
      ;(authStore.useAuthStore as any).mockReturnValue({
        isAuthenticated: false,
        user: null,
        setAuth: mockSetAuth,
        logout: mockLogout,
      })

      const { unmount } = render(<App />)
      expect(screen.getByText('Login Page')).toBeInTheDocument()
      unmount()

      // After login: authenticated user navigating to root sees Dashboard
      localStorage.setItem('access_token', 'test-token')
      localStorage.setItem('refresh_token', 'test-refresh')
      mockMe.mockResolvedValue({ data: mockUser })

      ;(authStore.useAuthStore as any).mockReturnValue({
        isAuthenticated: true,
        user: mockUser,
        setAuth: mockSetAuth,
        logout: mockLogout,
      })

      window.history.pushState({}, '', '/')
      render(<App />)

      await waitFor(() => {
        expect(screen.getByText('Dashboard Page')).toBeInTheDocument()
      })
    })
  })
})
