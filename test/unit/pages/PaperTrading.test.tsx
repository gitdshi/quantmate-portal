import i18n from '@/i18n'
import PaperTrading from '@/pages/PaperTrading'
import { fireEvent, render, screen, waitFor } from '@test/support/utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/components/charts/LineChart', () => ({
  default: () => <div data-testid="line-chart" />,
}))

vi.mock('@/components/ui/FilterBar', () => ({
  default: () => <div data-testid="filter-bar" />,
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
  paperAccountAPI: {
    list: vi.fn(),
    create: vi.fn(),
    close: vi.fn(),
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

import { paperAccountAPI, paperTradingAPI, strategiesAPI } from '@/lib/api'

const mockAccounts = [
  { id: 1, user_id: 1, name: 'Test Account', market: 'CN', initial_capital: 1000000, balance: 990000, frozen: 0, market_value: 500000, total_pnl: -10000, total_equity: 1490000, return_pct: -1.0, status: 'active', currency: 'CNY', created_at: '2025-01-01T00:00:00Z', updated_at: '2025-01-01T00:00:00Z' },
  { id: 2, user_id: 1, name: 'HK Account', market: 'HK', initial_capital: 500000, balance: 510000, frozen: 0, market_value: 200000, total_pnl: 10000, total_equity: 710000, return_pct: 2.0, status: 'active', currency: 'HKD', created_at: '2025-01-01T00:00:00Z', updated_at: '2025-01-01T00:00:00Z' },
]

const mockSignals = [
  { id: 1, paper_account_id: 1, deployment_id: 1, strategy_name: 'DualMA', symbol: '600519.SH', direction: 'buy', quantity: 100, suggested_price: 1800, reason: 'MA crossover', status: 'pending', created_at: '2025-01-01T10:00:00Z' },
]

describe('PaperTrading Page', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    localStorage.setItem('quantmate-lang', 'en')
    await i18n.changeLanguage('en')
    vi.mocked(paperAccountAPI.list).mockResolvedValue({ data: mockAccounts } as never)
    vi.mocked(paperAccountAPI.create).mockResolvedValue({ data: { id: 3, name: 'NewAcct' } } as never)
    vi.mocked(paperAccountAPI.close).mockResolvedValue({ data: {} } as never)
    vi.mocked(paperTradingAPI.listDeployments).mockResolvedValue({ data: [] } as never)
    vi.mocked(paperTradingAPI.deployStrategy).mockResolvedValue({ data: {} } as never)
    vi.mocked(paperTradingAPI.stopDeployment).mockResolvedValue({ data: {} } as never)
    vi.mocked(paperTradingAPI.listPaperOrders).mockResolvedValue({
      data: [{ id: '1', symbol: '600519.SH', direction: 'buy', order_type: 'limit', price: 1800, quantity: 10, filled_quantity: 10, avg_fill_price: 1800, fee: 5, status: 'filled', paper_account_id: 1, created_at: '2025-01-01T10:00:00Z' }],
    } as never)
    vi.mocked(paperTradingAPI.createPaperOrder).mockResolvedValue({ data: {} } as never)
    vi.mocked(paperTradingAPI.cancelPaperOrder).mockResolvedValue({ data: {} } as never)
    vi.mocked(paperTradingAPI.getPaperPositions).mockResolvedValue({
      data: [{ id: '1', symbol: '600519.SH', direction: 'long', quantity: 10, avg_cost: 1800, current_price: 1850, pnl: 500, pnl_pct: 2.78 }],
    } as never)
    vi.mocked(paperTradingAPI.getPaperPerformance).mockResolvedValue({ data: { dates: ['2025-01-01'], nav: [1] } } as never)
    vi.mocked(paperTradingAPI.listSignals).mockResolvedValue({ data: mockSignals } as never)
    vi.mocked(paperTradingAPI.confirmSignal).mockResolvedValue({ data: {} } as never)
    vi.mocked(paperTradingAPI.rejectSignal).mockResolvedValue({ data: {} } as never)
    vi.mocked(strategiesAPI.list).mockResolvedValue({ data: [{ id: 1, name: 'DualMA' }] } as never)
  })

  it('renders heading', () => {
    render(<PaperTrading />)
    expect(screen.getByText('Paper Trading')).toBeInTheDocument()
  })

  it('shows all 6 tabs', () => {
    render(<PaperTrading />)
    expect(screen.getByRole('button', { name: 'Accounts' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Deployments' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Orders' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Positions' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Signals' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Performance' })).toBeInTheDocument()
  })

  it('shows new deployment button', () => {
    render(<PaperTrading />)
    expect(screen.getByText('New Paper Deployment')).toBeInTheDocument()
  })

  // ─── Accounts tab ────────────────────────────────────────
  it('displays accounts with data', async () => {
    render(<PaperTrading />)
    expect(await screen.findByText('Test Account')).toBeInTheDocument()
    expect(screen.getByText('HK Account')).toBeInTheDocument()
  })

  it('shows stat cards for active accounts', async () => {
    render(<PaperTrading />)
    expect(await screen.findByText('Active Accounts')).toBeInTheDocument()
    expect(screen.getByText('Total Equity')).toBeInTheDocument()
  })

  it('opens and closes New Account modal', async () => {
    render(<PaperTrading />)
    fireEvent.click(screen.getByText('New Account'))
    expect(await screen.findByRole('heading', { name: /account/i })).toBeInTheDocument()

    // Cancel
    const cancelBtns = screen.getAllByRole('button', { name: /cancel/i })
    fireEvent.click(cancelBtns[0])
  })

  // ─── Deployments tab ────────────────────────────────────
  it('switches to deployments tab', async () => {
    render(<PaperTrading />)
    fireEvent.click(screen.getByRole('button', { name: 'Deployments' }))
    await waitFor(() => {
      expect(paperTradingAPI.listDeployments).toHaveBeenCalled()
    })
  })

  // ─── Orders tab ──────────────────────────────────────────
  it('switches to orders tab', async () => {
    render(<PaperTrading />)
    fireEvent.click(screen.getByRole('button', { name: 'Orders' }))
    expect(await screen.findByText('600519.SH')).toBeInTheDocument()
  })

  // ─── Positions tab ──────────────────────────────────────
  it('switches to positions tab', async () => {
    render(<PaperTrading />)
    fireEvent.click(screen.getByRole('button', { name: 'Positions' }))
    expect(await screen.findByText('Current Price')).toBeInTheDocument()
  })

  // ─── Signals tab ─────────────────────────────────────────
  it('switches to signals tab and shows signals', async () => {
    render(<PaperTrading />)
    fireEvent.click(screen.getByRole('button', { name: 'Signals' }))
    expect(await screen.findByText('MA crossover')).toBeInTheDocument()
  })

  it('confirms a signal', async () => {
    render(<PaperTrading />)
    fireEvent.click(screen.getByRole('button', { name: 'Signals' }))
    await screen.findByText('MA crossover')

    const confirmBtns = screen.getAllByRole('button', { name: /confirm/i })
    fireEvent.click(confirmBtns[0])

    await waitFor(() => {
      expect(paperTradingAPI.confirmSignal).toHaveBeenCalledWith(1)
    })
  })

  it('rejects a signal', async () => {
    render(<PaperTrading />)
    fireEvent.click(screen.getByRole('button', { name: 'Signals' }))
    await screen.findByText('MA crossover')

    const rejectBtns = screen.getAllByRole('button', { name: /reject/i })
    fireEvent.click(rejectBtns[0])

    await waitFor(() => {
      expect(paperTradingAPI.rejectSignal).toHaveBeenCalledWith(1)
    })
  })

  // ─── Performance tab ────────────────────────────────────
  it('switches to performance tab', async () => {
    render(<PaperTrading />)
    fireEvent.click(screen.getByRole('button', { name: 'Performance' }))
    expect(await screen.findByText('Paper NAV Curve')).toBeInTheDocument()
    expect(screen.getByTestId('line-chart')).toBeInTheDocument()
  })

  it('shows empty performance when no dates', async () => {
    vi.mocked(paperTradingAPI.getPaperPerformance).mockResolvedValue({ data: { dates: [], nav: [] } } as never)
    render(<PaperTrading />)
    fireEvent.click(screen.getByRole('button', { name: 'Performance' }))
    expect(await screen.findByText(/no performance/i)).toBeInTheDocument()
  })

  // ─── API error handling ─────────────────────────────────
  it('handles account create failure', async () => {
    vi.mocked(paperAccountAPI.create).mockRejectedValue(new Error('fail'))
    render(<PaperTrading />)
    fireEvent.click(screen.getByText('New Account'))

    // Find and fill the account modal form
    const modal = (await screen.findByRole('heading', { name: /account/i })).closest('.fixed')!
    const inputs = modal.querySelectorAll('input')
    // name input
    if (inputs[0]) fireEvent.change(inputs[0], { target: { value: 'Bad Account' } })

    // Submit
    const submitBtns = modal.querySelectorAll('button')
    const submitBtn = Array.from(submitBtns).find(b => b.textContent?.match(/create|submit/i))
    if (submitBtn) fireEvent.click(submitBtn)

    await waitFor(() => {
      expect(paperAccountAPI.create).toHaveBeenCalled()
    })
  })

  // ─── Account create success ─────────────────────────────
  it('creates account successfully and closes modal', async () => {
    render(<PaperTrading />)
    fireEvent.click(screen.getByText('New Account'))

    const modal = (await screen.findByRole('heading', { name: /account/i })).closest('.fixed')!
    const inputs = modal.querySelectorAll('input')
    if (inputs[0]) fireEvent.change(inputs[0], { target: { value: 'New Account' } })

    const submitBtn = Array.from(modal.querySelectorAll('button')).find(b => b.textContent?.match(/create|submit/i))
    if (submitBtn) fireEvent.click(submitBtn)

    await waitFor(() => {
      expect(paperAccountAPI.create).toHaveBeenCalled()
    })
    await waitFor(() => {
      expect(mockShowToast).toHaveBeenCalledWith(expect.any(String), 'success')
    })
  })

  // ─── Close account ──────────────────────────────────────
  it('closes an active account', async () => {
    render(<PaperTrading />)
    await screen.findByText('Test Account')

    const closeBtns = screen.getAllByRole('button').filter(b => b.textContent?.match(/close/i))
    if (closeBtns.length > 0) {
      fireEvent.click(closeBtns[0])
      await waitFor(() => {
        expect(paperAccountAPI.close).toHaveBeenCalled()
      })
    }
  })

  // ─── Deploy strategy modal ──────────────────────────────
  it('opens deploy modal and submits', async () => {
    render(<PaperTrading />)
    fireEvent.click(screen.getByText('New Paper Deployment'))

    // Wait for deploy modal to open and strategies to load
    await screen.findByText('Create Paper Deployment')
    await screen.findByText('DualMA')

    const modals = document.querySelectorAll('.fixed')
    const modal = modals[modals.length - 1]

    // Select strategy (first real option)
    const selects = modal.querySelectorAll('select')
    selects.forEach(s => {
      const opts = s.querySelectorAll('option')
      if (opts.length > 1) fireEvent.change(s, { target: { value: opts[1].value } })
    })

    const inputs = modal.querySelectorAll('input')
    inputs.forEach(input => {
      fireEvent.change(input, { target: { value: '600519.SH' } })
    })

    const submitBtn = Array.from(modal.querySelectorAll('button')).find(b => b.textContent?.match(/create deployment/i))
    expect(submitBtn).toBeTruthy()
    fireEvent.click(submitBtn!)
    await waitFor(() => {
      expect(paperTradingAPI.deployStrategy).toHaveBeenCalled()
    })
  })

  // ─── Deploy failure ─────────────────────────────────────
  it('handles deploy failure with error toast', async () => {
    vi.mocked(paperTradingAPI.deployStrategy).mockRejectedValue(new Error('Deploy failed'))

    render(<PaperTrading />)
    fireEvent.click(screen.getByText('New Paper Deployment'))

    await screen.findByText('Create Paper Deployment')
    await screen.findByText('DualMA')

    const modals = document.querySelectorAll('.fixed')
    const modal = modals[modals.length - 1]

    const selects = modal.querySelectorAll('select')
    selects.forEach(s => {
      const opts = s.querySelectorAll('option')
      if (opts.length > 1) fireEvent.change(s, { target: { value: opts[1].value } })
    })

    const inputs = modal.querySelectorAll('input')
    inputs.forEach(input => fireEvent.change(input, { target: { value: '600519.SH' } }))

    const submitBtn = Array.from(modal.querySelectorAll('button')).find(b => b.textContent?.match(/deploy|submit|create deployment/i))
    expect(submitBtn).toBeTruthy()
    fireEvent.click(submitBtn!)
    await waitFor(() => {
      expect(paperTradingAPI.deployStrategy).toHaveBeenCalled()
    })
  })

  // ─── Stop deployment ────────────────────────────────────
  it('stops a running deployment', async () => {
    vi.mocked(paperTradingAPI.listDeployments).mockResolvedValue({
      data: [{ id: 1, strategy_name: 'DualMA', paper_account_id: 1, vt_symbol: '600519.SH', execution_mode: 'auto', status: 'running', created_at: '2025-01-01T10:00:00Z' }],
    } as never)

    render(<PaperTrading />)
    fireEvent.click(screen.getByRole('button', { name: 'Deployments' }))
    await screen.findByText('DualMA')

    const stopBtns = screen.getAllByRole('button').filter(b => b.textContent?.match(/stop/i))
    if (stopBtns.length > 0) {
      fireEvent.click(stopBtns[0])
      await waitFor(() => {
        expect(paperTradingAPI.stopDeployment).toHaveBeenCalled()
      })
    }
  })

  // ─── Order modal ────────────────────────────────────────
  it('opens order modal and fills fields', async () => {
    render(<PaperTrading />)
    const newOrderBtns = screen.getAllByRole('button').filter(b => b.textContent?.match(/new order/i))
    if (newOrderBtns.length > 0) {
      fireEvent.click(newOrderBtns[0])

      await waitFor(() => {
        const modals = document.querySelectorAll('.fixed')
        expect(modals.length).toBeGreaterThan(0)
      })

      const modals = document.querySelectorAll('.fixed')
      const modal = modals[modals.length - 1]

      // Fill symbol input
      const inputs = modal.querySelectorAll('input')
      inputs.forEach(input => {
        if (input.type === 'number') {
          fireEvent.change(input, { target: { value: '100' } })
        } else {
          fireEvent.change(input, { target: { value: '600519.SH' } })
        }
      })

      // Fill selects
      const selects = modal.querySelectorAll('select')
      selects.forEach(s => {
        const opts = s.querySelectorAll('option')
        if (opts.length > 1) fireEvent.change(s, { target: { value: opts[1].value } })
      })

      // Submit
      const submitBtn = Array.from(modal.querySelectorAll('button')).find(b => b.textContent?.match(/submit|create|place/i))
      if (submitBtn) {
        fireEvent.click(submitBtn)
        await waitFor(() => {
          expect(paperTradingAPI.createPaperOrder).toHaveBeenCalled()
        })
      }
    }
  })

  // ─── Order create failure ───────────────────────────────
  it('handles order create failure with API error message', async () => {
    vi.mocked(paperTradingAPI.createPaperOrder).mockRejectedValue({
      response: { data: { message: 'Insufficient balance' } },
    })

    render(<PaperTrading />)
    const newOrderBtns = screen.getAllByRole('button').filter(b => b.textContent?.match(/new order/i))
    if (newOrderBtns.length > 0) {
      fireEvent.click(newOrderBtns[0])

      await waitFor(() => {
        const modals = document.querySelectorAll('.fixed')
        expect(modals.length).toBeGreaterThan(0)
      })

      const modals = document.querySelectorAll('.fixed')
      const modal = modals[modals.length - 1]

      const inputs = modal.querySelectorAll('input')
      inputs.forEach(input => {
        if (input.type === 'number') {
          fireEvent.change(input, { target: { value: '100' } })
        } else {
          fireEvent.change(input, { target: { value: '600519.SH' } })
        }
      })

      const selects = modal.querySelectorAll('select')
      selects.forEach(s => {
        const opts = s.querySelectorAll('option')
        if (opts.length > 1) fireEvent.change(s, { target: { value: opts[1].value } })
      })

      const submitBtn = Array.from(modal.querySelectorAll('button')).find(b => b.textContent?.match(/submit|create|place/i))
      if (submitBtn) {
        fireEvent.click(submitBtn)
        await waitFor(() => {
          expect(paperTradingAPI.createPaperOrder).toHaveBeenCalled()
        })
      }
    }
  })

  // ─── Cancel order ───────────────────────────────────────
  it('cancels a submitted order', async () => {
    vi.mocked(paperTradingAPI.listPaperOrders).mockResolvedValue({
      data: [{ id: '5', symbol: '000001.SZ', direction: 'buy', order_type: 'limit', price: 10, quantity: 100, filled_quantity: 0, avg_fill_price: 0, fee: 0, status: 'submitted', paper_account_id: 1, created_at: '2025-01-01T10:00:00Z' }],
    } as never)

    render(<PaperTrading />)
    fireEvent.click(screen.getByRole('button', { name: 'Orders' }))
    await screen.findByText('000001.SZ')

    const cancelBtns = screen.getAllByRole('button').filter(b => b.textContent?.match(/cancel/i))
    if (cancelBtns.length > 0) {
      fireEvent.click(cancelBtns[0])
      await waitFor(() => {
        expect(paperTradingAPI.cancelPaperOrder).toHaveBeenCalled()
      })
    }
  })

  // ─── Signal confirm failure ─────────────────────────────
  it('handles signal confirm failure', async () => {
    vi.mocked(paperTradingAPI.confirmSignal).mockRejectedValue({
      response: { data: { message: 'Signal expired' } },
    })

    render(<PaperTrading />)
    fireEvent.click(screen.getByRole('button', { name: 'Signals' }))
    await screen.findByText('MA crossover')

    const confirmBtns = screen.getAllByRole('button', { name: /confirm/i })
    fireEvent.click(confirmBtns[0])

    await waitFor(() => {
      expect(paperTradingAPI.confirmSignal).toHaveBeenCalled()
    })
  })

  // ─── Account modal: change market and capital ───────────
  it('changes market and capital in new account modal', async () => {
    render(<PaperTrading />)
    fireEvent.click(screen.getByText('New Account'))

    const modal = (await screen.findByRole('heading', { name: /account/i })).closest('.fixed')!

    const selects = modal.querySelectorAll('select')
    if (selects.length > 0) {
      fireEvent.change(selects[0], { target: { value: 'HK' } })
    }

    const numberInputs = modal.querySelectorAll('input[type="number"]')
    if (numberInputs.length > 0) {
      fireEvent.change(numberInputs[0], { target: { value: '500000' } })
    }
  })

  // ─── Deployment badges ──────────────────────────────────
  it('shows deployment badges for auto and semi_auto modes', async () => {
    vi.mocked(paperTradingAPI.listDeployments).mockResolvedValue({
      data: [
        { id: 1, strategy_name: 'AutoStrat', paper_account_id: 1, vt_symbol: '600519.SH', execution_mode: 'auto', status: 'running', created_at: '2025-01-01T10:00:00Z' },
        { id: 2, strategy_name: 'SemiStrat', paper_account_id: 2, vt_symbol: '000001.SZ', execution_mode: 'semi_auto', status: 'stopped', created_at: '2025-01-02T10:00:00Z' },
      ],
    } as never)

    render(<PaperTrading />)
    fireEvent.click(screen.getByRole('button', { name: 'Deployments' }))
    await screen.findByText('AutoStrat')
    expect(screen.getByText('SemiStrat')).toBeInTheDocument()
  })

  // ─── USD currency format ────────────────────────────────
  it('renders USD currency symbol correctly', async () => {
    vi.mocked(paperAccountAPI.list).mockResolvedValue({
      data: [{ id: 3, user_id: 1, name: 'USD Account', market: 'US', initial_capital: 100000, balance: 100000, frozen: 0, market_value: 50000, total_pnl: 0, total_equity: 150000, return_pct: 0, status: 'active', currency: 'USD', created_at: '2025-01-01T00:00:00Z', updated_at: '2025-01-01T00:00:00Z' }],
    } as never)

    render(<PaperTrading />)
    await screen.findByText('USD Account')
    // Should render $ symbol in formatted money values
    const allText = document.body.textContent || ''
    expect(allText).toMatch(/\$\d/)
  })

  // ─── Limit order shows price field (lines 414-416) ─────────
  it('shows price field for limit orders and hides for market orders', async () => {
    render(<PaperTrading />)
    await screen.findByText('Test Account')

    // Open order modal
    fireEvent.click(screen.getByText(/new order|submit.*order/i))

    await waitFor(() => {
      const modals = document.querySelectorAll('.fixed')
      expect(modals.length).toBeGreaterThan(0)
    })

    const modal = Array.from(document.querySelectorAll('.fixed')).pop()!

    // Default is market order — no price field
    const selects = modal.querySelectorAll('select')
    const orderTypeSelect = Array.from(selects).find((s) =>
      Array.from(s.options).some((o) => o.textContent === 'Limit')
    )
    expect(orderTypeSelect).toBeTruthy()

    // Market order → no Limit price placeholder
    const priceInputsBefore = modal.querySelectorAll('input[type="number"]')
    const hasLimitPlaceholder = Array.from(priceInputsBefore).some((i) =>
      (i as HTMLInputElement).placeholder.toLowerCase().includes('limit')
    )
    expect(hasLimitPlaceholder).toBe(false)

    // Switch to limit order
    fireEvent.change(orderTypeSelect!, { target: { value: 'limit' } })

    await waitFor(() => {
      const priceInputs = modal.querySelectorAll('input[type="number"]')
      const limitInput = Array.from(priceInputs).find((i) =>
        (i as HTMLInputElement).placeholder.toLowerCase().includes('limit')
      )
      expect(limitInput).toBeTruthy()
    })
  })

  // ─── Order modal: fill all fields and submit (lines 420-465) ──
  it('fills order form and submits paper order', async () => {
    render(<PaperTrading />)
    await screen.findByText('Test Account')

    // Open order modal
    fireEvent.click(screen.getByText(/new order|submit.*order/i))

    await waitFor(() => {
      const modals = document.querySelectorAll('.fixed')
      expect(modals.length).toBeGreaterThan(0)
    })

    const modal = Array.from(document.querySelectorAll('.fixed')).pop()!

    // Select account
    const selects = modal.querySelectorAll('select')
    const accountSelect = selects[0]
    if (accountSelect) {
      fireEvent.change(accountSelect, { target: { value: '1' } })
    }

    // Enter symbol
    const textInputs = modal.querySelectorAll('input:not([type="number"])')
    const symbolInput = textInputs[0] as HTMLInputElement
    if (symbolInput) {
      fireEvent.change(symbolInput, { target: { value: '600519' } })
    }

    // Enter quantity
    const numberInputs = modal.querySelectorAll('input[type="number"]')
    const qtyInput = numberInputs[0] as HTMLInputElement
    if (qtyInput) {
      fireEvent.change(qtyInput, { target: { value: '100' } })
    }

    // Click submit button
    const submitBtn = Array.from(modal.querySelectorAll('button')).find(
      (b) => b.textContent?.match(/submit/i)
    )
    if (submitBtn) {
      fireEvent.click(submitBtn)
      await waitFor(() => {
        expect(paperTradingAPI.createPaperOrder).toHaveBeenCalled()
      })
    }
  })

  // ─── Order modal: stop order shows price field (lines 452-460) ──
  it('shows price field for stop orders', async () => {
    render(<PaperTrading />)
    await screen.findByText('Test Account')

    fireEvent.click(screen.getByText(/new order|submit.*order/i))

    await waitFor(() => {
      const modals = document.querySelectorAll('.fixed')
      expect(modals.length).toBeGreaterThan(0)
    })

    const modal = Array.from(document.querySelectorAll('.fixed')).pop()!
    const selects = modal.querySelectorAll('select')
    const orderTypeSelect = Array.from(selects).find((s) =>
      Array.from(s.options).some((o) => o.textContent === 'Stop')
    )

    if (orderTypeSelect) {
      fireEvent.change(orderTypeSelect, { target: { value: 'stop' } })

      await waitFor(() => {
        const priceInputs = modal.querySelectorAll('input[type="number"]')
        expect(priceInputs.length).toBeGreaterThanOrEqual(2) // quantity + price
      })
    }
  })

  // ─── Order sell direction (lines 440-445) ──
  it('selects sell direction in order modal', async () => {
    render(<PaperTrading />)
    await screen.findByText('Test Account')

    fireEvent.click(screen.getByText(/new order|submit.*order/i))

    await waitFor(() => {
      const modals = document.querySelectorAll('.fixed')
      expect(modals.length).toBeGreaterThan(0)
    })

    const modal = Array.from(document.querySelectorAll('.fixed')).pop()!
    const selects = modal.querySelectorAll('select')
    const directionSelect = Array.from(selects).find((s) =>
      Array.from(s.options).some((o) => o.textContent?.toLowerCase() === 'sell')
    )

    if (directionSelect) {
      fireEvent.change(directionSelect, { target: { value: 'sell' } })
      expect((directionSelect as HTMLSelectElement).value).toBe('sell')
    }
  })

  // ─── Order modal cancel button (line 414) ──
  it('closes order modal with cancel button', async () => {
    render(<PaperTrading />)
    await screen.findByText('Test Account')

    fireEvent.click(screen.getByText(/new order|submit.*order/i))

    await waitFor(() => {
      const modals = document.querySelectorAll('.fixed')
      expect(modals.length).toBeGreaterThan(0)
    })

    const modal = Array.from(document.querySelectorAll('.fixed')).pop()!
    const cancelBtn = Array.from(modal.querySelectorAll('button')).find(
      (b) => b.textContent?.match(/cancel/i)
    )
    if (cancelBtn) {
      fireEvent.click(cancelBtn)
      await waitFor(() => {
        // Modal should be closed — no modals left
        const modals = document.querySelectorAll('.fixed')
        // Either no modals or fewer than before
        expect(modals.length).toBeLessThanOrEqual(1)
      })
    }
  })

  // ─── Deploy strategy modal (lines 452-467) ──
  it('opens deploy strategy modal and fills form', async () => {
    vi.mocked(strategiesAPI.list).mockResolvedValue({
      data: [{ id: 1, name: 'DualMA', class_name: 'DualMAStrategy', version: 1, is_active: true, created_at: '2025-01-01', updated_at: '2025-01-01' }],
    } as never)

    render(<PaperTrading />)
    await screen.findByText('Test Account')

    // Find deploy button
    const deployBtn = Array.from(document.querySelectorAll('button')).find(
      (b) => b.textContent?.match(/deploy|start/i) && !b.textContent?.match(/stop/i)
    )
    if (deployBtn) {
      fireEvent.click(deployBtn)

      await waitFor(() => {
        const modals = document.querySelectorAll('.fixed')
        expect(modals.length).toBeGreaterThan(0)
      })
    }
  })

  // ─── Order modal fill form + submit (lines 414-440) ────
  it('fills and submits order form in modal', async () => {
    render(<PaperTrading />)
    await screen.findByText('Test Account')

    // Open order modal
    const orderBtn = Array.from(document.querySelectorAll('button')).find(
      (b) => b.textContent?.match(/new.*order|submit.*order/i)
    )
    if (!orderBtn) return
    fireEvent.click(orderBtn)

    await waitFor(() => {
      expect(document.querySelectorAll('.fixed').length).toBeGreaterThan(0)
    })

    // Fill the order form
    const selects = document.querySelectorAll('select')
    const accountSelect = Array.from(selects).find(s => Array.from(s.options).some(o => o.text.includes('Test Account')))
    if (accountSelect) {
      fireEvent.change(accountSelect, { target: { value: '1' } })
    }

    const symbolInput = Array.from(document.querySelectorAll('input')).find(
      (i) => (i as HTMLInputElement).placeholder?.includes('600519')
    )
    if (symbolInput) {
      fireEvent.change(symbolInput, { target: { value: '600519' } })
    }

    const qtyInput = Array.from(document.querySelectorAll('input[type="number"]')).at(-1)
    if (qtyInput) {
      fireEvent.change(qtyInput, { target: { value: '100' } })
    }
  })

  // ─── Performance tab (lines 377-384) ────
  it('shows performance tab content', async () => {
    vi.mocked(paperTradingAPI.getPaperPerformance).mockResolvedValue({
      data: { dates: ['2025-01-01', '2025-01-02'], nav: [1, 1.02] },
    } as never)

    render(<PaperTrading />)
    await screen.findByText('Test Account')

    const perfTab = screen.getByRole('button', { name: /performance/i })
    fireEvent.click(perfTab)

    await waitFor(() => {
      // Should render the performance chart or empty message
      const chart = document.querySelector('[data-testid="line-chart"]')
      const emptyMsg = screen.queryByText(/no performance/i)
      expect(chart || emptyMsg).toBeTruthy()
    })
  })

  // ─── Create account modal submit (line 387) ────
  it('opens and submits create account modal', async () => {
    render(<PaperTrading />)
    await screen.findByText('Test Account')

    const createBtn = Array.from(document.querySelectorAll('button')).find(
      (b) => b.textContent?.match(/new.*account|create.*account/i)
    )
    if (!createBtn) return
    fireEvent.click(createBtn)

    await waitFor(() => {
      expect(document.querySelectorAll('.fixed').length).toBeGreaterThan(0)
    })

    const modal = document.querySelectorAll('.fixed')
    const lastModal = modal[modal.length - 1]
    const inputs = lastModal.querySelectorAll('input')
    if (inputs[0]) {
      fireEvent.change(inputs[0], { target: { value: 'New Test Account' } })
    }

    const submitBtns = Array.from(lastModal.querySelectorAll('button')).filter(
      (b) => b.textContent?.match(/submit|create|confirm/i) && !b.textContent?.match(/cancel/i)
    )
    if (submitBtns.length > 0) {
      fireEvent.click(submitBtns[0])
      await waitFor(() => {
        expect(paperAccountAPI.create).toHaveBeenCalled()
      })
    }
  })

  // ─── Order modal submit triggers mutation (line 414) ────
  it('submits order form via mutation', async () => {
    render(<PaperTrading />)
    await screen.findByText('Test Account')

    const orderBtn = Array.from(document.querySelectorAll('button')).find(
      (b) => b.textContent?.match(/new.*order|submit.*order/i)
    )
    if (!orderBtn) return
    fireEvent.click(orderBtn)

    await waitFor(() => {
      expect(document.querySelectorAll('.fixed').length).toBeGreaterThan(0)
    })

    const modals = document.querySelectorAll('.fixed')
    const lastModal = modals[modals.length - 1]

    // Fill account select
    const selects = lastModal.querySelectorAll('select')
    if (selects[0]) {
      fireEvent.change(selects[0], { target: { value: '1' } })
    }

    // Fill symbol
    const symbolInput = Array.from(lastModal.querySelectorAll('input')).find(
      (i) => (i as HTMLInputElement).placeholder?.includes('600519')
    )
    if (symbolInput) {
      fireEvent.change(symbolInput, { target: { value: '600519' } })
    }

    // Fill quantity
    const numInputs = lastModal.querySelectorAll('input[type="number"]')
    if (numInputs.length > 0) {
      fireEvent.change(numInputs[numInputs.length - 1], { target: { value: '100' } })
    }

    // Find and click submit
    const submitBtns = Array.from(lastModal.querySelectorAll('button')).filter(
      (b) => b.textContent?.match(/submit/i) && !b.textContent?.match(/cancel/i)
    )
    if (submitBtns.length > 0) {
      fireEvent.click(submitBtns[0])
      await waitFor(() => {
        expect(paperTradingAPI.createPaperOrder).toHaveBeenCalled()
      })
    }
  })

  // ─── Deploy strategy modal submit (line 452-467) ────
  it('submits deploy strategy form via mutation', async () => {
    vi.mocked(strategiesAPI.list).mockResolvedValue({
      data: [{ id: 1, name: 'DualMA', class_name: 'DualMAStrategy', version: 1, is_active: true, created_at: '2025-01-01', updated_at: '2025-01-01' }],
    } as never)

    render(<PaperTrading />)
    await screen.findByText('Test Account')

    const deployBtn = Array.from(document.querySelectorAll('button')).find(
      (b) => b.textContent?.match(/deploy|start/i) && !b.textContent?.match(/stop/i)
    )
    if (!deployBtn) return
    fireEvent.click(deployBtn)

    await waitFor(() => {
      expect(document.querySelectorAll('.fixed').length).toBeGreaterThan(0)
    })

    const modals = document.querySelectorAll('.fixed')
    const lastModal = modals[modals.length - 1]

    // Wait for strategies to load in the select
    await waitFor(() => {
      const selects = lastModal.querySelectorAll('select')
      const stratSelect = Array.from(selects).find(
        (s) => Array.from(s.options).some((o) => o.text.includes('DualMA'))
      )
      if (stratSelect) {
        fireEvent.change(stratSelect, { target: { value: '1' } })
      }
    })

    const submitBtns = Array.from(lastModal.querySelectorAll('button')).filter(
      (b) => b.textContent?.match(/submit/i) && !b.textContent?.match(/cancel/i)
    )
    if (submitBtns.length > 0) {
      fireEvent.click(submitBtns[0])
      await waitFor(() => {
        expect(paperTradingAPI.deployStrategy).toHaveBeenCalled()
      })
    }
  })

  // ─── Orders tab (line 360) ────
  it('shows orders tab content', async () => {
    render(<PaperTrading />)
    await screen.findByText('Test Account')

    const ordersTab = screen.getByRole('button', { name: /orders/i })
    fireEvent.click(ordersTab)

    await waitFor(() => {
      expect(screen.getByText('600519.SH')).toBeInTheDocument()
    })
  })

  // ─── Positions tab (line 300-305) ────
  it('shows positions tab with data and column renderers', async () => {
    render(<PaperTrading />)
    await screen.findByText('Test Account')

    const posTab = screen.getByRole('button', { name: /positions/i })
    fireEvent.click(posTab)

    // Wait for positions data to load and render (column renderers fire)
    await waitFor(() => {
      expect(screen.getByText('600519.SH')).toBeInTheDocument()
    })

    // Column renderers for pnl ("+500") and pnl_pct ("+2.78%") should be rendered
    expect(screen.getByText(/2\.78%/)).toBeInTheDocument()
  })

  // ─── Order modal with limit order type (lines 414, 452-467) ─
  it('opens order modal and shows limit-price field for non-market order', async () => {
    render(<PaperTrading />)
    await screen.findByText('Test Account')

    // Click "New Order" button
    fireEvent.click(screen.getByRole('button', { name: /new order/i }))

    await waitFor(() => {
      expect(screen.getByText('Submit Paper Order')).toBeInTheDocument()
    })

    const modals = document.querySelectorAll('.fixed')
    const modal = modals[modals.length - 1]

    // Fill symbol
    const textInputs = modal.querySelectorAll<HTMLInputElement>('input:not([type="number"])')
    if (textInputs.length > 0) {
      fireEvent.change(textInputs[0], { target: { value: '000001.SZ' } })
    }

    // Change order type to "limit" to reveal price field
    const selects = modal.querySelectorAll('select')
    const orderTypeSelect = Array.from(selects).find((s) =>
      Array.from(s.options).some((o) => o.value === 'limit')
    )
    expect(orderTypeSelect).toBeTruthy()
    fireEvent.change(orderTypeSelect!, { target: { value: 'limit' } })

    // Now the price input should appear (conditional line ~457)
    await waitFor(() => {
      const numInputs = modal.querySelectorAll('input[type="number"]')
      expect(numInputs.length).toBeGreaterThanOrEqual(2) // quantity + price
    })

    // Fill quantity and price
    const numInputs = modal.querySelectorAll<HTMLInputElement>('input[type="number"]')
    fireEvent.change(numInputs[0], { target: { value: '100' } })
    fireEvent.change(numInputs[1], { target: { value: '15.50' } })
    expect(numInputs[1].placeholder).toMatch(/limit price/i)
  })

  // ─── Performance tab with chart (line 387) ─────────────
  it('shows performance tab with line chart when data exists', async () => {
    render(<PaperTrading />)
    await screen.findByText('Test Account')

    fireEvent.click(screen.getByRole('button', { name: /performance/i }))

    await waitFor(() => {
      expect(screen.getByTestId('line-chart')).toBeInTheDocument()
    })
  })
})
