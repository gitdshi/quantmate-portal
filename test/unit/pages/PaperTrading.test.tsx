import i18n from '@/i18n'
import PaperTrading from '@/pages/PaperTrading'
import PaperTradingAccount from '@/pages/PaperTradingAccount'
import { fireEvent, render, screen, waitFor, within } from '@test/support/utils'
import { Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/components/charts/LineChart', () => ({
  default: () => <div data-testid="line-chart" />,
}))

const mockShowToast = vi.fn()
vi.mock('@/components/ui/toast-service', () => ({
  showToast: (...args: unknown[]) => mockShowToast(...args),
}))

vi.mock('@/lib/api', () => ({
  api: {
    get: vi.fn(),
    interceptors: { request: { use: vi.fn() }, response: { use: vi.fn() } },
  },
  compositeStrategiesAPI: {
    list: vi.fn(),
  },
  paperAccountAPI: {
    list: vi.fn(),
    create: vi.fn(),
    close: vi.fn(),
    get: vi.fn(),
    getAnalytics: vi.fn(),
    getEquityCurve: vi.fn(),
  },
  paperTradingAPI: {
    listDeployments: vi.fn(),
    deployStrategy: vi.fn(),
    stopDeployment: vi.fn(),
    listPaperOrders: vi.fn(),
    createPaperOrder: vi.fn(),
    cancelPaperOrder: vi.fn(),
    getPaperPositions: vi.fn(),
    getPaperPerformance: vi.fn(),
    listSignals: vi.fn(),
    confirmSignal: vi.fn(),
    rejectSignal: vi.fn(),
  },
  strategiesAPI: {
    list: vi.fn(),
  },
}))

import { compositeStrategiesAPI, paperAccountAPI, paperTradingAPI, strategiesAPI } from '@/lib/api'

const mockAccounts = [
  { id: 1, user_id: 1, name: 'Test Account', market: 'CN', initial_capital: 1000000, balance: 990000, frozen: 20000, market_value: 500000, total_pnl: -10000, total_equity: 1490000, return_pct: -1.0, status: 'active', currency: 'CNY', created_at: '2025-01-01T00:00:00Z', updated_at: '2025-01-01T00:00:00Z' },
  { id: 2, user_id: 1, name: 'HK Account', market: 'HK', initial_capital: 500000, balance: 510000, frozen: 0, market_value: 200000, total_pnl: 10000, total_equity: 710000, return_pct: 2.0, status: 'active', currency: 'HKD', created_at: '2025-01-01T00:00:00Z', updated_at: '2025-01-01T00:00:00Z' },
]

const mockSignals = [
  { id: 1, paper_account_id: 1, deployment_id: 1, strategy_name: 'DualMA', symbol: '600519.SH', direction: 'buy', quantity: 100, suggested_price: 1800, reason: 'MA crossover', status: 'pending', created_at: '2025-01-01T10:00:00Z' },
]

const mockDeployments = [
  { id: 1, strategy_name: 'DualMA', strategy_source_type: 'strategy', status: 'running', vt_symbol: '600519.SH', execution_mode: 'auto', created_at: '2025-01-01T10:00:00Z' },
]

const mockOrders = [
  { id: 1, symbol: '600519.SH', direction: 'buy', order_type: 'limit', price: 1800, quantity: 10, avg_fill_price: 1800, fee: 5, status: 'filled', paper_account_id: 1, created_at: '2025-01-01T10:00:00Z' },
]

const mockPositions = [
  { symbol: '600519.SH', direction: 'buy', quantity: 10, avg_cost: 1800, current_price: 1850, pnl: 500, pnl_pct: 0.0278 },
]

describe('PaperTrading Pages', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    window.history.pushState({}, '', '/paper-trading')
    localStorage.setItem('quantmate-lang', 'en')
    await i18n.changeLanguage('en')

    vi.mocked(paperAccountAPI.list).mockResolvedValue({ data: mockAccounts } as never)
    vi.mocked(paperAccountAPI.create).mockResolvedValue({ data: { id: 3, name: 'NewAcct' } } as never)
    vi.mocked(paperAccountAPI.close).mockResolvedValue({ data: {} } as never)
    vi.mocked(paperAccountAPI.get).mockResolvedValue({ data: mockAccounts[0] } as never)
    vi.mocked(paperAccountAPI.getAnalytics).mockResolvedValue({ data: { current_equity: 1490000, total_pnl: -10000, total_return_pct: -1.0, total_trades: 4, win_rate: 50, sharpe_ratio: 1.1, profit_factor: 1.5, max_drawdown_pct: 3.2 } } as never)
    vi.mocked(paperAccountAPI.getEquityCurve).mockResolvedValue({ data: { curve: [{ date: '2025-01-01', equity: 1000000 }, { date: '2025-01-02', equity: 1015000 }] } } as never)

    vi.mocked(paperTradingAPI.listDeployments).mockResolvedValue({ data: { deployments: mockDeployments } } as never)
    vi.mocked(paperTradingAPI.deployStrategy).mockResolvedValue({ data: {} } as never)
    vi.mocked(paperTradingAPI.stopDeployment).mockResolvedValue({ data: {} } as never)
    vi.mocked(paperTradingAPI.listPaperOrders).mockResolvedValue({ data: { orders: mockOrders } } as never)
    vi.mocked(paperTradingAPI.createPaperOrder).mockResolvedValue({ data: {} } as never)
    vi.mocked(paperTradingAPI.cancelPaperOrder).mockResolvedValue({ data: {} } as never)
    vi.mocked(paperTradingAPI.getPaperPositions).mockResolvedValue({ data: { positions: mockPositions } } as never)
    vi.mocked(paperTradingAPI.getPaperPerformance).mockResolvedValue({ data: { dates: ['2025-01-01'], nav: [1] } } as never)
    vi.mocked(paperTradingAPI.listSignals).mockResolvedValue({ data: { signals: mockSignals } } as never)
    vi.mocked(paperTradingAPI.confirmSignal).mockResolvedValue({ data: {} } as never)
    vi.mocked(paperTradingAPI.rejectSignal).mockResolvedValue({ data: {} } as never)

    vi.mocked(strategiesAPI.list).mockResolvedValue({ data: [{ id: 1, name: 'DualMA' }] } as never)
    vi.mocked(compositeStrategiesAPI.list).mockResolvedValue({ data: [{ id: 10, name: 'Composite Alpha' }] } as never)
  })

  it('renders the overview page with summary cards and accounts', async () => {
    render(<PaperTrading />)

    expect(screen.getByText('Paper Trading')).toBeInTheDocument()
    expect(await screen.findByText('Active Accounts')).toBeInTheDocument()
    expect(await screen.findByText('Test Account')).toBeInTheDocument()
    expect(await screen.findByText('HK Account')).toBeInTheDocument()
  })

  it('opens the new account modal', async () => {
    render(<PaperTrading />)

    fireEvent.click(screen.getByText('New Account'))

    expect(await screen.findByRole('heading', { name: /create paper account/i })).toBeInTheDocument()
  })

  it('creates a new account and closes an existing active account', async () => {
    render(<PaperTrading />)

    fireEvent.click(screen.getByText('New Account'))

    await screen.findByText('Create Paper Account')
    const selects = screen.getAllByRole('combobox')
    const capitalInput = screen.getByDisplayValue('1000000')

    fireEvent.change(selects[0], { target: { value: 'HK' } })
    fireEvent.change(capitalInput, { target: { value: '250000' } })
    fireEvent.click(screen.getByRole('button', { name: 'Create Deployment' }))

    await waitFor(() => {
      expect(paperAccountAPI.create).toHaveBeenCalledWith({
        name: 'Paper HK',
        initial_capital: 250000,
        market: 'HK',
      })
    })

    fireEvent.click((await screen.findAllByRole('button', { name: 'Close' }))[0])

    await waitFor(() => {
      expect(paperAccountAPI.close).toHaveBeenCalledWith(1)
    })
  })

  it('navigates from overview to account detail', async () => {
    render(<PaperTrading />)

    fireEvent.click(await screen.findByTestId('paper-account-open-1'))

    await waitFor(() => {
      expect(window.location.pathname).toBe('/paper-trading/1')
    })
  })

  it('renders the account detail page with account-scoped queries', async () => {
    window.history.pushState({}, '', '/paper-trading/1')

    render(
      <Routes>
        <Route path="/paper-trading/:accountId" element={<PaperTradingAccount />} />
      </Routes>
    )

    expect(await screen.findByText('Test Account')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Details' })).toBeInTheDocument()
    expect(screen.getByText('Deployed Strategies')).toBeInTheDocument()
    expect(screen.getByTestId('line-chart')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Order History' }))
    expect(await screen.findByText('Filter execution records by symbol, side, or lifecycle status.')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Pending Signals' }))
    expect(screen.getByRole('heading', { name: 'Pending Signals' })).toBeInTheDocument()

    await waitFor(() => {
      expect(paperTradingAPI.listDeployments).toHaveBeenCalledWith({ paper_account_id: 1 })
      expect(paperTradingAPI.getPaperPositions).toHaveBeenCalledWith({ paper_account_id: 1 })
      expect(paperTradingAPI.listPaperOrders).toHaveBeenCalledWith({ paper_account_id: 1, page: 1, page_size: 50 })
      expect(paperTradingAPI.listSignals).toHaveBeenCalledWith({ paper_account_id: 1 })
    })
  })

  it('confirms a signal from the account detail page', async () => {
    window.history.pushState({}, '', '/paper-trading/1')

    render(
      <Routes>
        <Route path="/paper-trading/:accountId" element={<PaperTradingAccount />} />
      </Routes>
    )

    fireEvent.click(await screen.findByRole('button', { name: 'Pending Signals' }))
    await screen.findByText('MA crossover')
    fireEvent.click(screen.getByRole('button', { name: /confirm/i }))

    await waitFor(() => {
      expect(paperTradingAPI.confirmSignal).toHaveBeenCalledWith(1)
    })
  })

  it('rejects a signal from the account detail page', async () => {
    window.history.pushState({}, '', '/paper-trading/1')

    render(
      <Routes>
        <Route path="/paper-trading/:accountId" element={<PaperTradingAccount />} />
      </Routes>
    )

    fireEvent.click(await screen.findByRole('button', { name: 'Pending Signals' }))
    await screen.findByText('MA crossover')
    fireEvent.click(screen.getByRole('button', { name: /reject/i }))

    await waitFor(() => {
      expect(paperTradingAPI.rejectSignal).toHaveBeenCalledWith(1)
    })
  })

  it('loads composite options and creates a strategy deployment from the account detail page', async () => {
    window.history.pushState({}, '', '/paper-trading/1')

    render(
      <Routes>
        <Route path="/paper-trading/:accountId" element={<PaperTradingAccount />} />
      </Routes>
    )

    fireEvent.click(await screen.findByRole('button', { name: 'New Paper Deployment' }))

    await screen.findByText('Create Paper Deployment')
    const selects = screen.getAllByRole('combobox')

    fireEvent.change(selects[0], { target: { value: 'composite' } })

    await waitFor(() => {
      expect(compositeStrategiesAPI.list).toHaveBeenCalled()
    })

    expect(await screen.findByRole('option', { name: 'Composite Alpha' })).toBeInTheDocument()

    fireEvent.change(screen.getAllByRole('combobox')[0], { target: { value: 'strategy' } })

    const updatedSelects = screen.getAllByRole('combobox')
    fireEvent.change(updatedSelects[1], { target: { value: '1' } })
    fireEvent.change(screen.getByPlaceholderText('600519.SH'), {
      target: { value: '600519.SH' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Create Deployment' }))

    await waitFor(() => {
      expect(paperTradingAPI.deployStrategy).toHaveBeenCalledWith({
        strategy_source_type: 'strategy',
        strategy_id: 1,
        composite_strategy_id: undefined,
        vt_symbol: '600519.SH',
        parameters: {},
        paper_account_id: 1,
        execution_mode: 'auto',
      })
    })
  })

  it('submits a limit order and cancels a submitted order', async () => {
    window.history.pushState({}, '', '/paper-trading/1')
    vi.mocked(paperTradingAPI.listPaperOrders).mockResolvedValue({
      data: {
        orders: [
          {
            id: 2,
            symbol: '000001.SZ',
            direction: 'sell',
            order_type: 'limit',
            price: 12.5,
            quantity: 20,
            status: 'submitted',
            paper_account_id: 1,
            created_at: '2025-01-02T10:00:00Z',
          },
        ],
      },
    } as never)

    render(
      <Routes>
        <Route path="/paper-trading/:accountId" element={<PaperTradingAccount />} />
      </Routes>
    )

    fireEvent.click(await screen.findByRole('button', { name: 'New Order' }))

    await screen.findByText('Submit Paper Order')
    const selects = screen.getAllByRole('combobox')
    const quantityInput = screen.getByDisplayValue('100')

    fireEvent.change(screen.getByPlaceholderText('600519.SH'), { target: { value: '000001.sz' } })
    fireEvent.change(selects[0], { target: { value: 'sell' } })
    fireEvent.change(selects[1], { target: { value: 'limit' } })
    fireEvent.change(quantityInput, { target: { value: '20' } })
    fireEvent.change(screen.getAllByRole('spinbutton')[1], { target: { value: '12.5' } })
    fireEvent.click(screen.getByRole('button', { name: 'Create Deployment' }))

    await waitFor(() => {
      expect(paperTradingAPI.createPaperOrder).toHaveBeenCalledWith({
        paper_account_id: 1,
        symbol: '000001.SZ',
        direction: 'sell',
        order_type: 'limit',
        quantity: 20,
        price: 12.5,
      })
    })

    fireEvent.click(screen.getByRole('button', { name: 'Order History' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Cancel' }))

    await waitFor(() => {
      expect(paperTradingAPI.cancelPaperOrder).toHaveBeenCalledWith(2)
    })
  })

  it('shows invalid and missing account states', async () => {
    vi.mocked(paperAccountAPI.get).mockResolvedValue(undefined as never)

    window.history.pushState({}, '', '/paper-trading/abc')
    render(
      <Routes>
        <Route path="/paper-trading/:accountId" element={<PaperTradingAccount />} />
      </Routes>
    )

    expect(await screen.findByText('Invalid paper account.')).toBeInTheDocument()

    window.history.pushState({}, '', '/paper-trading/999')
    render(
      <Routes>
        <Route path="/paper-trading/:accountId" element={<PaperTradingAccount />} />
      </Routes>
    )

    expect(await screen.findByText('Paper account not found.')).toBeInTheDocument()
  })

  it('filters and paginates deployments on the account detail page', async () => {
    window.history.pushState({}, '', '/paper-trading/1')

    vi.mocked(paperTradingAPI.listDeployments).mockResolvedValue({
      data: {
        deployments: [
          { id: 1, strategy_name: 'DualMA', strategy_source_type: 'strategy', status: 'running', vt_symbol: '600519.SH', execution_mode: 'auto', created_at: '2025-01-01T10:00:00Z' },
          { id: 2, strategy_name: 'Strategy Two', strategy_source_type: 'strategy', status: 'running', vt_symbol: '000001.SZ', execution_mode: 'auto', created_at: '2025-01-01T10:00:00Z' },
          { id: 3, strategy_name: 'Strategy Three', strategy_source_type: 'strategy', status: 'running', vt_symbol: '000002.SZ', execution_mode: 'auto', created_at: '2025-01-01T10:00:00Z' },
          { id: 4, strategy_name: 'Strategy Four', strategy_source_type: 'strategy', status: 'running', vt_symbol: '000003.SZ', execution_mode: 'auto', created_at: '2025-01-01T10:00:00Z' },
          { id: 5, strategy_name: 'Strategy Five', strategy_source_type: 'strategy', status: 'stopped', vt_symbol: '000004.SZ', execution_mode: 'auto', created_at: '2025-01-01T10:00:00Z' },
          { id: 6, strategy_name: 'Strategy Six', strategy_source_type: 'strategy', status: 'stopped', vt_symbol: '000005.SZ', execution_mode: 'auto', created_at: '2025-01-01T10:00:00Z' },
        ],
      },
    } as never)

    render(
      <Routes>
        <Route path="/paper-trading/:accountId" element={<PaperTradingAccount />} />
      </Routes>
    )

    fireEvent.click(await screen.findByRole('button', { name: 'Deployed Strategies' }))

    const deploymentsHeading = await screen.findByRole('heading', { name: 'Deployed Strategies' })
    const deploymentsSection = deploymentsHeading.closest('section') as HTMLElement

    expect(within(deploymentsSection).queryByText('Strategy Six')).not.toBeInTheDocument()

    fireEvent.click(within(deploymentsSection).getByRole('button', { name: '2' }))

    expect(await within(deploymentsSection).findByText('Strategy Six')).toBeInTheDocument()

    fireEvent.change(within(deploymentsSection).getByPlaceholderText('Search strategy or symbol'), {
      target: { value: 'Strategy Six' },
    })

    await waitFor(() => {
      expect(within(deploymentsSection).getByText('Strategy Six')).toBeInTheDocument()
      expect(within(deploymentsSection).queryByText('DualMA')).not.toBeInTheDocument()
    })
  })
})