import { beforeEach, describe, expect, it, vi } from 'vitest'
import App from '@/App'
import * as authStore from '@/stores/auth'
import { render, screen, waitFor } from '@test/support/utils'

vi.mock('@/pages/Dashboard', () => ({
  default: () => <div>Dashboard Page</div>,
}))

vi.mock('@/pages/Strategies', () => ({
  default: () => <div>Strategies Page</div>,
}))

vi.mock('@/pages/Backtest', () => ({
  default: () => <div>Backtest Page</div>,
}))

vi.mock('@/pages/MarketData', () => ({
  default: () => <div>Market Data Page</div>,
}))

vi.mock('@/pages/Analytics', () => ({
  default: () => <div>Analytics Page</div>,
}))

vi.mock('@/pages/Portfolio', () => ({
  default: () => <div>Portfolio Page</div>,
}))

vi.mock('@/pages/auth/Login', () => ({
  default: () => <div>Login Page</div>,
}))

vi.mock('@/pages/auth/Register', () => ({
  default: () => <div>Register Page</div>,
}))

vi.mock('@/pages/auth/ChangePassword', () => ({
  default: () => <div>Change Password Page</div>,
}))

vi.mock('@/components/Layout', () => {
  const { Outlet } = require('react-router-dom')
  return { default: () => <Outlet /> }
})

vi.mock('@/stores/auth', () => ({
  useAuthStore: vi.fn(),
}))

const mockMe = vi.fn()
vi.mock('@/lib/api', () => ({
  authAPI: {
    me: (...args: unknown[]) => mockMe(...args),
  },
}))

const mockUser = { id: 1, username: 'test', email: 'test@test.com' }
const mockSetAuth = vi.fn()
const mockLogout = vi.fn()

function mockAuthState(overrides: Partial<Record<string, unknown>> = {}) {
  vi.mocked(authStore.useAuthStore).mockReturnValue({
    isAuthenticated: false,
    hasHydrated: true,
    user: null,
    setAuth: mockSetAuth,
    logout: mockLogout,
    ...overrides,
  } as never)
}

describe('App Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    sessionStorage.clear()
    window.history.pushState({}, '', '/')
  })

  it('redirects to login when not authenticated', async () => {
    mockAuthState()

    render(<App />)

    await waitFor(() => {
      expect(window.location.pathname).toBe('/login')
    })
  })

  it('shows dashboard when authenticated and on root path', async () => {
    localStorage.setItem('access_token', 'test-token')
    localStorage.setItem('refresh_token', 'test-refresh')
    mockMe.mockResolvedValue({ data: mockUser })

    mockAuthState({
      isAuthenticated: true,
      user: mockUser,
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

    mockAuthState({
      isAuthenticated: true,
      user: mockUser,
    })

    render(<App />)

    await waitFor(() => {
      expect(screen.getByText('Dashboard Page')).toBeInTheDocument()
    })
  })

  describe('Route Protection', () => {
    it('protects /strategies route', async () => {
      mockAuthState()

      window.history.pushState({}, 'Strategies', '/strategies')
      render(<App />)

      await waitFor(() => {
        expect(screen.getByText('Login Page')).toBeInTheDocument()
      })
    })

    it('protects /backtest route', async () => {
      mockAuthState()

      window.history.pushState({}, 'Backtest', '/backtest')
      render(<App />)

      await waitFor(() => {
        expect(screen.getByText('Login Page')).toBeInTheDocument()
      })
    })

    it('protects /analytics route', async () => {
      mockAuthState()

      window.history.pushState({}, 'Analytics', '/analytics')
      render(<App />)

      await waitFor(() => {
        expect(screen.getByText('Login Page')).toBeInTheDocument()
      })
    })

    it('protects /portfolio route', async () => {
      mockAuthState()

      window.history.pushState({}, 'Portfolio', '/portfolio')
      render(<App />)

      await waitFor(() => {
        expect(screen.getByText('Login Page')).toBeInTheDocument()
      })
    })
  })

  describe('Authentication Flow', () => {
    it('completes full authentication flow', async () => {
      mockAuthState()

      const { unmount } = render(<App />)
      await waitFor(() => {
        expect(window.location.pathname).toBe('/login')
      })
      unmount()

      localStorage.setItem('access_token', 'test-token')
      localStorage.setItem('refresh_token', 'test-refresh')
      mockMe.mockResolvedValue({ data: mockUser })

      mockAuthState({
        isAuthenticated: true,
        user: mockUser,
      })

      window.history.pushState({}, '', '/')
      render(<App />)

      await waitFor(() => {
        expect(screen.getByText('Dashboard Page')).toBeInTheDocument()
      })
    })
  })
})
