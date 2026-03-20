import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@test/support/utils'
import PaperTrading from '@/pages/PaperTrading'

vi.mock('@/lib/api', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    interceptors: { request: { use: vi.fn() }, response: { use: vi.fn() } },
  },
  paperTradingAPI: {
    deployStrategy: vi.fn(),
    listDeployments: vi.fn(),
    stopDeployment: vi.fn(),
    listPaperOrders: vi.fn(),
    createPaperOrder: vi.fn(),
    cancelPaperOrder: vi.fn(),
    getPaperPositions: vi.fn(),
    getPaperPerformance: vi.fn(),
  },
  strategiesAPI: {
    list: vi.fn(),
  },
}))

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useSearchParams: () => [new URLSearchParams(), vi.fn()],
  }
})

import { paperTradingAPI, strategiesAPI } from '@/lib/api'

const mockDeployments = [
  {
    id: 1, strategy_id: 10, strategy_name: 'TestStrat', vt_symbol: 'IF2406.CFFEX',
    parameters: {}, status: 'running', started_at: '2025-01-01T10:00:00Z',
    stopped_at: null, pnl: 120.5,
  },
]

const mockOrders = [
  {
    id: 1, symbol: '000001.SZ', direction: 'buy', order_type: 'market',
    quantity: 100, price: 10.5, status: 'filled', filled_quantity: 100,
    avg_fill_price: 10.48, fee: 0.31, created_at: '2025-01-01T10:00:00Z',
  },
  {
    id: 2, symbol: '600519.SH', direction: 'sell', order_type: 'limit',
    quantity: 50, price: 1800, status: 'created', filled_quantity: null,
    avg_fill_price: null, fee: null, created_at: '2025-01-02T10:00:00Z',
  },
]

describe('PaperTrading Page', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    ;(strategiesAPI.list as any).mockResolvedValue({ data: [{ id: 10, name: 'TestStrat' }] })
    ;(paperTradingAPI.listDeployments as any).mockResolvedValue({ data: { deployments: mockDeployments } })
    ;(paperTradingAPI.listPaperOrders as any).mockResolvedValue({ data: { orders: mockOrders } })
    ;(paperTradingAPI.getPaperPositions as any).mockResolvedValue({ data: { positions: [] } })
    ;(paperTradingAPI.getPaperPerformance as any).mockResolvedValue({
      data: { total_pnl: 120.5, total_trades: 5, win_rate: 0.6, max_drawdown: 0.05, sharpe_ratio: 1.2, equity_curve: [] },
    })
  })

  it('renders heading and deploy form', () => {
    render(<PaperTrading />)
    expect(screen.getByText('Paper Trading')).toBeInTheDocument()
    expect(screen.getByText('Deploy Strategy to Paper')).toBeInTheDocument()
    expect(screen.getByText('Deploy')).toBeInTheDocument()
  })

  it('renders manual paper order form', () => {
    render(<PaperTrading />)
    expect(screen.getByText('Manual Paper Order')).toBeInTheDocument()
    expect(screen.getByText('Submit Paper Order')).toBeInTheDocument()
  })

  it('displays deployments after loading', async () => {
    render(<PaperTrading />)
    await waitFor(() => {
      expect(screen.getByText('TestStrat')).toBeInTheDocument()
      expect(screen.getByText('IF2406.CFFEX')).toBeInTheDocument()
      expect(screen.getByText('running')).toBeInTheDocument()
    })
  })

  it('shows orders tab content', async () => {
    render(<PaperTrading />)
    const ordersTab = screen.getByText('Orders')
    fireEvent.click(ordersTab)
    await waitFor(() => {
      expect(screen.getByText('000001.SZ')).toBeInTheDocument()
      expect(screen.getByText('600519.SH')).toBeInTheDocument()
    })
  })

  it('shows cancel button for cancellable orders', async () => {
    render(<PaperTrading />)
    const ordersTab = screen.getByText('Orders')
    fireEvent.click(ordersTab)
    await waitFor(() => {
      // Order id=2 has status 'created', should show cancel
      const cancelButtons = screen.getAllByTitle('Cancel')
      expect(cancelButtons.length).toBe(1)
    })
  })

  it('submits a paper order', async () => {
    ;(paperTradingAPI.createPaperOrder as any).mockResolvedValue({ data: { id: 3 } })
    render(<PaperTrading />)

    const symbolInput = screen.getByPlaceholderText('000001.SZ')
    fireEvent.change(symbolInput, { target: { value: '300001.SZ' } })

    const submitBtn = screen.getByText('Submit Paper Order')
    fireEvent.click(submitBtn)

    await waitFor(() => {
      expect(paperTradingAPI.createPaperOrder).toHaveBeenCalledWith(expect.objectContaining({
        symbol: '300001.SZ',
        direction: 'buy',
        order_type: 'market',
        quantity: 100,
      }))
    })
  })

  it('deploys a strategy', async () => {
    ;(paperTradingAPI.deployStrategy as any).mockResolvedValue({ data: { success: true, deployment_id: 5 } })
    render(<PaperTrading />)

    await waitFor(() => {
      expect(screen.getByText('TestStrat')).toBeInTheDocument()
    })

    // Select strategy
    const strategySelect = screen.getAllByRole('combobox')[0]
    fireEvent.change(strategySelect, { target: { value: '10' } })

    // Enter symbol
    const symbolInput = screen.getByPlaceholderText('IF2406.CFFEX')
    fireEvent.change(symbolInput, { target: { value: 'IF2412.CFFEX' } })

    const deployBtn = screen.getByText('Deploy')
    fireEvent.click(deployBtn)

    await waitFor(() => {
      expect(paperTradingAPI.deployStrategy).toHaveBeenCalledWith(expect.objectContaining({
        strategy_id: 10,
        vt_symbol: 'IF2412.CFFEX',
      }))
    })
  })

  it('stops a deployment', async () => {
    ;(paperTradingAPI.stopDeployment as any).mockResolvedValue({ data: {} })
    render(<PaperTrading />)

    await waitFor(() => {
      expect(screen.getByText('running')).toBeInTheDocument()
    })

    const stopBtn = screen.getByTitle('Stop')
    fireEvent.click(stopBtn)

    await waitFor(() => {
      expect(paperTradingAPI.stopDeployment).toHaveBeenCalledWith(1)
    })
  })

  it('shows performance tab', async () => {
    render(<PaperTrading />)
    const perfTab = screen.getByText('Performance')
    fireEvent.click(perfTab)

    await waitFor(() => {
      expect(screen.getByText('Total P&L')).toBeInTheDocument()
      expect(screen.getByText('Win Rate')).toBeInTheDocument()
    })
  })

  it('handles API error gracefully', async () => {
    ;(paperTradingAPI.listDeployments as any).mockRejectedValue(new Error('Network error'))
    render(<PaperTrading />)
    await waitFor(() => {
      expect(screen.getByText(/Failed to load deployments/)).toBeInTheDocument()
    })
  })
})
