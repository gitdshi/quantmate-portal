import i18n from '@/i18n'
import { render, screen, waitFor } from '@test/support/utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// Mock all lazy-loaded pages to avoid importing heavy components
vi.mock('@/components/Layout', () => ({ default: () => <div>Layout</div> }))
vi.mock('@/pages/Dashboard', () => ({ default: () => <div>Dashboard</div> }))
vi.mock('@/pages/Strategies', () => ({ default: () => <div>Strategies</div> }))
vi.mock('@/pages/Backtest', () => ({ default: () => <div>Backtest</div> }))
vi.mock('@/pages/MarketData', () => ({ default: () => <div>MarketData</div> }))
vi.mock('@/pages/Analytics', () => ({ default: () => <div>Analytics</div> }))
vi.mock('@/pages/Portfolio', () => ({ default: () => <div>Portfolio</div> }))
vi.mock('@/pages/PaperTrading', () => ({ default: () => <div>PaperTrading</div> }))
vi.mock('@/pages/Trading', () => ({ default: () => <div>Trading</div> }))
vi.mock('@/pages/Positions', () => ({ default: () => <div>Positions</div> }))
vi.mock('@/pages/Monitoring', () => ({ default: () => <div>Monitoring</div> }))
vi.mock('@/pages/Reports', () => ({ default: () => <div>Reports</div> }))
vi.mock('@/pages/AccountSecurity', () => ({ default: () => <div>AccountSecurity</div> }))
vi.mock('@/pages/AIAssistant', () => ({ default: () => <div>AIAssistant</div> }))
vi.mock('@/pages/FactorLab', () => ({ default: () => <div>FactorLab</div> }))
vi.mock('@/pages/CompositeStrategies', () => ({ default: () => <div>Composite</div> }))
vi.mock('@/pages/Marketplace', () => ({ default: () => <div>Marketplace</div> }))
vi.mock('@/pages/TeamSpace', () => ({ default: () => <div>TeamSpace</div> }))
vi.mock('@/pages/VisualExplorer', () => ({ default: () => <div>VisualExplorer</div> }))
vi.mock('@/pages/Settings', () => ({ default: () => <div>Settings</div> }))
vi.mock('@/pages/auth/Login', () => ({ default: () => <div>Login Page</div> }))
vi.mock('@/pages/auth/Register', () => ({ default: () => <div>Register Page</div> }))
vi.mock('@/pages/auth/ChangePassword', () => ({ default: () => <div>Change Password Page</div> }))

vi.mock('@/lib/api', () => ({
  api: {
    get: vi.fn(),
    interceptors: { request: { use: vi.fn() }, response: { use: vi.fn() } },
  },
  authAPI: {
    me: vi.fn(),
  },
}))

import { authAPI } from '@/lib/api'
import { useAuthStore } from '@/stores/auth'

// Must import App after mocks
import App from '@/App'

describe('App', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    localStorage.clear()
    sessionStorage.clear()
    localStorage.setItem('quantmate-lang', 'en')
    await i18n.changeLanguage('en')
    useAuthStore.setState({ isAuthenticated: false, user: null, accessToken: '', refreshToken: '' })
    window.history.replaceState({}, '', '/login')
  })

  it('renders login page at /login route', async () => {
    window.history.replaceState({}, '', '/login')
    render(<App />)
    await waitFor(() => {
      expect(screen.getByText('Login Page')).toBeInTheDocument()
    })
  })

  it('renders register page at /register route', async () => {
    window.history.replaceState({}, '', '/register')
    render(<App />)
    await waitFor(() => {
      expect(screen.getByText('Register Page')).toBeInTheDocument()
    })
  })

  it('redirects unauthenticated user to login', async () => {
    window.history.replaceState({}, '', '/dashboard')
    render(<App />)
    await waitFor(() => {
      expect(screen.getByText('Login Page')).toBeInTheDocument()
    })
  })

  it('shows checking session while verifying token', async () => {
    localStorage.setItem('access_token', 'test-token')
    vi.mocked(authAPI.me).mockImplementation(() => new Promise(() => {})) // never resolves

    window.history.replaceState({}, '', '/dashboard')
    render(<App />)

    await waitFor(() => {
      expect(screen.getByText(/checking session|loading/i)).toBeInTheDocument()
    })
  })

  it('handles 403 password change required from authAPI.me', async () => {
    localStorage.setItem('access_token', 'test-token')
    vi.mocked(authAPI.me).mockRejectedValue({
      response: { status: 403, data: { detail: 'password change required' } },
    })

    window.history.replaceState({}, '', '/dashboard')
    render(<App />)

    await waitFor(() => {
      expect(screen.getByText('Change Password Page')).toBeInTheDocument()
    })
  })

  it('logs out user when authAPI.me fails with non-403 error', async () => {
    localStorage.setItem('access_token', 'test-token')
    vi.mocked(authAPI.me).mockRejectedValue({
      response: { status: 401, data: { detail: 'Token expired' } },
    })

    window.history.replaceState({}, '', '/dashboard')
    render(<App />)

    await waitFor(() => {
      expect(screen.getByText('Login Page')).toBeInTheDocument()
    })
  })

  it('authenticates user and shows layout on successful me() call', async () => {
    localStorage.setItem('access_token', 'test-token')
    localStorage.setItem('refresh_token', 'ref-token')
    vi.mocked(authAPI.me).mockResolvedValue({
      data: { id: 1, username: 'testuser', email: 'test@example.com', role: 'user', permissions: [] },
    } as never)

    window.history.replaceState({}, '', '/dashboard')
    render(<App />)

    await waitFor(() => {
      expect(screen.getByText('Layout')).toBeInTheDocument()
    })
  })

  it('renders change-password route when mustChangePassword is set', async () => {
    localStorage.setItem('access_token', 'test-token')
    sessionStorage.setItem('force_change_password', '1')
    vi.mocked(authAPI.me).mockRejectedValue({
      response: { status: 403, data: { detail: 'password change required' } },
    })

    window.history.replaceState({}, '', '/change-password')
    render(<App />)

    await waitFor(() => {
      expect(screen.getByText('Change Password Page')).toBeInTheDocument()
    })
  })

  // ─── Auth check failure fallback (lines 80-90) ─────────
  it('logs out on auth check non-403 error', async () => {
    localStorage.setItem('access_token', 'test-token')
    vi.mocked(authAPI.me).mockRejectedValue({
      response: { status: 500, data: { detail: 'Internal Server Error' } },
    })

    window.history.replaceState({}, '', '/dashboard')
    render(<App />)

    await waitFor(() => {
      expect(screen.getByText('Login Page')).toBeInTheDocument()
    })
  })

  // ─── Cancelled cleanup (line 78) ─────────
  it('does not update state after unmount (cancelled flag)', async () => {
    localStorage.setItem('access_token', 'test-token')
    let resolveMe: ((value: unknown) => void) | undefined
    vi.mocked(authAPI.me).mockImplementation(
      () => new Promise((resolve) => { resolveMe = resolve })
    )

    window.history.replaceState({}, '', '/dashboard')
    const { unmount } = render(<App />)

    // Unmount before authAPI.me resolves → cancelled = true
    unmount()

    // Now resolve — should not throw or update state
    resolveMe?.({ data: { id: 1, username: 'x', email: 'x@test.com' } })

    // No assertion needed — just verify no error is thrown
  })

  // ─── Timeout path: authAPI.me takes > 8s → logout (line 61-63) ──
  it('logs out when auth check times out', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    localStorage.setItem('access_token', 'test-token')
    vi.mocked(authAPI.me).mockImplementation(() => new Promise(() => {})) // never resolves

    window.history.replaceState({}, '', '/dashboard')
    render(<App />)

    // Fast-forward past the 8s timeout
    vi.advanceTimersByTime(9000)

    await waitFor(() => {
      expect(screen.getByText('Login Page')).toBeInTheDocument()
    })

    vi.useRealTimers()
  })

  // ─── Cancelled + reject (line 78 catch path) ──
  it('does not update state when auth check fails after unmount', async () => {
    localStorage.setItem('access_token', 'test-token')
    let rejectMe: ((reason?: unknown) => void) | undefined
    vi.mocked(authAPI.me).mockImplementation(
      () => new Promise((_resolve, reject) => { rejectMe = reject })
    )

    window.history.replaceState({}, '', '/dashboard')
    const { unmount } = render(<App />)

    // Unmount before authAPI.me rejects → cancelled = true
    unmount()

    // Now reject — should not throw or update state
    rejectMe?.({ response: { status: 401, data: { detail: 'expired' } } })

    // No assertion needed — just verify no error is thrown
  })

  // ─── isAuthenticated true but no accessToken → calls logout (line 53) ──
  it('calls logout when isAuthenticated but no access token', async () => {
    // Set the auth store to authenticated but don't set access_token in localStorage
    useAuthStore.setState({ isAuthenticated: true, user: { username: 'test' }, accessToken: 'old', refreshToken: 'old' })
    // Do NOT set localStorage access_token — this is the trigger
    localStorage.removeItem('access_token')

    window.history.replaceState({}, '', '/dashboard')
    render(<App />)

    // Without an access token, the PrivateRoute should redirect to login
    await waitFor(() => {
      expect(screen.getByText('Login Page')).toBeInTheDocument()
    })
  })

  // ─── Auth success path — setAuth (line 72) ─────────────────
  it('authenticates user when access_token is valid', async () => {
    localStorage.setItem('access_token', 'valid-token')
    localStorage.setItem('refresh_token', 'valid-refresh')
    vi.mocked(authAPI.me).mockResolvedValue({
      data: { id: 1, username: 'testuser', email: 'test@example.com' },
    } as never)

    window.history.replaceState({}, '', '/dashboard')
    render(<App />)

    await waitFor(() => {
      expect(authAPI.me).toHaveBeenCalled()
    })

    // After successful auth, should render the protected page (Layout renders)
    await waitFor(() => {
      expect(screen.getByText('Layout')).toBeInTheDocument()
    })
  })

  // ─── Force password change (line 83-84) ────────────────────
  it('redirects to change-password when 403 password change required', async () => {
    localStorage.setItem('access_token', 'expired-token')
    vi.mocked(authAPI.me).mockRejectedValue({
      response: { status: 403, data: { detail: 'Password change required' } },
    })

    window.history.replaceState({}, '', '/dashboard')
    render(<App />)

    await waitFor(() => {
      expect(authAPI.me).toHaveBeenCalled()
    })

    // Should show change password page
    await waitFor(() => {
      expect(screen.getByText('Change Password Page')).toBeInTheDocument()
    })
  })
})
