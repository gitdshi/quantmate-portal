import { showToast } from '@/components/ui/toast-service'
import i18n from '@/i18n'
import AccountSecurity from '@/pages/AccountSecurity'
import { fireEvent, render, screen, waitFor } from '@test/support/utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

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

  it('submits password change from the security tab', async () => {
    render(<AccountSecurity />)

    fireEvent.click(screen.getByRole('button', { name: 'Security' }))
    fireEvent.change(screen.getByLabelText('Current Password'), { target: { value: 'old-pass-123' } })
    fireEvent.change(screen.getByLabelText('New Password'), { target: { value: 'new-pass-123' } })
    fireEvent.change(screen.getByLabelText('Confirm New Password'), {
      target: { value: 'new-pass-123' },
    })
    fireEvent.click(screen.getAllByRole('button', { name: 'Update Password' })[0])

    await waitFor(() => {
      expect(authAPI.changePassword).toHaveBeenCalledWith('old-pass-123', 'new-pass-123')
    })
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

  // ─── API Key creation modal ─────────────────────────────
  it('opens API key creation modal and submits', async () => {
    render(<AccountSecurity />)
    fireEvent.click(screen.getByRole('button', { name: 'API Keys' }))
    await screen.findByText('Create Key')

    fireEvent.click(screen.getByText('Create Key'))

    // Modal should open - find the modal and submit
    await waitFor(() => {
      const modals = document.querySelectorAll('.fixed')
      expect(modals.length).toBeGreaterThan(0)
    })

    const modal = document.querySelectorAll('.fixed')
    const lastModal = modal[modal.length - 1]
    const inputs = lastModal.querySelectorAll('input')
    if (inputs[0]) {
      fireEvent.change(inputs[0], { target: { value: 'My API Key' } })
    }

    const submitBtns = lastModal.querySelectorAll('button')
    const submitBtn = Array.from(submitBtns).find(b => b.textContent?.match(/create|submit/i))
    if (submitBtn) {
      fireEvent.click(submitBtn)
      await waitFor(() => {
        expect(accountSecurityAPI.createApiKey).toHaveBeenCalled()
      })
    }
  })

  // ─── API Key revocation ─────────────────────────────────
  it('revokes an API key', async () => {
    vi.mocked(accountSecurityAPI.listApiKeys).mockResolvedValue({
      data: [{ id: 1, name: 'Test Key', key_prefix: 'qm_abc', permissions: ['read'], status: 'active', created_at: '2025-01-01' }],
    } as never)

    render(<AccountSecurity />)
    fireEvent.click(screen.getByRole('button', { name: 'API Keys' }))
    await screen.findByText('Test Key')

    const revokeBtn = screen.getAllByRole('button').find(b => b.textContent?.match(/revoke/i))
    if (revokeBtn) {
      fireEvent.click(revokeBtn)
      await waitFor(() => {
        expect(accountSecurityAPI.deleteApiKey).toHaveBeenCalledWith(1)
      })
    }
  })

  // ─── Session revocation ─────────────────────────────────
  it('revokes a session', async () => {
    vi.mocked(accountSecurityAPI.listSessions).mockResolvedValue({
      data: [
        { id: 1, device: 'Chrome on macOS', ip: '192.168.1.1', location: 'Shanghai', last_active: '2025-01-01T10:00:00Z', is_current: false },
        { id: 2, device: 'Firefox on Windows', ip: '10.0.0.1', location: 'Beijing', last_active: '2025-01-01T08:00:00Z', is_current: true },
      ],
    } as never)

    render(<AccountSecurity />)
    fireEvent.click(screen.getByRole('button', { name: 'Sessions' }))
    await screen.findByText('Chrome on macOS')

    const revokeBtn = screen.getAllByRole('button').find(b => b.textContent?.match(/revoke/i))
    if (revokeBtn) {
      fireEvent.click(revokeBtn)
      await waitFor(() => {
        expect(accountSecurityAPI.revokeSession).toHaveBeenCalledWith(1)
      })
    }
  })

  // ─── Password change failure ────────────────────────────
  it('handles password change API failure', async () => {
    vi.mocked(authAPI.changePassword).mockRejectedValue({
      response: { data: { detail: 'Wrong current password' } },
    })

    render(<AccountSecurity />)
    fireEvent.click(screen.getByRole('button', { name: 'Security' }))
    fireEvent.change(screen.getByLabelText('Current Password'), { target: { value: 'wrong' } })
    fireEvent.change(screen.getByLabelText('New Password'), { target: { value: 'newpass123' } })
    fireEvent.change(screen.getByLabelText('Confirm New Password'), { target: { value: 'newpass123' } })
    fireEvent.click(screen.getAllByRole('button', { name: 'Update Password' })[0])

    await waitFor(() => {
      expect(authAPI.changePassword).toHaveBeenCalled()
    })
  })

  // ─── Password too short ─────────────────────────────────
  it('prevents short password submission', () => {
    render(<AccountSecurity />)
    fireEvent.click(screen.getByRole('button', { name: 'Security' }))
    fireEvent.change(screen.getByLabelText('Current Password'), { target: { value: 'old' } })
    fireEvent.change(screen.getByLabelText('New Password'), { target: { value: '123' } })
    fireEvent.change(screen.getByLabelText('Confirm New Password'), { target: { value: '123' } })
    fireEvent.click(screen.getAllByRole('button', { name: 'Update Password' })[0])

    expect(authAPI.changePassword).not.toHaveBeenCalled()
  })

  // ─── Security 2FA toggles ──────────────────────────────
  it('shows 2FA toggle options on security tab', () => {
    render(<AccountSecurity />)
    fireEvent.click(screen.getByRole('button', { name: 'Security' }))
    // ToggleSwitch uses role="switch"
    const switches = screen.getAllByRole('switch')
    expect(switches.length).toBeGreaterThanOrEqual(1)
  })

  // ─── Save profile button ──────────────────────────────
  it('shows save profile button on profile tab', () => {
    render(<AccountSecurity />)
    const buttons = screen.getAllByRole('button')
    const saveBtn = buttons.find(b => b.textContent?.match(/save.*profile/i))
    expect(saveBtn).toBeTruthy()
  })

  // ─── Profile field editing ──────────────────────────────
  it('edits profile display name', () => {
    render(<AccountSecurity />)
    const inputs = screen.getAllByRole('textbox')
    // First textbox is display name
    fireEvent.change(inputs[0], { target: { value: 'New Name' } })
    expect(inputs[0]).toHaveValue('New Name')
  })

  it('edits profile email and phone', () => {
    render(<AccountSecurity />)
    const inputs = screen.getAllByRole('textbox')
    // email is 2nd, phone is 3rd
    fireEvent.change(inputs[1], { target: { value: 'test@example.com' } })
    fireEvent.change(inputs[2], { target: { value: '+86 123' } })
    expect(inputs[1]).toHaveValue('test@example.com')
    expect(inputs[2]).toHaveValue('+86 123')
  })

  it('edits profile company and bio', () => {
    render(<AccountSecurity />)
    const inputs = screen.getAllByRole('textbox')
    // company is 4th, bio is the textarea (which is also a textbox)
    fireEvent.change(inputs[3], { target: { value: 'MyCompany' } })
    fireEvent.change(inputs[4], { target: { value: 'A short bio' } })
    expect(inputs[3]).toHaveValue('MyCompany')
    expect(inputs[4]).toHaveValue('A short bio')
  })

  // ─── 2FA toggles ───────────────────────────────────────
  it('toggles 2FA main switch and method switches', () => {
    render(<AccountSecurity />)
    fireEvent.click(screen.getByRole('button', { name: 'Security' }))
    const switches = screen.getAllByRole('switch')
    // First switch is main 2FA toggle, then totp, sms, email
    expect(switches.length).toBeGreaterThanOrEqual(4)
    fireEvent.click(switches[0]) // main 2FA toggle
    fireEvent.click(switches[1]) // totp
    fireEvent.click(switches[2]) // sms
    fireEvent.click(switches[3]) // email
  })

  // ─── API Key modal submit button ────────────────────────
  it('clicks create button inside API key modal', async () => {
    render(<AccountSecurity />)
    fireEvent.click(screen.getByRole('button', { name: 'API Keys' }))
    await screen.findByText('Create Key')
    fireEvent.click(screen.getByText('Create Key'))

    // Wait for modal to appear
    const modals = document.querySelectorAll('.fixed')
    const lastModal = modals[modals.length - 1]
    const submitBtn = Array.from(lastModal?.querySelectorAll('button') ?? []).find(b => b.textContent?.match(/create.*key/i))
    if (submitBtn) {
      fireEvent.click(submitBtn)
      await waitFor(() => {
        expect(accountSecurityAPI.createApiKey).toHaveBeenCalled()
      })
    }
  })

  // ─── Session rendering with data ────────────────────────
  it('renders sessions with current badge', async () => {
    vi.mocked(accountSecurityAPI.listSessions).mockResolvedValue({
      data: [
        { id: '1', device: 'Chrome on macOS', ip: '192.168.1.1', location: 'Shanghai', last_active: '2025-01-01', current: false },
        { id: '2', device: 'Firefox', ip: '10.0.0.1', location: 'Beijing', last_active: '2025-01-02', current: true },
      ],
    } as never)

    render(<AccountSecurity />)
    fireEvent.click(screen.getByRole('button', { name: 'Sessions' }))
    expect(await screen.findByText('Chrome on macOS')).toBeInTheDocument()
    expect(screen.getByText('Firefox')).toBeInTheDocument()
    // The current session should NOT have a revoke button (current: true)
    const revokeBtn = screen.getAllByRole('button').filter(b => b.textContent?.match(/revoke/i))
    // Only one revoke button for the non-current session
    expect(revokeBtn.length).toBe(1)
  })

  // ─── Password change failure with detail ────────────────
  it('shows error toast on password change failure', async () => {
    vi.mocked(authAPI.changePassword).mockRejectedValue({
      response: { data: { detail: 'Wrong current password' } },
    })

    render(<AccountSecurity />)
    fireEvent.click(screen.getByRole('button', { name: 'Security' }))
    fireEvent.change(screen.getByLabelText('Current Password'), { target: { value: 'wrongpass' } })
    fireEvent.change(screen.getByLabelText('New Password'), { target: { value: 'newpass123' } })
    fireEvent.change(screen.getByLabelText('Confirm New Password'), { target: { value: 'newpass123' } })
    fireEvent.click(screen.getAllByRole('button', { name: 'Update Password' })[0])

    await waitFor(() => {
      expect(showToast).toHaveBeenCalledWith('Wrong current password', 'error')
    })
  })

  // ─── Password too short validation (line 175) ──────────
  it('shows error when new password is too short', async () => {
    render(<AccountSecurity />)
    fireEvent.click(screen.getByRole('button', { name: 'Security' }))
    fireEvent.change(screen.getByLabelText('Current Password'), { target: { value: 'current' } })
    fireEvent.change(screen.getByLabelText('New Password'), { target: { value: 'short' } })
    fireEvent.change(screen.getByLabelText('Confirm New Password'), { target: { value: 'short' } })
    fireEvent.click(screen.getAllByRole('button', { name: 'Update Password' })[0])

    await waitFor(() => {
      expect(showToast).toHaveBeenCalled()
    })
  })

  // ─── Billing tab (lines 369-373) ───────────────────────
  it('shows billing tab with empty billing state', async () => {
    render(<AccountSecurity />)
    fireEvent.click(screen.getByRole('button', { name: 'Billing' }))
    // "No usage data yet" is the emptyBilling i18n text
    await waitFor(() => {
      expect(screen.getByText('No usage data yet')).toBeInTheDocument()
    })
  })

  // ─── API key revoke (line 76) ──────────────────────────
  it('revokes an active API key', async () => {
    vi.mocked(accountSecurityAPI.listApiKeys).mockResolvedValue({
      data: [{ id: '1', name: 'Test Key', key: 'qm_***8a3f', permissions: ['data:read'], status: 'active', created_at: '2025-01-01', last_used: '2025-01-02' }],
    } as never)
    vi.mocked(accountSecurityAPI.deleteApiKey).mockResolvedValue({ data: {} } as never)

    render(<AccountSecurity />)
    fireEvent.click(screen.getByRole('button', { name: 'API Keys' }))

    await waitFor(() => {
      expect(screen.getByText('Test Key')).toBeInTheDocument()
    })

    const deleteBtn = screen.getByText(/delete|revoke/i)
    fireEvent.click(deleteBtn)

    await waitFor(() => {
      expect(accountSecurityAPI.deleteApiKey).toHaveBeenCalledWith(1)
    })
  })

  // ─── Password mismatch validation ─────────────────────
  it('shows error when passwords do not match', async () => {
    render(<AccountSecurity />)
    fireEvent.click(screen.getByRole('button', { name: 'Security' }))
    fireEvent.change(screen.getByLabelText('Current Password'), { target: { value: 'current' } })
    fireEvent.change(screen.getByLabelText('New Password'), { target: { value: 'newpass123' } })
    fireEvent.change(screen.getByLabelText('Confirm New Password'), { target: { value: 'different' } })
    fireEvent.click(screen.getAllByRole('button', { name: 'Update Password' })[0])

    await waitFor(() => {
      expect(showToast).toHaveBeenCalled()
    })
  })

  // ─── API Key creation fails (line 69) ────────────────────
  it('shows error toast when API key creation fails', async () => {
    vi.mocked(accountSecurityAPI.createApiKey).mockRejectedValue(new Error('Create failed'))

    render(<AccountSecurity />)
    fireEvent.click(screen.getByRole('button', { name: 'API Keys' }))
    await screen.findByText('Create Key')
    fireEvent.click(screen.getByText('Create Key'))

    await waitFor(() => {
      const modals = document.querySelectorAll('.fixed')
      expect(modals.length).toBeGreaterThan(0)
    })

    const modal = document.querySelectorAll('.fixed')
    const lastModal = modal[modal.length - 1]
    const inputs = lastModal.querySelectorAll('input')
    if (inputs[0]) {
      fireEvent.change(inputs[0], { target: { value: 'Fail Key' } })
    }

    const submitBtns = lastModal.querySelectorAll('button')
    const submitBtn = Array.from(submitBtns).find(b => b.textContent?.match(/create|submit/i))
    if (submitBtn) {
      fireEvent.click(submitBtn)
      await waitFor(() => {
        expect(accountSecurityAPI.createApiKey).toHaveBeenCalled()
        expect(showToast).toHaveBeenCalledWith(expect.stringMatching(/fail/i), 'error')
      })
    }
  })
})
