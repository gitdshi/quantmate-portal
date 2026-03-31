import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@test/support/utils'
import i18n from '@/i18n'
import AccountSecurity from '@/pages/AccountSecurity'
import { showToast } from '@/components/ui/toast-service'

vi.mock('@/components/ui/toast-service', () => ({
  showToast: vi.fn(),
}))

vi.mock('@/lib/api', () => ({
  api: {
    get: vi.fn(),
    interceptors: { request: { use: vi.fn() }, response: { use: vi.fn() } },
  },
  accountSecurityAPI: {
    listApiKeys: vi.fn(),
    createApiKey: vi.fn(),
    deleteApiKey: vi.fn(),
    listSessions: vi.fn(),
    revokeSession: vi.fn(),
  },
  authAPI: {
    changePassword: vi.fn(),
  },
}))

import { accountSecurityAPI, authAPI } from '@/lib/api'

describe('AccountSecurity Page', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    localStorage.setItem('quantmate-lang', 'en')
    await i18n.changeLanguage('en')
    vi.mocked(accountSecurityAPI.listApiKeys).mockResolvedValue({ data: [] } as never)
    vi.mocked(accountSecurityAPI.createApiKey).mockResolvedValue({ data: {} } as never)
    vi.mocked(accountSecurityAPI.deleteApiKey).mockResolvedValue({ data: {} } as never)
    vi.mocked(accountSecurityAPI.listSessions).mockResolvedValue({ data: [] } as never)
    vi.mocked(accountSecurityAPI.revokeSession).mockResolvedValue({ data: {} } as never)
    vi.mocked(authAPI.changePassword).mockResolvedValue({ data: { detail: 'Password changed successfully' } } as never)
  })

  it('renders heading', () => {
    render(<AccountSecurity />)
    expect(screen.getByText('Account Security')).toBeInTheDocument()
  })

  it('shows all 5 tabs', () => {
    render(<AccountSecurity />)
    expect(screen.getByRole('button', { name: 'Profile' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Security' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'API Keys' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Sessions' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Billing' })).toBeInTheDocument()
  })

  it('shows profile tab by default', () => {
    render(<AccountSecurity />)
    expect(screen.getByText('Display Name')).toBeInTheDocument()
  })

  it('switches to security tab', () => {
    render(<AccountSecurity />)
    fireEvent.click(screen.getByRole('button', { name: 'Security' }))
    expect(screen.getAllByText('Update Password').length).toBeGreaterThan(0)
  })

  it('switches to API keys tab', async () => {
    render(<AccountSecurity />)
    fireEvent.click(screen.getByRole('button', { name: 'API Keys' }))
    expect(await screen.findByText('Create Key')).toBeInTheDocument()
  })

  it('switches to sessions tab', async () => {
    render(<AccountSecurity />)
    fireEvent.click(screen.getByRole('button', { name: 'Sessions' }))
    expect(await screen.findByText('No active sessions')).toBeInTheDocument()
  })

  it('switches to billing tab', () => {
    render(<AccountSecurity />)
    fireEvent.click(screen.getByRole('button', { name: 'Billing' }))
    expect(screen.getAllByText('Pro Plan').length).toBeGreaterThan(0)
  })

  it('submits password change from the security tab', () => {
    render(<AccountSecurity />)

    fireEvent.click(screen.getByRole('button', { name: 'Security' }))
    fireEvent.change(screen.getByLabelText('Current Password'), { target: { value: 'old-pass-123' } })
    fireEvent.change(screen.getByLabelText('New Password'), { target: { value: 'new-pass-123' } })
    fireEvent.change(screen.getByLabelText('Confirm New Password'), {
      target: { value: 'new-pass-123' },
    })
    fireEvent.click(screen.getAllByRole('button', { name: 'Update Password' })[0])

    expect(authAPI.changePassword).toHaveBeenCalledWith('old-pass-123', 'new-pass-123')
  })

  it('prevents password change when confirmation does not match', () => {
    render(<AccountSecurity />)

    fireEvent.click(screen.getByRole('button', { name: 'Security' }))
    fireEvent.change(screen.getByLabelText('Current Password'), { target: { value: 'old-pass-123' } })
    fireEvent.change(screen.getByLabelText('New Password'), { target: { value: 'new-pass-123' } })
    fireEvent.change(screen.getByLabelText('Confirm New Password'), {
      target: { value: 'different-pass-123' },
    })
    fireEvent.click(screen.getAllByRole('button', { name: 'Update Password' })[0])

    expect(authAPI.changePassword).not.toHaveBeenCalled()
    expect(showToast).toHaveBeenCalledWith('New password and confirmation do not match', 'error')
  })
})
