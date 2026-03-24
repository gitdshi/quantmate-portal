import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@test/support/utils'
import i18n from '@/i18n'
import PaperTrading from '@/pages/PaperTrading'

vi.mock('@/components/charts/LineChart', () => ({
  default: () => <div data-testid="line-chart" />,
}))

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
  paperTradingAPI: {
    listDeployments: vi.fn(),
    deployStrategy: vi.fn(),
    stopDeployment: vi.fn(),
    listPaperOrders: vi.fn(),
    getPaperPositions: vi.fn(),
    getPaperPerformance: vi.fn(),
  },
  strategiesAPI: {
    list: vi.fn(),
  },
}))

import { paperTradingAPI, strategiesAPI } from '@/lib/api'

describe('PaperTrading Page', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    localStorage.setItem('quantmate-lang', 'en')
    await i18n.changeLanguage('en')
    vi.mocked(paperTradingAPI.listDeployments).mockResolvedValue({ data: [] } as never)
    vi.mocked(paperTradingAPI.deployStrategy).mockResolvedValue({ data: {} } as never)
    vi.mocked(paperTradingAPI.stopDeployment).mockResolvedValue({ data: {} } as never)
    vi.mocked(paperTradingAPI.listPaperOrders).mockResolvedValue({
      data: [
        {
          id: '1',
          symbol: '600519.SH',
          direction: 'buy',
          price: 1800,
          quantity: 10,
          status: 'filled',
          created_at: '2025-01-01T10:00:00Z',
        },
      ],
    } as never)
    vi.mocked(paperTradingAPI.getPaperPositions).mockResolvedValue({
      data: [
        {
          id: '1',
          symbol: '600519.SH',
          direction: 'long',
          quantity: 10,
          avg_cost: 1800,
          current_price: 1850,
          pnl: 500,
          pnl_pct: 2.78,
        },
      ],
    } as never)
    vi.mocked(paperTradingAPI.getPaperPerformance).mockResolvedValue({ data: { dates: ['2025-01-01'], nav: [1] } } as never)
    vi.mocked(strategiesAPI.list).mockResolvedValue({ data: [{ id: '1', name: 'DualMA' }] } as never)
  })

  it('renders heading', () => {
    render(<PaperTrading />)
    expect(screen.getByText('Paper Trading')).toBeInTheDocument()
  })

  it('shows all 4 tabs', () => {
    render(<PaperTrading />)
    expect(screen.getByRole('button', { name: 'Deployments' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Orders' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Positions' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Performance' })).toBeInTheDocument()
  })

  it('shows new deployment button', () => {
    render(<PaperTrading />)
    expect(screen.getByText('New Paper Deployment')).toBeInTheDocument()
  })

  it('switches to orders tab', async () => {
    render(<PaperTrading />)
    fireEvent.click(screen.getByRole('button', { name: 'Orders' }))
    expect(await screen.findByText('600519.SH')).toBeInTheDocument()
  })

  it('switches to positions tab', async () => {
    render(<PaperTrading />)
    fireEvent.click(screen.getByRole('button', { name: 'Positions' }))
    expect(await screen.findByText('Current Price')).toBeInTheDocument()
  })

  it('switches to performance tab', async () => {
    render(<PaperTrading />)
    fireEvent.click(screen.getByRole('button', { name: 'Performance' }))
    expect(await screen.findByText('Paper NAV Curve')).toBeInTheDocument()
    expect(screen.getByTestId('line-chart')).toBeInTheDocument()
  })
})
