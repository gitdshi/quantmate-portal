import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@test/support/utils'
import i18n from '@/i18n'
import FactorLab from '@/pages/FactorLab'

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
  factorAPI: {
    list: vi.fn(),
    create: vi.fn(),
    listEvaluations: vi.fn(),
    runEvaluation: vi.fn(),
    runMining: vi.fn(),
  },
  strategiesAPI: {
    generateMultiFactorCode: vi.fn(),
    createMultiFactor: vi.fn(),
  },
}))

import { factorAPI } from '@/lib/api'

describe('FactorLab Page', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    localStorage.setItem('quantmate-lang', 'en')
    await i18n.changeLanguage('en')
    vi.mocked(factorAPI.list).mockResolvedValue({ data: [] } as never)
    vi.mocked(factorAPI.create).mockResolvedValue({ data: {} } as never)
  })

  it('renders heading', () => {
    render(<FactorLab />)
    expect(screen.getByText('Factor Lab')).toBeInTheDocument()
  })

  it('shows all 5 tabs', () => {
    render(<FactorLab />)
    expect(screen.getByRole('button', { name: 'Factor Library' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'IC/IR Analysis' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Factor Mining' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Factor Combine' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Factor Backtest' })).toBeInTheDocument()
  })

  it('shows new factor button', () => {
    render(<FactorLab />)
    expect(screen.getByText('New Factor')).toBeInTheDocument()
  })

  it('switches to IC/IR tab', () => {
    render(<FactorLab />)
    fireEvent.click(screen.getByRole('button', { name: 'IC/IR Analysis' }))
    expect(screen.getByText('Select a factor to view IC/IR analysis. No evaluation data yet.')).toBeInTheDocument()
  })

  it('switches to combine tab', () => {
    render(<FactorLab />)
    fireEvent.click(screen.getByRole('button', { name: 'Factor Combine' }))
    expect(screen.getByText('Add factors from the library to start combining.')).toBeInTheDocument()
  })

  it('switches to backtest tab', () => {
    render(<FactorLab />)
    fireEvent.click(screen.getByRole('button', { name: 'Factor Backtest' }))
    expect(screen.getByText('No factor backtest data available')).toBeInTheDocument()
  })

  it('switches to mining tab', () => {
    render(<FactorLab />)
    fireEvent.click(screen.getByRole('button', { name: 'Factor Mining' }))
    expect(screen.getByText('Run factor mining to discover high-quality factors from Qlib Alpha158.')).toBeInTheDocument()
  })
})
