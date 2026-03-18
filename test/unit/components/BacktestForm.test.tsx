import { userEvent } from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mockStrategies } from '@test/support/mockData'
import { render, screen, waitFor } from '@test/support/utils'
import BacktestForm from '@/components/BacktestForm'

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
  beforeEach(() => {
    vi.clearAllMocks()
    ;(strategiesAPI.list as any).mockResolvedValue({ data: mockStrategies })
    ;(marketDataAPI.indexes as any).mockResolvedValue({ data: [] })
    ;(marketDataAPI.symbols as any).mockResolvedValue({ data: [] })
  })

  it('renders backtest form with all fields', async () => {
    render(<BacktestForm />)
    
    await waitFor(() => {
      expect(screen.getByLabelText(/strategy/i)).toBeInTheDocument()
      expect(screen.getByText(/symbol/i)).toBeInTheDocument()
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
      expect(screen.getByRole('button', { name: /submit backtest/i })).toBeInTheDocument()
    })
    
    const submitButton = screen.getByRole('button', { name: /submit backtest/i })
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
})


