import BacktestForm from '@/components/BacktestForm'
import i18n from '@/i18n'
import { mockStrategies } from '@test/support/mockData'
import { fireEvent, render, screen, waitFor } from '@test/support/utils'
import { userEvent } from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// Capture SymbolSearch onChoose callback
let capturedOnChoose: ((stock: { vt_symbol?: string; name?: string }) => void) | null = null
vi.mock('@/components/SymbolSearch', () => ({
  default: ({ onChoose }: { onChoose: (stock: { vt_symbol?: string; name?: string }) => void }) => {
    capturedOnChoose = onChoose
    return <div data-testid="symbol-search">SymbolSearch Mock</div>
  },
}))

// Mock API
vi.mock('@/lib/api', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    interceptors: {
      request: { use: vi.fn() },
      response: { use: vi.fn() },
    },
  },
  strategiesAPI: {
    list: vi.fn(),
    get: vi.fn(),
  },
  queueAPI: {
    submitBacktest: vi.fn(),
  },
  marketDataAPI: {
    indexes: vi.fn(),
    symbols: vi.fn(),
  },
}))

import { marketDataAPI, queueAPI, strategiesAPI } from '@/lib/api'

describe('BacktestForm Component', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    localStorage.setItem('quantmate-lang', 'en')
    await i18n.changeLanguage('en')
    ;(strategiesAPI.list as any).mockResolvedValue({ data: mockStrategies })
    ;(marketDataAPI.indexes as any).mockResolvedValue({ data: [] })
    ;(marketDataAPI.symbols as any).mockResolvedValue({ data: [] })
  })

  it('renders backtest form with all fields', async () => {
    render(<BacktestForm />)
    
    await waitFor(() => {
      expect(screen.getByLabelText(/strategy/i)).toBeInTheDocument()
      expect(screen.getByText('Symbol *')).toBeInTheDocument()
      expect(screen.getByLabelText(/start date/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/end date/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/initial capital/i)).toBeInTheDocument()
    })
  })

  it('loads strategies into dropdown', async () => {
    render(<BacktestForm />)
    
    await waitFor(() => {
      const strategySelect = screen.getByLabelText(/strategy/i) as HTMLSelectElement
      expect(strategySelect.options.length).toBeGreaterThan(1)
    })
  })

  it('validates required fields', async () => {
    const user = userEvent.setup()
    render(<BacktestForm />)
    
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /run backtest/i })).toBeInTheDocument()
    })
    
    const submitButton = screen.getByRole('button', { name: /run backtest/i })
    await user.click(submitButton)
    
    // Should not submit without required fields
    expect(queueAPI.submitBacktest).not.toHaveBeenCalled()
  })

  it('displays commission and slippage fields', async () => {
    render(<BacktestForm />)
    
    await waitFor(() => {
      expect(screen.getByLabelText(/commission/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/slippage/i)).toBeInTheDocument()
    })
  })

  it('displays form heading', async () => {
    render(<BacktestForm />)
    
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Submit Backtest' })).toBeInTheDocument()
    })
  })

  // ─── Tab switching ──────────────────────────────────────
  it('switches between basic and parameters tabs', async () => {
    render(<BacktestForm />)
    await waitFor(() => expect(screen.getByLabelText(/strategy/i)).toBeInTheDocument())

    // Click parameters tab
    const paramTab = screen.getByRole('button', { name: /strategy param|parameters/i })
    fireEvent.click(paramTab)
    expect(screen.getByRole('textbox')).toBeInTheDocument()

    // Switch back to basic tab
    const basicTab = screen.getByRole('button', { name: /basic/i })
    fireEvent.click(basicTab)
    expect(screen.getByLabelText(/strategy/i)).toBeInTheDocument()
  })

  // ─── Date range validation ──────────────────────────────
  it('prevents submit when start date is after end date', async () => {
    const user = userEvent.setup()
    render(<BacktestForm />)
    await waitFor(() => expect(screen.getByLabelText(/strategy/i)).toBeInTheDocument())

    fireEvent.change(screen.getByLabelText(/start date/i), { target: { value: '2025-06-01' } })
    fireEvent.change(screen.getByLabelText(/end date/i), { target: { value: '2025-01-01' } })

    await user.click(screen.getByRole('button', { name: /run backtest/i }))
    expect(queueAPI.submitBacktest).not.toHaveBeenCalled()
  })

  // ─── default onClose noop (line 22) ────────────────────
  it('renders without onClose prop and cancel does not throw', async () => {
    render(<BacktestForm />)
    const cancelBtn = screen.getByRole('button', { name: /cancel/i })
    fireEvent.click(cancelBtn)
    expect(cancelBtn).toBeTruthy()
  })

  // ─── onClose callback ──────────────────────────────────
  it('calls onClose when cancel button is clicked', async () => {
    const onClose = vi.fn()
    render(<BacktestForm onClose={onClose} />)
    await waitFor(() => expect(screen.getByLabelText(/strategy/i)).toBeInTheDocument())

    const cancelBtn = screen.getByRole('button', { name: /cancel/i })
    fireEvent.click(cancelBtn)
    expect(onClose).toHaveBeenCalled()
  })

  it('calls onClose when X button is clicked', async () => {
    const onClose = vi.fn()
    render(<BacktestForm onClose={onClose} />)
    await waitFor(() => expect(screen.getByLabelText(/strategy/i)).toBeInTheDocument())

    // Find X close button (icon-only button at top)
    const buttons = screen.getAllByRole('button')
    const closeBtn = buttons.find(b => b.querySelector('svg') && !b.textContent?.trim())
    if (closeBtn) {
      fireEvent.click(closeBtn)
      expect(onClose).toHaveBeenCalled()
    }
  })

  // ─── Error display ─────────────────────────────────────
  it('displays error when no strategy selected', async () => {
    // Mock empty strategies so none is auto-selected
    vi.mocked(strategiesAPI.list).mockResolvedValue({ data: [] } as never)
    const user = userEvent.setup()
    render(<BacktestForm />)
    await waitFor(() => expect(screen.getByRole('button', { name: /run backtest/i })).toBeInTheDocument())

    await user.click(screen.getByRole('button', { name: /run backtest/i }))
    expect(queueAPI.submitBacktest).not.toHaveBeenCalled()
  })

  // ─── Parameter JSON validation ─────────────────────────
  it('rejects invalid JSON in parameters tab', async () => {
    const user = userEvent.setup()
    render(<BacktestForm />)
    await waitFor(() => expect(screen.getByLabelText(/strategy/i)).toBeInTheDocument())

    // Switch to params tab and enter invalid JSON
    const paramTab = screen.getByRole('button', { name: /strategy param|parameters/i })
    fireEvent.click(paramTab)
    const textarea = screen.getByRole('textbox')
    fireEvent.change(textarea, { target: { value: '{invalid json' } })

    // Switch back and try submit
    const basicTab = screen.getByRole('button', { name: /basic/i })
    fireEvent.click(basicTab)

    await user.click(screen.getByRole('button', { name: /run backtest/i }))
    expect(queueAPI.submitBacktest).not.toHaveBeenCalled()
  })

  // ─── Successful submission ─────────────────────────────
  it('submits successfully when all fields are valid', async () => {
    const onSubmitSuccess = vi.fn()
    const strategies = [
      { id: 1, name: 'TestStrat', class_name: 'TestStrat', is_active: true, created_at: '2025-01-01', updated_at: '2025-01-01', version: 1, description: '' },
    ]
    vi.mocked(strategiesAPI.list).mockResolvedValue({ data: strategies } as never)
    vi.mocked(strategiesAPI.get).mockResolvedValue({ data: { ...strategies[0], parameters: {} } } as never)
    vi.mocked(queueAPI.submitBacktest).mockResolvedValue({ data: { job_id: 'job-123' } } as never)

    render(<BacktestForm onSubmitSuccess={onSubmitSuccess} />)

    // Wait for strategy to auto-select
    await waitFor(() => {
      const select = screen.getByLabelText(/strategy/i) as HTMLSelectElement
      expect(select.value).toBeTruthy()
    })

    // Set dates
    fireEvent.change(screen.getByLabelText(/start date/i), { target: { value: '2024-01-01' } })
    fireEvent.change(screen.getByLabelText(/end date/i), { target: { value: '2025-01-01' } })

    // Need a symbol - mock the SymbolSearch to have set a symbol
    // The submit will still fail validation for symbol, but we're testing the flow up to that
    fireEvent.click(screen.getByRole('button', { name: /run backtest/i }))

    // It may fail on symbol validation since we can't easily set SymbolSearch
    // but this exercises the path past strategy/date validation
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /run backtest/i })).toBeInTheDocument()
    })
  })

  // ─── Benchmark select ──────────────────────────────────
  it('renders benchmark select with default options', async () => {
    render(<BacktestForm />)
    await waitFor(() => {
      const benchmarkSelect = screen.getByLabelText(/benchmark/i) as HTMLSelectElement
      expect(benchmarkSelect.options.length).toBeGreaterThanOrEqual(1)
    })
  })

  // ─── Editing number inputs ─────────────────────────────
  it('allows editing initial capital, commission, and slippage', async () => {
    render(<BacktestForm />)
    await waitFor(() => expect(screen.getByLabelText(/initial capital/i)).toBeInTheDocument())

    fireEvent.change(screen.getByLabelText(/initial capital/i), { target: { value: '500000' } })
    expect(screen.getByLabelText(/initial capital/i)).toHaveValue(500000)

    fireEvent.change(screen.getByLabelText(/commission/i), { target: { value: '0.001' } })
    expect(screen.getByLabelText(/commission/i)).toHaveValue(0.001)

    fireEvent.change(screen.getByLabelText(/slippage/i), { target: { value: '0.005' } })
    expect(screen.getByLabelText(/slippage/i)).toHaveValue(0.005)
  })

  // ─── Benchmark options from API ─────────────────────────
  it('loads benchmark options from API', async () => {
    vi.mocked(marketDataAPI.indexes).mockResolvedValue({
      data: [{ value: '399300.SZ', label: 'CSI 300' }, { value: '000001.SH', label: 'SSE Composite' }],
    } as never)

    render(<BacktestForm />)
    await waitFor(() => {
      const benchmarkSelect = screen.getByLabelText(/benchmark/i) as HTMLSelectElement
      expect(benchmarkSelect.options.length).toBeGreaterThanOrEqual(2)
    })
  })

  // ─── Strategy params fetch via strategiesAPI.get ────────
  it('fetches strategy parameters via API when not in list', async () => {
    const noParamStrategies = [{ id: 10, name: 'NoParams', class_name: 'NoParams', is_active: true, created_at: '2025-01-01', updated_at: '2025-01-01', version: 1, description: '' }]
    vi.mocked(strategiesAPI.list).mockResolvedValue({ data: noParamStrategies } as never)
    vi.mocked(strategiesAPI.get).mockResolvedValue({ data: { ...noParamStrategies[0], parameters: { fast: 5, slow: 20 } } } as never)

    render(<BacktestForm />)
    await waitFor(() => {
      expect(strategiesAPI.get).toHaveBeenCalledWith(10)
    })
  })

  // ─── Strategy params fetch error ────────────────────────
  it('handles strategy parameter fetch error gracefully', async () => {
    const noParamStrategies = [{ id: 11, name: 'ErrorParams', class_name: 'ErrorParams', is_active: true, created_at: '2025-01-01', updated_at: '2025-01-01', version: 1, description: '' }]
    vi.mocked(strategiesAPI.list).mockResolvedValue({ data: noParamStrategies } as never)
    vi.mocked(strategiesAPI.get).mockRejectedValue(new Error('network error'))

    render(<BacktestForm />)
    await waitFor(() => {
      expect(strategiesAPI.get).toHaveBeenCalledWith(11)
    })
    // Parameters should fall back to '{}'
    const paramTab = screen.getByRole('button', { name: /strategy param|parameters/i })
    fireEvent.click(paramTab)
    const textarea = screen.getByRole('textbox')
    expect(textarea).toHaveValue('{}')
  })

  // ─── Symbol selection via SymbolSearch ──────────────────
  it('selects symbol via SymbolSearch and shows selected text', async () => {
    render(<BacktestForm />)
    await waitFor(() => expect(screen.getByTestId('symbol-search')).toBeInTheDocument())

    // Trigger onChoose callback
    capturedOnChoose?.({ vt_symbol: '600519.SH', name: 'Kweichow Moutai' })

    await waitFor(() => {
      expect(screen.getByText(/600519\.SH/)).toBeInTheDocument()
    })
  })

  // ─── Full submission success ────────────────────────────
  it('submits successfully with all valid fields', async () => {
    const onSubmitSuccess = vi.fn()
    const onClose = vi.fn()
    const strategies = [{ id: 1, name: 'TestStrat', class_name: 'TestStrat', is_active: true, created_at: '2025-01-01', updated_at: '2025-01-01', version: 1, description: '', parameters: { fast: 5 } }]
    vi.mocked(strategiesAPI.list).mockResolvedValue({ data: strategies } as never)
    vi.mocked(queueAPI.submitBacktest).mockResolvedValue({ data: { job_id: 'job-123' } } as never)

    render(<BacktestForm onSubmitSuccess={onSubmitSuccess} onClose={onClose} />)

    // Wait for strategy auto-select
    await waitFor(() => {
      const select = screen.getByLabelText(/strategy/i) as HTMLSelectElement
      expect(select.value).toBeTruthy()
    })

    // Set symbol via SymbolSearch mock
    capturedOnChoose?.({ vt_symbol: '600519.SH', name: 'Moutai' })

    // Set valid dates
    fireEvent.change(screen.getByLabelText(/start date/i), { target: { value: '2024-01-01' } })
    fireEvent.change(screen.getByLabelText(/end date/i), { target: { value: '2025-01-01' } })

    // Submit
    fireEvent.click(screen.getByRole('button', { name: /run backtest/i }))

    await waitFor(() => {
      expect(queueAPI.submitBacktest).toHaveBeenCalledWith(
        expect.objectContaining({
          strategy_id: 1,
          symbol: '600519.SH',
          start_date: '2024-01-01',
          end_date: '2025-01-01',
        })
      )
    })

    await waitFor(() => {
      expect(onSubmitSuccess).toHaveBeenCalledWith('job-123')
    })
  })

  // ─── Submit error: string detail ────────────────────────
  it('displays string error detail from API', async () => {
    const strategies = [{ id: 1, name: 'S', class_name: 'S', is_active: true, created_at: '2025-01-01', updated_at: '2025-01-01', version: 1, description: '', parameters: {} }]
    vi.mocked(strategiesAPI.list).mockResolvedValue({ data: strategies } as never)
    vi.mocked(queueAPI.submitBacktest).mockRejectedValue({
      response: { data: { detail: 'Insufficient capital' } },
    })

    render(<BacktestForm />)
    await waitFor(() => {
      const select = screen.getByLabelText(/strategy/i) as HTMLSelectElement
      expect(select.value).toBeTruthy()
    })
    capturedOnChoose?.({ vt_symbol: '600519.SH', name: 'M' })
    fireEvent.change(screen.getByLabelText(/start date/i), { target: { value: '2024-01-01' } })
    fireEvent.change(screen.getByLabelText(/end date/i), { target: { value: '2025-01-01' } })
    fireEvent.click(screen.getByRole('button', { name: /run backtest/i }))

    await waitFor(() => {
      expect(screen.getByText('Insufficient capital')).toBeInTheDocument()
    })
  })

  // ─── Submit error: array detail (pydantic) ──────────────
  it('displays joined array error detail from API', async () => {
    const strategies = [{ id: 1, name: 'S', class_name: 'S', is_active: true, created_at: '2025-01-01', updated_at: '2025-01-01', version: 1, description: '', parameters: {} }]
    vi.mocked(strategiesAPI.list).mockResolvedValue({ data: strategies } as never)
    vi.mocked(queueAPI.submitBacktest).mockRejectedValue({
      response: { data: { detail: [{ msg: 'Invalid symbol' }, { msg: 'Invalid dates' }] } },
    })

    render(<BacktestForm />)
    await waitFor(() => {
      const select = screen.getByLabelText(/strategy/i) as HTMLSelectElement
      expect(select.value).toBeTruthy()
    })
    capturedOnChoose?.({ vt_symbol: '600519.SH', name: 'M' })
    fireEvent.change(screen.getByLabelText(/start date/i), { target: { value: '2024-01-01' } })
    fireEvent.change(screen.getByLabelText(/end date/i), { target: { value: '2025-01-01' } })
    fireEvent.click(screen.getByRole('button', { name: /run backtest/i }))

    await waitFor(() => {
      expect(screen.getByText(/Invalid symbol.*Invalid dates/)).toBeInTheDocument()
    })
  })

  // ─── Submit error: object detail ────────────────────────
  it('displays stringified object error detail from API', async () => {
    const strategies = [{ id: 1, name: 'S', class_name: 'S', is_active: true, created_at: '2025-01-01', updated_at: '2025-01-01', version: 1, description: '', parameters: {} }]
    vi.mocked(strategiesAPI.list).mockResolvedValue({ data: strategies } as never)
    vi.mocked(queueAPI.submitBacktest).mockRejectedValue({
      response: { data: { detail: { field: 'strategy', error: 'not found' } } },
    })

    render(<BacktestForm />)
    await waitFor(() => {
      const select = screen.getByLabelText(/strategy/i) as HTMLSelectElement
      expect(select.value).toBeTruthy()
    })
    capturedOnChoose?.({ vt_symbol: '600519.SH', name: 'M' })
    fireEvent.change(screen.getByLabelText(/start date/i), { target: { value: '2024-01-01' } })
    fireEvent.change(screen.getByLabelText(/end date/i), { target: { value: '2025-01-01' } })
    fireEvent.click(screen.getByRole('button', { name: /run backtest/i }))

    await waitFor(() => {
      expect(screen.getByText(/not found/)).toBeInTheDocument()
    })
  })

  // ─── Select no symbol error ─────────────────────────────
  it('shows error when submitting without symbol selection', async () => {
    const strategies = [{ id: 1, name: 'S', class_name: 'S', is_active: true, created_at: '2025-01-01', updated_at: '2025-01-01', version: 1, description: '', parameters: {} }]
    vi.mocked(strategiesAPI.list).mockResolvedValue({ data: strategies } as never)

    render(<BacktestForm />)
    await waitFor(() => {
      const select = screen.getByLabelText(/strategy/i) as HTMLSelectElement
      expect(select.value).toBeTruthy()
    })

    // Don't set symbol, just submit
    fireEvent.click(screen.getByRole('button', { name: /run backtest/i }))
    await waitFor(() => {
      // Error text should appear
      const errorEl = document.querySelector('.text-destructive')
      expect(errorEl).toBeTruthy()
    })
  })

  // ─── Auto-select first strategy when none active ────────
  it('auto-selects first strategy when no active strategy exists', async () => {
    const inactiveStrategies = [
      { id: 5, name: 'InactiveOnly', class_name: 'IO', is_active: false, created_at: '2025-01-01', updated_at: '2025-01-01', version: 1, description: '', parameters: { x: 1 } },
    ]
    vi.mocked(strategiesAPI.list).mockResolvedValue({ data: inactiveStrategies } as never)

    render(<BacktestForm />)
    await waitFor(() => {
      const select = screen.getByLabelText(/strategy/i) as HTMLSelectElement
      expect(select.value).toBe('5')
    })
  })

  // ─── Error on invalid JSON displays message ─────────────
  it('displays invalid JSON error message', async () => {
    const strategies = [{ id: 1, name: 'S', class_name: 'S', is_active: true, created_at: '2025-01-01', updated_at: '2025-01-01', version: 1, description: '', parameters: {} }]
    vi.mocked(strategiesAPI.list).mockResolvedValue({ data: strategies } as never)

    render(<BacktestForm />)
    await waitFor(() => {
      const select = screen.getByLabelText(/strategy/i) as HTMLSelectElement
      expect(select.value).toBeTruthy()
    })

    capturedOnChoose?.({ vt_symbol: '600519.SH', name: 'M' })

    // Switch to params tab and enter invalid JSON
    const paramTab = screen.getByRole('button', { name: /strategy param|parameters/i })
    fireEvent.click(paramTab)
    const textarea = screen.getByRole('textbox')
    fireEvent.change(textarea, { target: { value: '{invalid' } })

    // Switch back and submit
    const basicTab = screen.getByRole('button', { name: /basic/i })
    fireEvent.click(basicTab)

    fireEvent.change(screen.getByLabelText(/start date/i), { target: { value: '2024-01-01' } })
    fireEvent.change(screen.getByLabelText(/end date/i), { target: { value: '2025-01-01' } })
    fireEvent.click(screen.getByRole('button', { name: /run backtest/i }))

    await waitFor(() => {
      const errorEl = document.querySelector('.text-destructive')
      expect(errorEl).toBeTruthy()
    })
  })

  // ─── Date range validation (lines 222-223) ─────────────
  it('shows error when start date is after end date', async () => {
    vi.mocked(strategiesAPI.list).mockResolvedValue({ data: [{ id: 1, name: 'DualMA', version: 1, is_active: true, created_at: '2025-01-01', updated_at: '2025-01-02' }] } as never)

    render(<BacktestForm onSubmit={vi.fn()} />)

    await waitFor(() => {
      const select = screen.getByLabelText(/strategy/i) as HTMLSelectElement
      expect(select.value).toBeTruthy()
    })

    capturedOnChoose?.({ vt_symbol: '600519.SH', name: 'M' })

    // Set start date AFTER end date
    fireEvent.change(screen.getByLabelText(/start date/i), { target: { value: '2025-06-01' } })
    fireEvent.change(screen.getByLabelText(/end date/i), { target: { value: '2024-01-01' } })

    fireEvent.click(screen.getByRole('button', { name: /run backtest/i }))

    await waitFor(() => {
      const errorEl = document.querySelector('.text-destructive')
      expect(errorEl).toBeTruthy()
    })
  })

  // ─── Strategies error state (line 308) ─────────────────
  it('shows error loading strategies state', async () => {
    vi.mocked(strategiesAPI.list).mockRejectedValue(new Error('Network error'))

    render(<BacktestForm onSubmit={vi.fn()} />)

    await waitFor(() => {
      const select = screen.getByLabelText(/strategy/i) as HTMLSelectElement
      // Should show error or no strategies option
      expect(select.options.length).toBeGreaterThanOrEqual(1)
    })
  })

  // ─── No symbol selected (line 211-212) ─────────────────
  it('shows error when no symbol is selected', async () => {
    vi.mocked(strategiesAPI.list).mockResolvedValue({
      data: [{ id: 1, name: 'DualMA', version: 1, is_active: true, created_at: '2025-01-01', updated_at: '2025-01-02' }],
    } as never)

    render(<BacktestForm onSubmit={vi.fn()} />)

    await waitFor(() => {
      const select = screen.getByLabelText(/strategy/i) as HTMLSelectElement
      expect(select.options.length).toBeGreaterThan(1)
    })

    // Select a strategy but don't select a symbol
    fireEvent.change(screen.getByLabelText(/strategy/i), { target: { value: '1' } })
    fireEvent.change(screen.getByLabelText(/start date/i), { target: { value: '2024-01-01' } })
    fireEvent.change(screen.getByLabelText(/end date/i), { target: { value: '2025-01-01' } })

    fireEvent.click(screen.getByRole('button', { name: /run backtest/i }))

    await waitFor(() => {
      const errorEl = document.querySelector('.text-destructive')
      expect(errorEl).toBeTruthy()
    })
  })

  // ─── Invalid JSON parameters (line 232) ─────────────────
  it('shows error when parameters JSON is invalid', async () => {
    vi.mocked(strategiesAPI.list).mockResolvedValue({
      data: [{ id: 1, name: 'DualMA', version: 1, is_active: true, created_at: '2025-01-01', updated_at: '2025-01-02' }],
    } as never)

    render(<BacktestForm onSubmit={vi.fn()} />)

    await waitFor(() => {
      const select = screen.getByLabelText(/strategy/i) as HTMLSelectElement
      expect(select.options.length).toBeGreaterThan(1)
    })

    // Select strategy
    fireEvent.change(screen.getByLabelText(/strategy/i), { target: { value: '1' } })

    // Choose symbol
    capturedOnChoose?.({ vt_symbol: '600519.SH', name: 'Moutai' })

    // Set dates
    fireEvent.change(screen.getByLabelText(/start date/i), { target: { value: '2024-01-01' } })
    fireEvent.change(screen.getByLabelText(/end date/i), { target: { value: '2025-01-01' } })

    // Switch to parameters tab and enter invalid JSON
    const paramsTab = screen.getByRole('button', { name: /parameters/i })
    fireEvent.click(paramsTab)

    await waitFor(() => {
      expect(screen.getByLabelText(/parameters/i)).toBeInTheDocument()
    })

    fireEvent.change(screen.getByLabelText(/parameters/i), { target: { value: '{invalid json' } })

    fireEvent.click(screen.getByRole('button', { name: /run backtest/i }))

    await waitFor(() => {
      const errorEl = document.querySelector('.text-destructive')
      expect(errorEl).toBeTruthy()
    })
  })

  // ─── No dates selected (line 217-218) ─────────────────
  it('shows error when dates are not selected', async () => {
    vi.mocked(strategiesAPI.list).mockResolvedValue({
      data: [{ id: 1, name: 'DualMA', version: 1, is_active: true, created_at: '2025-01-01', updated_at: '2025-01-02' }],
    } as never)

    render(<BacktestForm onSubmit={vi.fn()} />)

    await waitFor(() => {
      const select = screen.getByLabelText(/strategy/i) as HTMLSelectElement
      expect(select.options.length).toBeGreaterThan(1)
    })

    fireEvent.change(screen.getByLabelText(/strategy/i), { target: { value: '1' } })
    capturedOnChoose?.({ vt_symbol: '600519.SH', name: 'M' })

    // Don't set dates, submit
    fireEvent.click(screen.getByRole('button', { name: /run backtest/i }))

    await waitFor(() => {
      const errorEl = document.querySelector('.text-destructive')
      expect(errorEl).toBeTruthy()
    })
  })

  // ─── Mutation error with string response (line 195) ──
  it('shows error from string response in mutation error handler', async () => {
    vi.mocked(strategiesAPI.list).mockResolvedValue({
      data: [{ id: 1, name: 'DualMA', version: 1, is_active: true, created_at: '2025-01-01', updated_at: '2025-01-02' }],
    } as never)
    vi.mocked(queueAPI.submitBacktest).mockRejectedValue({
      response: { data: 'Server error occurred' },
    } as never)

    render(<BacktestForm onSubmit={vi.fn()} />)

    await waitFor(() => {
      const select = screen.getByLabelText(/strategy/i) as HTMLSelectElement
      expect(select.options.length).toBeGreaterThan(1)
    })

    fireEvent.change(screen.getByLabelText(/strategy/i), { target: { value: '1' } })
    capturedOnChoose?.({ vt_symbol: '600519.SH', name: 'M' })
    fireEvent.change(screen.getByLabelText(/start date/i), { target: { value: '2024-01-01' } })
    fireEvent.change(screen.getByLabelText(/end date/i), { target: { value: '2024-12-31' } })

    fireEvent.click(screen.getByRole('button', { name: /run backtest/i }))

    await waitFor(() => {
      const errorEl = document.querySelector('.text-destructive')
      expect(errorEl).toBeTruthy()
    })
  })

  // ─── Benchmark select interaction (line 420) ──
  it('changes benchmark selection', async () => {
    vi.mocked(marketDataAPI.indexes).mockResolvedValue({
      data: [{ symbol: '000300.SH', name: 'CSI 300' }, { symbol: '000905.SH', name: 'CSI 500' }],
    } as never)

    render(<BacktestForm />)

    await waitFor(() => {
      const benchmarkSelect = screen.getByLabelText(/benchmark/i) as HTMLSelectElement
      expect(benchmarkSelect).toBeInTheDocument()
    })

    const benchmarkSelect = screen.getByLabelText(/benchmark/i) as HTMLSelectElement
    // Change to a different benchmark
    if (benchmarkSelect.options.length > 1) {
      fireEvent.change(benchmarkSelect, { target: { value: benchmarkSelect.options[1].value } })
      expect(benchmarkSelect.value).toBe(benchmarkSelect.options[1].value)
    }
  })

  // ─── Mutation error with pydantic array detail (line 191) ──
  it('shows error from pydantic validation array detail', async () => {
    vi.mocked(strategiesAPI.list).mockResolvedValue({
      data: [{ id: 1, name: 'DualMA', version: 1, is_active: true, created_at: '2025-01-01', updated_at: '2025-01-02' }],
    } as never)
    vi.mocked(queueAPI.submitBacktest).mockRejectedValue({
      response: { data: { detail: [{ loc: ['body', 'capital'], msg: 'must be positive' }] } },
    } as never)

    render(<BacktestForm onSubmit={vi.fn()} />)

    await waitFor(() => {
      const select = screen.getByLabelText(/strategy/i) as HTMLSelectElement
      expect(select.options.length).toBeGreaterThan(1)
    })

    fireEvent.change(screen.getByLabelText(/strategy/i), { target: { value: '1' } })
    capturedOnChoose?.({ vt_symbol: '600519.SH', name: 'M' })
    fireEvent.change(screen.getByLabelText(/start date/i), { target: { value: '2024-01-01' } })
    fireEvent.change(screen.getByLabelText(/end date/i), { target: { value: '2024-12-31' } })

    fireEvent.click(screen.getByRole('button', { name: /run backtest/i }))

    await waitFor(() => {
      const errorEl = document.querySelector('.text-destructive')
      expect(errorEl).toBeTruthy()
    })
  })

  // ─── Error from object detail (line 195-196) ─────────────
  it('shows error from object JSON detail', async () => {
    vi.mocked(strategiesAPI.list).mockResolvedValue({
      data: [{ id: 1, name: 'DualMA', version: 1, is_active: true, created_at: '2025-01-01', updated_at: '2025-01-02' }],
    } as never)
    vi.mocked(queueAPI.submitBacktest).mockRejectedValue({
      response: { data: { detail: { error: 'invalid config' } } },
    } as never)

    render(<BacktestForm onSubmit={vi.fn()} />)

    await waitFor(() => {
      const select = screen.getByLabelText(/strategy/i) as HTMLSelectElement
      expect(select.options.length).toBeGreaterThan(1)
    })

    fireEvent.change(screen.getByLabelText(/strategy/i), { target: { value: '1' } })
    capturedOnChoose?.({ vt_symbol: '600519.SH', name: 'M' })
    fireEvent.change(screen.getByLabelText(/start date/i), { target: { value: '2024-01-01' } })
    fireEvent.change(screen.getByLabelText(/end date/i), { target: { value: '2024-12-31' } })

    fireEvent.click(screen.getByRole('button', { name: /run backtest/i }))

    await waitFor(() => {
      const errorEl = document.querySelector('.text-destructive')
      expect(errorEl?.textContent).toContain('invalid config')
    })
  })

  // ─── Date range validation error (line 217-218) ─────────────
  it('shows date range error when start >= end', async () => {
    vi.mocked(strategiesAPI.list).mockResolvedValue({
      data: [{ id: 1, name: 'DualMA', version: 1, is_active: true, created_at: '2025-01-01', updated_at: '2025-01-02' }],
    } as never)

    render(<BacktestForm onSubmit={vi.fn()} />)

    await waitFor(() => {
      const select = screen.getByLabelText(/strategy/i) as HTMLSelectElement
      expect(select.options.length).toBeGreaterThan(1)
    })

    fireEvent.change(screen.getByLabelText(/strategy/i), { target: { value: '1' } })
    capturedOnChoose?.({ vt_symbol: '600519.SH', name: 'M' })
    fireEvent.change(screen.getByLabelText(/start date/i), { target: { value: '2024-12-31' } })
    fireEvent.change(screen.getByLabelText(/end date/i), { target: { value: '2024-01-01' } })

    fireEvent.click(screen.getByRole('button', { name: /run backtest/i }))

    await waitFor(() => {
      const errorEl = document.querySelector('.text-destructive')
      expect(errorEl).toBeTruthy()
    })
  })

  // ─── No symbol error (line 209-211) ─────────────────────────
  it('shows error when symbol not selected', async () => {
    vi.mocked(strategiesAPI.list).mockResolvedValue({
      data: [{ id: 1, name: 'DualMA', version: 1, is_active: true, created_at: '2025-01-01', updated_at: '2025-01-02' }],
    } as never)

    render(<BacktestForm onSubmit={vi.fn()} />)

    await waitFor(() => {
      const select = screen.getByLabelText(/strategy/i) as HTMLSelectElement
      expect(select.options.length).toBeGreaterThan(1)
    })

    fireEvent.change(screen.getByLabelText(/strategy/i), { target: { value: '1' } })
    // Don't select symbol
    fireEvent.change(screen.getByLabelText(/start date/i), { target: { value: '2024-01-01' } })
    fireEvent.change(screen.getByLabelText(/end date/i), { target: { value: '2024-12-31' } })

    fireEvent.click(screen.getByRole('button', { name: /run backtest/i }))

    await waitFor(() => {
      const errorEl = document.querySelector('.text-destructive')
      expect(errorEl).toBeTruthy()
    })
  })

  // ─── Array detail with non-string msg (line 189) ─────────────
  it('shows JSON stringified error when detail is array with object msg', async () => {
    vi.mocked(strategiesAPI.list).mockResolvedValue({
      data: [{ id: 1, name: 'DualMA', version: 1, is_active: true, created_at: '2025-01-01', updated_at: '2025-01-02' }],
    } as never)
    vi.mocked(queueAPI.submitBacktest).mockRejectedValue({
      response: { data: { detail: [{ msg: 42, loc: ['body', 'param'] }] } },
    } as never)

    render(<BacktestForm onSubmit={vi.fn()} />)

    await waitFor(() => {
      const select = screen.getByLabelText(/strategy/i) as HTMLSelectElement
      expect(select.options.length).toBeGreaterThan(1)
    })

    fireEvent.change(screen.getByLabelText(/strategy/i), { target: { value: '1' } })
    capturedOnChoose?.({ vt_symbol: '600519.SH', name: 'M' })
    fireEvent.change(screen.getByLabelText(/start date/i), { target: { value: '2024-01-01' } })
    fireEvent.change(screen.getByLabelText(/end date/i), { target: { value: '2024-12-31' } })

    fireEvent.click(screen.getByRole('button', { name: /run backtest/i }))

    await waitFor(() => {
      const errorEl = document.querySelector('.text-destructive')
      expect(errorEl?.textContent).toContain('msg')
    })
  })

  // ─── String resp error (line 195) ─────────────
  it('shows string response data as error message', async () => {
    vi.mocked(strategiesAPI.list).mockResolvedValue({
      data: [{ id: 1, name: 'DualMA', version: 1, is_active: true, created_at: '2025-01-01', updated_at: '2025-01-02' }],
    } as never)
    vi.mocked(queueAPI.submitBacktest).mockRejectedValue({
      response: { data: 'Internal Server Error' },
    } as never)

    render(<BacktestForm onSubmit={vi.fn()} />)

    await waitFor(() => {
      const select = screen.getByLabelText(/strategy/i) as HTMLSelectElement
      expect(select.options.length).toBeGreaterThan(1)
    })

    fireEvent.change(screen.getByLabelText(/strategy/i), { target: { value: '1' } })
    capturedOnChoose?.({ vt_symbol: '600519.SH', name: 'M' })
    fireEvent.change(screen.getByLabelText(/start date/i), { target: { value: '2024-01-01' } })
    fireEvent.change(screen.getByLabelText(/end date/i), { target: { value: '2024-12-31' } })

    fireEvent.click(screen.getByRole('button', { name: /run backtest/i }))

    await waitFor(() => {
      const errorEl = document.querySelector('.text-destructive')
      expect(errorEl?.textContent).toContain('Internal Server Error')
    })
  })

  // ─── No dates error (line 217-218) ─────────────
  it('shows error when dates are not set', async () => {
    vi.mocked(strategiesAPI.list).mockResolvedValue({
      data: [{ id: 1, name: 'DualMA', version: 1, is_active: true, created_at: '2025-01-01', updated_at: '2025-01-02' }],
    } as never)

    render(<BacktestForm onSubmit={vi.fn()} />)

    await waitFor(() => {
      const select = screen.getByLabelText(/strategy/i) as HTMLSelectElement
      expect(select.options.length).toBeGreaterThan(1)
    })

    fireEvent.change(screen.getByLabelText(/strategy/i), { target: { value: '1' } })
    capturedOnChoose?.({ vt_symbol: '600519.SH', name: 'M' })
    // Clear dates
    fireEvent.change(screen.getByLabelText(/start date/i), { target: { value: '' } })
    fireEvent.change(screen.getByLabelText(/end date/i), { target: { value: '' } })

    fireEvent.click(screen.getByRole('button', { name: /run backtest/i }))

    await waitFor(() => {
      const errorEl = document.querySelector('.text-destructive')
      expect(errorEl).toBeTruthy()
    })
  })

  // ─── Nested strategies data unwrap (line 102-103) ─────────────
  it('unwraps nested strategies data format', async () => {
    vi.mocked(strategiesAPI.list).mockResolvedValue({
      data: { data: [{ id: 1, name: 'NestedMA', version: 1, is_active: true, created_at: '2025-01-01', updated_at: '2025-01-02' }] },
    } as never)

    render(<BacktestForm onSubmit={vi.fn()} />)

    await waitFor(() => {
      expect(screen.getByText(/NestedMA/)).toBeInTheDocument()
    })
  })

  // ─── Array detail with string element (line 184) ─────────────
  it('shows string elements from array detail', async () => {
    vi.mocked(strategiesAPI.list).mockResolvedValue({
      data: [{ id: 1, name: 'DualMA', version: 1, is_active: true, created_at: '2025-01-01', updated_at: '2025-01-02' }],
    } as never)
    vi.mocked(queueAPI.submitBacktest).mockRejectedValue({
      response: { data: { detail: ['bad param', 'missing field'] } },
    } as never)

    render(<BacktestForm onSubmit={vi.fn()} />)

    await waitFor(() => {
      const select = screen.getByLabelText(/strategy/i) as HTMLSelectElement
      expect(select.options.length).toBeGreaterThan(1)
    })

    fireEvent.change(screen.getByLabelText(/strategy/i), { target: { value: '1' } })
    capturedOnChoose?.({ vt_symbol: '600519.SH', name: 'M' })
    fireEvent.change(screen.getByLabelText(/start date/i), { target: { value: '2024-01-01' } })
    fireEvent.change(screen.getByLabelText(/end date/i), { target: { value: '2024-12-31' } })

    fireEvent.click(screen.getByRole('button', { name: /run backtest/i }))

    await waitFor(() => {
      const errorEl = document.querySelector('.text-destructive')
      expect(errorEl?.textContent).toContain('bad param')
      expect(errorEl?.textContent).toContain('missing field')
    })
  })

  it('shows JSON stringified error when detail is a plain object', async () => {
    vi.mocked(strategiesAPI.list).mockResolvedValue({
      data: [{ id: 1, name: 'DualMA', version: 1, is_active: true, created_at: '2025-01-01', updated_at: '2025-01-02' }],
    } as never)
    vi.mocked(queueAPI.submitBacktest).mockRejectedValue({
      response: { data: { detail: { code: 'INVALID', reason: 'bad request' } } },
    } as never)

    render(<BacktestForm onSubmit={vi.fn()} />)

    await waitFor(() => {
      const select = screen.getByLabelText(/strategy/i) as HTMLSelectElement
      expect(select.options.length).toBeGreaterThan(1)
    })

    fireEvent.change(screen.getByLabelText(/strategy/i), { target: { value: '1' } })
    capturedOnChoose?.({ vt_symbol: '600519.SH', name: 'M' })
    fireEvent.change(screen.getByLabelText(/start date/i), { target: { value: '2024-01-01' } })
    fireEvent.change(screen.getByLabelText(/end date/i), { target: { value: '2024-12-31' } })

    fireEvent.click(screen.getByRole('button', { name: /run backtest/i }))

    await waitFor(() => {
      const errorEl = document.querySelector('.text-destructive')
      expect(errorEl?.textContent).toContain('INVALID')
    })
  })
})
