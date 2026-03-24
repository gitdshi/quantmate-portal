import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@test/support/utils'
import i18n from '@/i18n'
import Dashboard from '@/pages/Dashboard'

vi.mock('@/components/charts/LineChart', () => ({
  default: (props: { series?: Array<{ name?: string }> }) => (
    <div data-testid="line-chart">{props.series?.[0]?.name}</div>
  ),
}))

vi.mock('@/components/charts/PieChart', () => ({
  default: (props: { data?: unknown[] }) => (
    <div data-testid="pie-chart">{props.data?.length ?? 0} items</div>
  ),
}))

vi.mock('@/lib/api', () => ({
  api: {
    get: vi.fn(),
    interceptors: { request: { use: vi.fn() }, response: { use: vi.fn() } },
  },
  analyticsAPI: { dashboard: vi.fn() },
  portfolioAPI: { positions: vi.fn() },
  tradingAPI: { listOrders: vi.fn() },
  alertsAPI: { listHistory: vi.fn() },
}))

import { alertsAPI, analyticsAPI, portfolioAPI, tradingAPI } from '@/lib/api'

const mockDashboard = {
  portfolio_stats: { total_value: 1500000, daily_pnl: 12500, daily_pnl_pct: 0.84 },
  strategy_performance: [
    { name: 'DualMA', status: 'running', daily_return: 1.2, total_return: 15.5 },
    { name: 'RSI', status: 'stopped', daily_return: -0.3, total_return: 8.2 },
  ],
  performance_history: [
    { date: '2025-01-01', value: 1.0 },
    { date: '2025-01-02', value: 1.01 },
  ],
  sector_allocation: [
    { name: 'Liquor', value: 40 },
    { name: 'Tech', value: 30 },
  ],
}

describe('Dashboard Page', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    localStorage.setItem('quantmate-lang', 'en')
    await i18n.changeLanguage('en')

    vi.mocked(analyticsAPI.dashboard).mockResolvedValue({ data: mockDashboard } as never)
    vi.mocked(portfolioAPI.positions).mockResolvedValue({
      data: {
        positions: [
          {
            symbol: '600519.SH',
            name: 'Kweichow Moutai',
            direction: 'long',
            quantity: 100,
            avg_cost: 1800,
            market_price: 1850,
            market_value: 185000,
            pnl: 5000,
            pnl_pct: 2.78,
          },
        ],
      },
    } as never)
    vi.mocked(tradingAPI.listOrders).mockResolvedValue({ data: [] } as never)
    vi.mocked(alertsAPI.listHistory).mockResolvedValue({ data: [] } as never)
  })

  it('renders heading', () => {
    render(<Dashboard />)
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument()
  })

  it('displays KPI stat cards', async () => {
    render(<Dashboard />)
    await waitFor(() => {
      expect(screen.getByText('Total Assets')).toBeInTheDocument()
      expect(screen.getByText('Daily P&L')).toBeInTheDocument()
      expect(screen.getByText('Active Strategies')).toBeInTheDocument()
      expect(screen.getByText('Unread Alerts')).toBeInTheDocument()
    })
  })

  it('shows total asset value from API', async () => {
    render(<Dashboard />)
    await waitFor(() => {
      expect(screen.getByText('¥1,500,000')).toBeInTheDocument()
    })
  })

  it('renders NAV chart and allocation pie', async () => {
    render(<Dashboard />)
    await waitFor(() => {
      expect(screen.getByText('NAV Trend')).toBeInTheDocument()
      expect(screen.getByText('Position Allocation')).toBeInTheDocument()
    })
    expect(screen.getByTestId('line-chart')).toBeInTheDocument()
    expect(screen.getByTestId('pie-chart')).toBeInTheDocument()
  })

  it('renders NAV period buttons', () => {
    render(<Dashboard />)
    expect(screen.getByText('1w')).toBeInTheDocument()
    expect(screen.getByText('1m')).toBeInTheDocument()
    expect(screen.getByText('3m')).toBeInTheDocument()
    expect(screen.getByText('ytd')).toBeInTheDocument()
  })

  it('renders positions and orders sections', async () => {
    render(<Dashboard />)
    await waitFor(() => {
      expect(screen.getByText('Current Positions')).toBeInTheDocument()
      expect(screen.getByText('Recent Orders')).toBeInTheDocument()
      expect(screen.getByText('Alert Feed')).toBeInTheDocument()
    })
  })

  it('displays position data from API', async () => {
    render(<Dashboard />)
    await waitFor(() => {
      expect(screen.getByText('600519.SH')).toBeInTheDocument()
      expect(screen.getByText('Kweichow Moutai')).toBeInTheDocument()
    })
  })

  it('shows strategy status cards', async () => {
    render(<Dashboard />)
    await waitFor(() => {
      expect(screen.getByText('DualMA')).toBeInTheDocument()
      expect(screen.getByText('Running')).toBeInTheDocument()
      expect(screen.getByText('Stopped')).toBeInTheDocument()
    })
  })

  it('handles API error gracefully', async () => {
    vi.mocked(analyticsAPI.dashboard).mockRejectedValue(new Error('fail') as never)
    render(<Dashboard />)
    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument()
    })
  })
})
