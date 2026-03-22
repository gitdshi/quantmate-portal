import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@test/support/utils'
import AccountSecurity from '@/pages/AccountSecurity'

vi.mock('@/lib/api', () => ({
  api: {
    get: vi.fn(),
    interceptors: { request: { use: vi.fn() }, response: { use: vi.fn() } },
  },
  accountSecurityAPI: {
    listAPIKeys: vi.fn(),
    createAPIKey: vi.fn(),
    revokeAPIKey: vi.fn(),
  },
}))

import { accountSecurityAPI } from '@/lib/api'

const mockKeys = [
  { id: '1', name: '交易机器人', key_prefix: 'qm_sk_abc1', permissions: ['读取', '交易'], created_at: '2025-01-15', status: 'active' },
]

describe('AccountSecurity Page', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    ;(accountSecurityAPI.listAPIKeys as any).mockResolvedValue({ data: mockKeys })
  })

  it('renders heading', () => {
    render(<AccountSecurity />)
    expect(screen.getByText('账户安全')).toBeInTheDocument()
  })

  it('shows all 5 tabs', () => {
    render(<AccountSecurity />)
    expect(screen.getByText('个人资料')).toBeInTheDocument()
    expect(screen.getByText('安全设置')).toBeInTheDocument()
    expect(screen.getByText('API 密钥')).toBeInTheDocument()
    expect(screen.getByText('登录会话')).toBeInTheDocument()
    expect(screen.getByText('订阅计费')).toBeInTheDocument()
  })

  it('shows profile tab by default', () => {
    render(<AccountSecurity />)
    expect(screen.getByText('基本信息')).toBeInTheDocument()
  })

  it('switches to security tab', () => {
    render(<AccountSecurity />)
    fireEvent.click(screen.getByText('安全设置'))
    expect(screen.getByText('修改密码')).toBeInTheDocument()
  })

  it('switches to API keys tab', async () => {
    render(<AccountSecurity />)
    fireEvent.click(screen.getByText('API 密钥'))
    await waitFor(() => {
      expect(screen.getByText('创建密钥')).toBeInTheDocument()
    })
  })

  it('switches to sessions tab', () => {
    render(<AccountSecurity />)
    fireEvent.click(screen.getByText('登录会话'))
    expect(screen.getByText('Chrome')).toBeInTheDocument()
  })

  it('switches to billing tab', () => {
    render(<AccountSecurity />)
    fireEvent.click(screen.getByText('订阅计费'))
    expect(screen.getByText('Pro Plan')).toBeInTheDocument()
  })
})


