import { userEvent } from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import i18n from '@/i18n'
import * as authStore from '@/stores/auth'
import { render, screen, waitFor } from '@test/support/utils'
import Login from '@/pages/auth/Login'

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

    expect(screen.getByRole('button', { name: /english/i })).toBeInTheDocument()
  })
})
