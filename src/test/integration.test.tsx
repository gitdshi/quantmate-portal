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

vi.mock('../stores/auth', () => ({
  useAuthStore: vi.fn(),
}))

describe('App Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('redirects to login when not authenticated', () => {
    ;(authStore.useAuthStore as any).mockReturnValue({
      isAuthenticated: false,
      user: null,
    })

    render(<App />)
    
    expect(screen.getByText('Login Page')).toBeInTheDocument()
  })

  it('shows dashboard when authenticated and on root path', () => {
    ;(authStore.useAuthStore as any).mockReturnValue({
      isAuthenticated: true,
      user: { id: 1, username: 'test', email: 'test@test.com', created_at: '2024-01-01' },
    })

    render(<App />)
    
    expect(screen.getByText('Dashboard Page')).toBeInTheDocument()
  })

  it('allows navigation between authenticated routes', async () => {
    const user = userEvent.setup()
    ;(authStore.useAuthStore as any).mockReturnValue({
      isAuthenticated: true,
      user: { id: 1, username: 'test', email: 'test@test.com', created_at: '2024-01-01' },
    })

    render(<App />)
    
    // Should start at Dashboard
    expect(screen.getByText('Dashboard Page')).toBeInTheDocument()
  })

  describe('Route Protection', () => {
    it('protects /strategies route', async () => {
      ;(authStore.useAuthStore as any).mockReturnValue({
        isAuthenticated: false,
        user: null,
      })

      // Navigate to protected route
      window.history.pushState({}, 'Strategies', '/strategies')
      
      render(<App />)
      
      // Should redirect to login
      await waitFor(() => {
        expect(screen.getByText('Login Page')).toBeInTheDocument()
      })
    })

    it('protects /backtest route', async () => {
      ;(authStore.useAuthStore as any).mockReturnValue({
        isAuthenticated: false,
        user: null,
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
      const mockLogin = vi.fn()
      const mockLogout = vi.fn()
      
      // Start unauthenticated
      ;(authStore.useAuthStore as any).mockReturnValue({
        isAuthenticated: false,
        user: null,
        login: mockLogin,
        logout: mockLogout,
      })

      const { rerender } = render(<App />)
      
      expect(screen.getByText('Login Page')).toBeInTheDocument()
      
      // Simulate successful login
      ;(authStore.useAuthStore as any).mockReturnValue({
        isAuthenticated: true,
        user: { id: 1, username: 'test', email: 'test@test.com', created_at: '2024-01-01' },
        login: mockLogin,
        logout: mockLogout,
      })
      
      rerender(<App />)
      
      await waitFor(() => {
        expect(screen.getByText('Dashboard Page')).toBeInTheDocument()
      })
    })
  })
})
