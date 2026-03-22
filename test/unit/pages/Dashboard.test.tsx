import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@test/support/utils'
import Dashboard from '@/pages/Dashboard'

// Mock chart components (depend on echarts)
vi.mock('@/components/charts/LineChart', () => ({
  default: (props: any) => <div data-testid="line-chart">{props.series?.[0]?.name}</div>,
}))
vi.mock('@/components/charts/PieChart', () => ({
  default: (props: any) => <div data-testid="pie-chart">{props.data?.length ?? 0} items</div>,
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

import { analyticsAPI, portfolioAPI, tradingAPI, alertsAPI } from '@/lib/api'

const mockDashboard = {
  portfolio_stats: { total_value: 1500000, daily_pnl: 12500, daily_pnl_pct: 0.84 },
  strategy_performance: [
    { name: 'DualMA', status: 'running', daily_return: 1.2, total_return: 15.5 },
    { name: 'RSI', status: 'stopped', daily_return: -0.3, total_return: 8.2 },
  ],
  performance_history: [{ date: '2025-01-01', value: 1.0 }, { date: '2025-01-02', value: 1.01 }],
  sector_allocation: [{ name: '白酒', value: 40 }, { name: '科技', value: 30 }],
}

describe('Dashboard Page', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    ;(analyticsAPI.dashboard as any).mockResolvedValue({ data: mockDashboard })
    ;(portfolioAPI.positions as any).mockResolvedValue({ data: { positions: [{ symbol: '600519.SH', name: '贵州茅台', direction: 'long', quantity: 100, avg_cost: 1800, market_price: 1850, market_value: 185000, pnl: 5000, pnl_pct: 2.78 }] } })
    ;(tradingAPI.listOrders as any).mockResolvedValue({ data: [] })
    ;(alertsAPI.listHistory as any).mockResolvedValue({ data: [] })
  })

  it('renders heading', () => {
    render(<Dashboard />)
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument()
  })

  it('displays KPI stat cards', async () => {
    render(<Dashboard />)
    await waitFor(() => {
      expect(screen.getByText('总资产')).toBeInTheDocument()
      expect(screen.getByText('今日盈亏')).toBeInTheDocument()
      expect(screen.getByText('活跃策略')).toBeInTheDocument()
      expect(screen.getByText('未处理告警')).toBeInTheDocument()
    })
  })

  it('shows total asset value from API', async () => {
    render(<Dashboard />)
    await waitFor(() => {
      expect(screen.getByText('¥1,500,000')).toBeInTheDocument()
    })
  })

  it('renders NAV chart and allocation pie', () => {
    render(<Dashboard />)
    expect(screen.getByText('净值走势')).toBeInTheDocument()
    expect(screen.getByText('持仓分布')).toBeInTheDocument()
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

  it('renders positions and orders sections', () => {
    render(<Dashboard />)
    expect(screen.getByText('当前持仓')).toBeInTheDocument()
    expect(screen.getByText('最近委托')).toBeInTheDocument()
    expect(screen.getByText('告警信息')).toBeInTheDocument()
  })

  it('displays position data from API', async () => {
    render(<Dashboard />)
    await waitFor(() => {
      expect(screen.getByText('600519.SH')).toBeInTheDocument()
      expect(screen.getByText('贵州茅台')).toBeInTheDocument()
    })
  })

  it('shows strategy status cards', async () => {
    render(<Dashboard />)
    await waitFor(() => {
      expect(screen.getByText('DualMA')).toBeInTheDocument()
      expect(screen.getByText('运行中')).toBeInTheDocument()
      expect(screen.getByText('已停止')).toBeInTheDocument()
    })
  })

  it('handles API error gracefully', async () => {
    ;(analyticsAPI.dashboard as any).mockRejectedValue(new Error('fail'))
    render(<Dashboard />)
    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument()
    })
  })
})


