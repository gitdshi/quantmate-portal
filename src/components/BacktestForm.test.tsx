import { userEvent } from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mockStrategies } from '../../test/mockData'
import { render, screen, waitFor } from '../../test/utils'
import BacktestForm from '../BacktestForm'

// Mock API
vi.mock('../../lib/api', () => ({
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
  },
  backtestAPI: {
    submit: vi.fn(),
  },
}))

import { backtestAPI, strategiesAPI } from '../../lib/api'

describe('BacktestForm Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    ;(strategiesAPI.list as any).mockResolvedValue({ data: mockStrategies })
  })

  it('renders backtest form with all fields', async () => {
    render(<BacktestForm />)
    
    await waitFor(() => {
      expect(screen.getByLabelText(/strategy/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/symbol/i)).toBeInTheDocument()
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
    
    const submitButton = screen.getByRole('button', { name: /run backtest/i })
    await user.click(submitButton)
    
    // Should not submit without required fields
    expect(backtestAPI.submit).not.toHaveBeenCalled()
  })

  it('submits backtest with valid data', async () => {
    const user = userEvent.setup()
    ;(backtestAPI.submit as any).mockResolvedValue({ 
      data: { job_id: 'test-job-123', status: 'queued' } 
    })
    
    render(<BacktestForm />)
    
    await waitFor(() => {
      expect(screen.getByLabelText(/strategy/i)).toBeInTheDocument()
    })
    
    // Fill form
    const strategySelect = screen.getByLabelText(/strategy/i)
    const symbolInput = screen.getByLabelText(/symbol/i)
    const startDateInput = screen.getByLabelText(/start date/i)
    const endDateInput = screen.getByLabelText(/end date/i)
    const capitalInput = screen.getByLabelText(/initial capital/i)
    
    await user.selectOptions(strategySelect, '1')
    await user.type(symbolInput, 'AAPL')
    await user.type(startDateInput, '2024-01-01')
    await user.type(endDateInput, '2024-12-31')
    await user.clear(capitalInput)
    await user.type(capitalInput, '100000')
    
    const submitButton = screen.getByRole('button', { name: /run backtest/i })
    await user.click(submitButton)
    
    await waitFor(() => {
      expect(backtestAPI.submit).toHaveBeenCalledWith(
        expect.objectContaining({
          strategy_id: 1,
          symbol: 'AAPL',
          start_date: '2024-01-01',
          end_date: '2024-12-31',
          initial_capital: 100000,
        })
      )
    })
  })

  it('displays commission and slippage fields', async () => {
    render(<BacktestForm />)
    
    await waitFor(() => {
      expect(screen.getByLabelText(/commission/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/slippage/i)).toBeInTheDocument()
    })
  })

  it('displays success message after submission', async () => {
    const user = userEvent.setup()
    ;(backtestAPI.submit as any).mockResolvedValue({ 
      data: { job_id: 'test-job-123', status: 'queued' } 
    })
    
    render(<BacktestForm />)
    
    await waitFor(() => {
      expect(screen.getByLabelText(/strategy/i)).toBeInTheDocument()
    })
    
    // Fill and submit form (simplified)
    const submitButton = screen.getByRole('button', { name: /run backtest/i })
    
    // Mock form validity
    const form = submitButton.closest('form')
    if (form) {
      vi.spyOn(form, 'checkValidity').mockReturnValue(true)
    }
    
    await user.click(submitButton)
    
    await waitFor(() => {
      expect(screen.getByText(/backtest submitted/i)).toBeInTheDocument()
    })
  })
})
