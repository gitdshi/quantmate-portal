import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@test/support/utils'
import i18n from '@/i18n'
import Monitoring from '@/pages/Monitoring'

vi.mock('@/components/ui/FilterBar', () => ({
  default: () => <div data-testid="filter-bar" />,
}))

vi.mock('@/components/ui/toast-service', () => ({
  showToast: vi.fn(),
}))

vi.mock('@/lib/api', () => ({
  api: {
    get: vi.fn(),
    interceptors: { request: { use: vi.fn() }, response: { use: vi.fn() } },
  },
  alertsAPI: {
    listHistory: vi.fn(),
    listRules: vi.fn(),
    listChannels: vi.fn(),
    acknowledgeAlert: vi.fn(),
    createRule: vi.fn(),
    updateRule: vi.fn(),
  },
}))

import { alertsAPI } from '@/lib/api'

const liveAlerts = [
  {
    id: '1',
    title: 'Strategy Halted',
    message: 'DualMA stopped unexpectedly',
    level: 'critical',
    source: 'strategy-engine',
    created_at: '2025-01-01T10:00:00Z',
    acknowledged: false,
  },
]

const rules = [
  {
    id: '1',
    name: 'Max Drawdown Alert',
    type: 'Risk',
    condition: 'drawdown > 5%',
    level: 'warning',
    enabled: true,
    channels: ['email'],
    last_triggered: '2025-01-01 10:00',
  },
]

const channels = [
  { id: 1, channel_type: 'email', config: { to: 'daniel@example.com' } },
]

describe('Monitoring Page', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    localStorage.setItem('quantmate-lang', 'en')
    await i18n.changeLanguage('en')
    vi.mocked(alertsAPI.listHistory).mockResolvedValue({ data: liveAlerts } as never)
    vi.mocked(alertsAPI.listRules).mockResolvedValue({ data: rules } as never)
    vi.mocked(alertsAPI.listChannels).mockResolvedValue({ data: channels } as never)
    vi.mocked(alertsAPI.acknowledgeAlert).mockResolvedValue({ data: {} } as never)
    vi.mocked(alertsAPI.createRule).mockResolvedValue({ data: {} } as never)
    vi.mocked(alertsAPI.updateRule).mockResolvedValue({ data: {} } as never)
  })

  it('renders heading', () => {
    render(<Monitoring />)
    expect(screen.getByText('Monitoring & Alerts')).toBeInTheDocument()
  })

  it('shows all 4 tabs', () => {
    render(<Monitoring />)
    expect(screen.getByRole('button', { name: 'Live Alerts' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Rules' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'History' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Channels' })).toBeInTheDocument()
  })

  it('shows new rule button', () => {
    render(<Monitoring />)
    expect(screen.getByText('New Rule')).toBeInTheDocument()
  })

  it('shows stat cards on live tab', async () => {
    render(<Monitoring />)
    await waitFor(() => {
      expect(screen.getByText('Active Alerts')).toBeInTheDocument()
      expect(screen.getByText('Critical')).toBeInTheDocument()
      expect(screen.getByText('Triggered Today')).toBeInTheDocument()
      expect(screen.getByText('Active Rules')).toBeInTheDocument()
    })
  })

  it('shows live alert cards', async () => {
    render(<Monitoring />)
    expect(await screen.findByText('Strategy Halted')).toBeInTheDocument()
    expect(screen.getByText('DualMA stopped unexpectedly')).toBeInTheDocument()
  })

  it('switches to rules tab', async () => {
    render(<Monitoring />)
    fireEvent.click(screen.getByRole('button', { name: 'Rules' }))
    expect(await screen.findByText('Rule Name')).toBeInTheDocument()
    await waitFor(() => {
      expect(screen.getByText('drawdown > 5%')).toBeInTheDocument()
    })
  })

  it('switches to channels tab', async () => {
    render(<Monitoring />)
    fireEvent.click(screen.getByRole('button', { name: 'Channels' }))
    expect(await screen.findByText('email')).toBeInTheDocument()
    expect(screen.getByText(/daniel@example.com/)).toBeInTheDocument()
  })
})
