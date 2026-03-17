import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '../test/utils'
import AccountSecurity from './AccountSecurity'

vi.mock('../lib/api', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    delete: vi.fn(),
    interceptors: { request: { use: vi.fn() }, response: { use: vi.fn() } },
  },
  accountSecurityAPI: {
    mfaSetup: vi.fn(),
    mfaVerify: vi.fn(),
    mfaDisable: vi.fn(),
    listApiKeys: vi.fn(),
    createApiKey: vi.fn(),
    deleteApiKey: vi.fn(),
    listSessions: vi.fn(),
    revokeSession: vi.fn(),
    revokeAllSessions: vi.fn(),
  },
}))

import { accountSecurityAPI } from '../lib/api'

const mockApiKeys = [
  { id: 1, key_id: 'ak_abc123', name: 'Bot Key', rate_limit: 100, is_active: true, created_at: '2025-01-01T00:00:00Z' },
]

const mockSessions = [
  { id: 10, device_info: 'Chrome on Windows', ip_address: '192.168.1.1', created_at: '2025-01-01T00:00:00Z', expires_at: '2025-02-01T00:00:00Z', last_active_at: '2025-01-15T12:00:00Z' },
  { id: 11, device_info: 'Firefox on Mac', ip_address: '10.0.0.2', created_at: '2025-01-02T00:00:00Z', expires_at: '2025-02-02T00:00:00Z' },
]

describe('AccountSecurity Page', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    ;(accountSecurityAPI.listApiKeys as any).mockResolvedValue({ data: mockApiKeys })
    ;(accountSecurityAPI.listSessions as any).mockResolvedValue({ data: mockSessions })
    ;(accountSecurityAPI.mfaSetup as any).mockResolvedValue({
      data: { secret: 'JBSWY3DPEHPK3PXP', qr_uri: 'otpauth://totp/QuantMate?secret=JBSWY3DPEHPK3PXP', recovery_codes: ['abc123', 'def456'] },
    })
    ;(accountSecurityAPI.mfaVerify as any).mockResolvedValue({ data: {} })
    ;(accountSecurityAPI.createApiKey as any).mockResolvedValue({ data: { id: 2, secret_key: 'sk_secret_value' } })
    ;(accountSecurityAPI.deleteApiKey as any).mockResolvedValue({ data: {} })
    ;(accountSecurityAPI.revokeSession as any).mockResolvedValue({ data: {} })
    ;(accountSecurityAPI.revokeAllSessions as any).mockResolvedValue({ data: {} })
  })

  it('renders heading and tabs', () => {
    render(<AccountSecurity />)
    expect(screen.getByText('Account Security')).toBeInTheDocument()
    expect(screen.getByText('Two-Factor Auth')).toBeInTheDocument()
    expect(screen.getByText('API Keys')).toBeInTheDocument()
    expect(screen.getByText('Sessions')).toBeInTheDocument()
  })

  // MFA tab tests
  it('shows MFA setup button initially', () => {
    render(<AccountSecurity />)
    expect(screen.getByText('Setup MFA')).toBeInTheDocument()
  })

  it('shows QR data after MFA setup', async () => {
    render(<AccountSecurity />)
    fireEvent.click(screen.getByText('Setup MFA'))
    await waitFor(() => {
      expect(screen.getByText(/otpauth:\/\/totp/)).toBeInTheDocument()
      expect(screen.getByText('abc123')).toBeInTheDocument()
      expect(screen.getByText('def456')).toBeInTheDocument()
    })
  })

  it('verifies MFA code', async () => {
    render(<AccountSecurity />)
    fireEvent.click(screen.getByText('Setup MFA'))
    await waitFor(() => {
      expect(screen.getByPlaceholderText('Enter 6-digit code')).toBeInTheDocument()
    })

    const codeInput = screen.getByPlaceholderText('Enter 6-digit code')
    fireEvent.change(codeInput, { target: { value: '123456' } })
    fireEvent.click(screen.getByText('Verify'))

    await waitFor(() => {
      expect(accountSecurityAPI.mfaVerify).toHaveBeenCalledWith('123456')
      expect(screen.getByText('MFA is enabled')).toBeInTheDocument()
    })
  })

  // API Keys tab tests
  it('displays API keys list', async () => {
    render(<AccountSecurity />)
    fireEvent.click(screen.getByText('API Keys'))
    await waitFor(() => {
      expect(screen.getByText('Bot Key')).toBeInTheDocument()
      expect(screen.getByText('ak_abc123')).toBeInTheDocument()
      expect(screen.getByText('100/min')).toBeInTheDocument()
    })
  })

  it('shows new key form', async () => {
    render(<AccountSecurity />)
    fireEvent.click(screen.getByText('API Keys'))
    await waitFor(() => {
      expect(screen.getByText('New API Key')).toBeInTheDocument()
    })
    fireEvent.click(screen.getByText('New API Key'))
    expect(screen.getByPlaceholderText('e.g. Trading Bot')).toBeInTheDocument()
  })

  it('shows new key secret after creation', async () => {
    render(<AccountSecurity />)
    fireEvent.click(screen.getByText('API Keys'))
    await waitFor(() => expect(screen.getByText('New API Key')).toBeInTheDocument())
    fireEvent.click(screen.getByText('New API Key'))

    const nameInput = screen.getByPlaceholderText('e.g. Trading Bot')
    fireEvent.change(nameInput, { target: { value: 'New Bot' } })
    fireEvent.click(screen.getByText('Create'))

    await waitFor(() => {
      expect(screen.getByText('sk_secret_value')).toBeInTheDocument()
    })
  })

  // Sessions tab tests
  it('displays active sessions', async () => {
    render(<AccountSecurity />)
    fireEvent.click(screen.getByText('Sessions'))
    await waitFor(() => {
      expect(screen.getByText('Chrome on Windows')).toBeInTheDocument()
      expect(screen.getByText('Firefox on Mac')).toBeInTheDocument()
    })
  })

  it('shows revoke all button when multiple sessions', async () => {
    render(<AccountSecurity />)
    fireEvent.click(screen.getByText('Sessions'))
    await waitFor(() => {
      expect(screen.getByText('Revoke all other sessions')).toBeInTheDocument()
    })
  })

  it('shows empty state for sessions', async () => {
    ;(accountSecurityAPI.listSessions as any).mockResolvedValue({ data: [] })
    render(<AccountSecurity />)
    fireEvent.click(screen.getByText('Sessions'))
    await waitFor(() => {
      expect(screen.getByText('No active sessions')).toBeInTheDocument()
    })
  })

  it('handles MFA setup error', async () => {
    ;(accountSecurityAPI.mfaSetup as any).mockRejectedValue(new Error('fail'))
    render(<AccountSecurity />)
    fireEvent.click(screen.getByText('Setup MFA'))
    await waitFor(() => {
      expect(screen.getByText('Failed to initiate MFA setup')).toBeInTheDocument()
    })
  })
})
