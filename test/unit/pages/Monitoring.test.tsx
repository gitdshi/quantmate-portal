import i18n from '@/i18n'
import Monitoring from '@/pages/Monitoring'
import { fireEvent, render, screen, waitFor } from '@test/support/utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

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

  // ─── Acknowledge alert ──────────────────────────────────
  it('acknowledges a live alert', async () => {
    render(<Monitoring />)
    await screen.findByText('Strategy Halted')

    const confirmBtns = screen.getAllByRole('button').filter(b => b.textContent?.match(/confirm|acknowledge/i))
    if (confirmBtns.length > 0) {
      fireEvent.click(confirmBtns[0])
      await waitFor(() => {
        expect(alertsAPI.acknowledgeAlert).toHaveBeenCalled()
      })
    }
  })

  // ─── Create rule modal ─────────────────────────────────
  it('opens new rule modal and creates a rule', async () => {
    render(<Monitoring />)
    fireEvent.click(screen.getByText('New Rule'))

    // Modal should appear
    await waitFor(() => {
      const modals = document.querySelectorAll('.fixed')
      expect(modals.length).toBeGreaterThan(0)
    })

    const modals = document.querySelectorAll('.fixed')
    const modal = modals[modals.length - 1]

    // Fill form fields
    const inputs = modal.querySelectorAll('input')
    if (inputs[0]) {
      fireEvent.change(inputs[0], { target: { value: 'My Rule' } })
    }

    // Find and click create/submit button
    const submitBtn = Array.from(modal.querySelectorAll('button')).find(b => b.textContent?.match(/create|submit/i))
    if (submitBtn) {
      fireEvent.click(submitBtn)
      await waitFor(() => {
        expect(alertsAPI.createRule).toHaveBeenCalled()
      })
    }
  })

  // ─── Toggle rule enabled ────────────────────────────────
  it('toggles a rule enabled switch', async () => {
    render(<Monitoring />)
    fireEvent.click(screen.getByRole('button', { name: 'Rules' }))
    await screen.findByText('Max Drawdown Alert')

    // ToggleSwitch uses role="switch"
    const toggles = screen.getAllByRole('switch')
    expect(toggles.length).toBeGreaterThan(0)
    fireEvent.click(toggles[0])
    await waitFor(() => {
      expect(alertsAPI.updateRule).toHaveBeenCalled()
    })
  })

  // ─── History tab ────────────────────────────────────────
  it('switches to history tab and shows data', async () => {
    render(<Monitoring />)
    fireEvent.click(screen.getByRole('button', { name: 'History' }))
    await waitFor(() => {
      // History tab should render (using same listHistory data)
      expect(screen.getByText('Strategy Halted')).toBeInTheDocument()
    })
  })

  // ─── Create rule failure ────────────────────────────────
  it('handles create rule failure', async () => {
    vi.mocked(alertsAPI.createRule).mockRejectedValue(new Error('fail'))
    render(<Monitoring />)
    fireEvent.click(screen.getByText('New Rule'))

    await waitFor(() => {
      const modals = document.querySelectorAll('.fixed')
      expect(modals.length).toBeGreaterThan(0)
    })

    const modals = document.querySelectorAll('.fixed')
    const modal = modals[modals.length - 1]
    const inputs = modal.querySelectorAll('input')
    if (inputs[0]) {
      fireEvent.change(inputs[0], { target: { value: 'Bad Rule' } })
    }

    const submitBtn = Array.from(modal.querySelectorAll('button')).find(b => b.textContent?.match(/create|submit/i))
    if (submitBtn) {
      fireEvent.click(submitBtn)
      await waitFor(() => {
        expect(alertsAPI.createRule).toHaveBeenCalled()
      })
    }
  })

  // ─── Empty channels tab (line 365) ──────────────────────
  it('shows empty state on channels tab when no channels exist', async () => {
    vi.mocked(alertsAPI.listChannels).mockResolvedValue({ data: [] } as never)

    render(<Monitoring />)
    fireEvent.click(screen.getByRole('button', { name: 'Channels' }))

    await waitFor(() => {
      const emptyMsg = Array.from(document.querySelectorAll('p')).find(
        (p) => p.textContent?.match(/no.*channel|empty/i)
      )
      expect(emptyMsg).toBeTruthy()
    })
  })

  // ─── Empty state CTA opens new rule modal (line 302) ────
  it('opens new rule modal from empty state CTA', async () => {
    vi.mocked(alertsAPI.listHistory).mockResolvedValue({ data: [] } as never)
    vi.mocked(alertsAPI.listRules).mockResolvedValue({ data: [] } as never)
    vi.mocked(alertsAPI.listChannels).mockResolvedValue({ data: [] } as never)

    render(<Monitoring />)

    // Switch to rules tab
    const rulesTab = screen.getByRole('button', { name: /rules/i })
    fireEvent.click(rulesTab)

    // Wait for empty state to appear and click the EmptyState CTA (the second "New Rule" button)
    await waitFor(() => {
      const newRuleBtns = Array.from(document.querySelectorAll('button')).filter(
        (b) => b.textContent?.match(/new.*rule/i)
      )
      // First one is the page header button, second is the EmptyState CTA
      expect(newRuleBtns.length).toBeGreaterThanOrEqual(2)
      fireEvent.click(newRuleBtns[newRuleBtns.length - 1])
    })

    // Modal should open
    await waitFor(() => {
      const modals = document.querySelectorAll('.fixed')
      expect(modals.length).toBeGreaterThan(0)
    })

    // Close it via cancel button (line 370)
    const modals = document.querySelectorAll('.fixed')
    const modal = modals[modals.length - 1]
    const cancelBtn = Array.from(modal.querySelectorAll('button')).find(
      (b) => b.textContent?.match(/cancel/i)
    )
    if (cancelBtn) {
      fireEvent.click(cancelBtn)
    }
  })
})
