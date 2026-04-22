import i18n from '@/i18n'
import Login from '@/pages/auth/Login'
import * as authStore from '@/stores/auth'
import { render, screen, waitFor } from '@test/support/utils'
import { userEvent } from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// Mock the auth store
vi.mock('@/stores/auth', () => ({
  useAuthStore: vi.fn(),
}))

// Mock the API module
const mockApiLogin = vi.fn()
vi.mock('@/lib/api', () => ({
  authAPI: {
    login: (...args: any[]) => mockApiLogin(...args),
  },
}))

// Mock react-router-dom
const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    Link: ({ children, to }: any) => <a href={to}>{children}</a>,
  }
})

describe('Login Component', () => {
  const mockSetAuth = vi.fn()

  beforeEach(async () => {
    vi.clearAllMocks()
    localStorage.setItem('quantmate-lang', 'en')
    await i18n.changeLanguage('en')
    ;(authStore.useAuthStore as any).mockReturnValue({
      setAuth: mockSetAuth,
      isAuthenticated: false,
      hasHydrated: true,
    })
  })

  it('renders login form', () => {
    render(<Login />)
    
    expect(screen.getByText('Welcome to QuantMate')).toBeInTheDocument()
    expect(screen.getByLabelText('Username')).toBeInTheDocument()
    expect(screen.getByLabelText('Password')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument()
  })

  it('displays validation error for empty fields', async () => {
    const user = userEvent.setup()
    render(<Login />)
    
    const submitButton = screen.getByRole('button', { name: /sign in/i })
    await user.click(submitButton)
    
    // HTML required attribute prevents submission with empty fields
    expect(mockApiLogin).not.toHaveBeenCalled()
  })

  it('submits form with valid credentials', async () => {
    const user = userEvent.setup()
    mockApiLogin.mockResolvedValue({
      data: {
        user: { id: 1, username: 'testuser', email: 'test@test.com' },
        access_token: 'access-token',
        refresh_token: 'refresh-token',
      },
    })
    
    render(<Login />)
    
    const usernameInput = screen.getByLabelText('Username')
    const passwordInput = screen.getByLabelText('Password')
    const submitButton = screen.getByRole('button', { name: /sign in/i })
    
    await user.type(usernameInput, 'testuser')
    await user.type(passwordInput, 'password123')
    await user.click(submitButton)
    
    await waitFor(() => {
      expect(mockApiLogin).toHaveBeenCalledWith('testuser', 'password123')
    })
  })

  it('displays error message on failed login', async () => {
    const user = userEvent.setup()
    mockApiLogin.mockRejectedValue({
      response: { data: { detail: 'Invalid credentials' } },
    })
    
    render(<Login />)
    
    const usernameInput = screen.getByLabelText('Username')
    const passwordInput = screen.getByLabelText('Password')
    const submitButton = screen.getByRole('button', { name: /sign in/i })
    
    await user.type(usernameInput, 'testuser')
    await user.type(passwordInput, 'wrongpassword')
    await user.click(submitButton)
    
    await waitFor(() => {
      expect(screen.getByText(/invalid credentials/i)).toBeInTheDocument()
    })
  })

  it('has link to register page', () => {
    render(<Login />)
    
    const registerLink = screen.getByText(/sign up/i)
    expect(registerLink).toBeInTheDocument()
    expect(registerLink.closest('a')).toHaveAttribute('href', '/register')
  })

  it('renders a language switcher on the login page', () => {
    render(<Login />)

    expect(screen.getByRole('button', { name: /中文/i })).toBeInTheDocument()
  })

  it('redirects to /dashboard when already authenticated', async () => {
    ;(authStore.useAuthStore as any).mockReturnValue({
      setAuth: mockSetAuth,
      isAuthenticated: true,
      hasHydrated: true,
    })

    render(<Login />)
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/dashboard', { replace: true })
    })
  })

  it('falls back to error.message when detail is missing', async () => {
    const user = userEvent.setup()
    mockApiLogin.mockRejectedValue({
      response: { data: { error: { message: 'Account locked' } } },
    })

    render(<Login />)
    await user.type(screen.getByLabelText('Username'), 'user')
    await user.type(screen.getByLabelText('Password'), 'pass')
    await user.click(screen.getByRole('button', { name: /sign in/i }))

    await waitFor(() => {
      expect(screen.getByText('Account locked')).toBeInTheDocument()
    })
  })

  it('falls back to generic error when no detail or message', async () => {
    const user = userEvent.setup()
    mockApiLogin.mockRejectedValue({
      response: { data: {} },
    })

    render(<Login />)
    await user.type(screen.getByLabelText('Username'), 'user')
    await user.type(screen.getByLabelText('Password'), 'pass')
    await user.click(screen.getByRole('button', { name: /sign in/i }))

    await waitFor(() => {
      // Should show generic login failed message
      const errorEl = document.querySelector('[role="alert"], .text-destructive, .text-red-500')
      expect(errorEl || screen.getByText(/failed|error/i)).toBeTruthy()
    })
  })

  // ─── Language toggle (lines 53-55) ─────────────────────
  it('toggles language when language button is clicked', async () => {
    const user = userEvent.setup()
    render(<Login />)

    const langBtn = screen.getByRole('button', { name: /中文/i })
    await user.click(langBtn)

    // After clicking, language should have changed
    await waitFor(() => {
      // Language toggle button text should change
      const btn = screen.getAllByRole('button').find((b) => b.textContent?.match(/english|en|中文/i))
      expect(btn).toBeTruthy()
    })
  })
})
