import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@test/support/utils'
import FactorLab from '@/pages/FactorLab'

vi.mock('@/lib/api', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    interceptors: { request: { use: vi.fn() }, response: { use: vi.fn() } },
  },
  factorAPI: {
    list: vi.fn(),
    get: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    listEvaluations: vi.fn(),
    runEvaluation: vi.fn(),
    deleteEvaluation: vi.fn(),
  },
}))

import { factorAPI } from '@/lib/api'

const mockFactors = [
  { id: 1, user_id: 1, name: 'Value Factor', category: 'value', expression: 'PE_ratio / PB_ratio', description: 'Combined value factor', status: 'active', created_at: '2025-01-01T00:00:00Z', updated_at: '2025-01-01T00:00:00Z' },
  { id: 2, user_id: 1, name: 'Momentum Factor', category: 'momentum', expression: 'return_12m - return_1m', description: '', status: 'draft', created_at: '2025-01-02T00:00:00Z', updated_at: '2025-01-02T00:00:00Z' },
]

const mockEvaluations = [
  { id: 1, factor_id: 1, start_date: '2020-01-01', end_date: '2024-01-01', ic_mean: 0.05, ic_std: 0.02, ir: 2.5, long_short_return: 0.12, turnover: 0.3, created_at: '2025-01-01T00:00:00Z' },
]

describe('FactorLab Page', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    ;(factorAPI.list as any).mockResolvedValue({ data: { data: mockFactors } })
    ;(factorAPI.listEvaluations as any).mockResolvedValue({ data: mockEvaluations })
    ;(factorAPI.create as any).mockResolvedValue({ data: { id: 3 } })
    ;(factorAPI.runEvaluation as any).mockResolvedValue({ data: { id: 2 } })
    ;(factorAPI.delete as any).mockResolvedValue({})
  })

  it('renders heading', () => {
    render(<FactorLab />)
    expect(screen.getByTestId('factor-lab-page')).toBeInTheDocument()
    expect(screen.getByText('Factor Lab')).toBeInTheDocument()
  })

  it('shows factors after loading', async () => {
    render(<FactorLab />)
    await waitFor(() => {
      expect(screen.getByText('Value Factor')).toBeInTheDocument()
      expect(screen.getByText('Momentum Factor')).toBeInTheDocument()
    })
  })

  it('shows empty detail state', async () => {
    render(<FactorLab />)
    await waitFor(() => {
      expect(screen.getByText('Select a factor to view details')).toBeInTheDocument()
    })
  })

  it('selects a factor and shows evaluations', async () => {
    render(<FactorLab />)
    await waitFor(() => { screen.getByText('Value Factor') })
    fireEvent.click(screen.getByText('Value Factor'))
    await waitFor(() => {
      expect(screen.getByText('PE_ratio / PB_ratio')).toBeInTheDocument()
      expect(screen.getByText('2020-01-01 ~ 2024-01-01')).toBeInTheDocument()
    })
  })

  it('shows category filter', () => {
    render(<FactorLab />)
    expect(screen.getByText('All categories')).toBeInTheDocument()
  })

  it('has New Factor button', () => {
    render(<FactorLab />)
    expect(screen.getByText('New Factor')).toBeInTheDocument()
  })

  it('opens create modal', async () => {
    render(<FactorLab />)
    fireEvent.click(screen.getByText('New Factor'))
    await waitFor(() => {
      expect(screen.getByPlaceholderText('Factor name')).toBeInTheDocument()
    })
  })

  it('handles loading error', async () => {
    ;(factorAPI.list as any).mockRejectedValue(new Error('fail'))
    render(<FactorLab />)
    await waitFor(() => {
      expect(screen.getByText('Failed to load factors')).toBeInTheDocument()
    })
  })

  it('shows factor count in header', async () => {
    render(<FactorLab />)
    await waitFor(() => {
      expect(screen.getByText('Factors (2)')).toBeInTheDocument()
    })
  })
})


