import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@test/support/utils'
import VisualExplorer from '@/pages/VisualExplorer'

vi.mock('@/lib/api', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    interceptors: { request: { use: vi.fn() }, response: { use: vi.fn() } },
  },
  marketDataAPI: {
    history: vi.fn(),
    symbols: vi.fn(),
    indicators: vi.fn(),
    overview: vi.fn(),
    sectors: vi.fn(),
    exchanges: vi.fn(),
    symbolsByFilter: vi.fn(),
    indexes: vi.fn(),
  },
}))

import { marketDataAPI } from '@/lib/api'

const mockHistory = [
  { trade_date: '2023-01-03', close: '10.50', vol: '100000' },
  { trade_date: '2023-01-04', close: '10.80', vol: '120000' },
  { trade_date: '2023-01-05', close: '10.60', vol: '110000' },
  { trade_date: '2023-01-06', close: '11.00', vol: '130000' },
  { trade_date: '2023-01-09', close: '11.20', vol: '115000' },
]

describe('VisualExplorer Page', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    ;(marketDataAPI.history as any).mockResolvedValue({ data: { data: mockHistory } })
  })

  it('renders heading', () => {
    render(<VisualExplorer />)
    expect(screen.getByTestId('visual-explorer-page')).toBeInTheDocument()
    expect(screen.getByText('Visual Explorer')).toBeInTheDocument()
  })

  it('shows search controls', () => {
    render(<VisualExplorer />)
    expect(screen.getByPlaceholderText('e.g. 000001.SZ')).toBeInTheDocument()
    expect(screen.getByText('Load')).toBeInTheDocument()
  })

  it('shows empty state initially', () => {
    render(<VisualExplorer />)
    expect(screen.getByText('Enter a symbol and date range to explore market data')).toBeInTheDocument()
  })

  it('loads data on button click', async () => {
    render(<VisualExplorer />)
    const symbolInput = screen.getByPlaceholderText('e.g. 000001.SZ')
    fireEvent.change(symbolInput, { target: { value: '000001.SZ' } })
    fireEvent.click(screen.getByText('Load'))
    await waitFor(() => {
      expect(marketDataAPI.history).toHaveBeenCalledWith('000001.SZ', '2023-01-01', '2024-01-01')
    })
  })

  it('shows stats after loading data', async () => {
    render(<VisualExplorer />)
    const symbolInput = screen.getByPlaceholderText('e.g. 000001.SZ')
    fireEvent.change(symbolInput, { target: { value: '000001.SZ' } })
    fireEvent.click(screen.getByText('Load'))
    await waitFor(() => {
      expect(screen.getByText('Days')).toBeInTheDocument()
      expect(screen.getByText('5')).toBeInTheDocument()
    })
  })

  it('shows chart after loading data', async () => {
    render(<VisualExplorer />)
    const symbolInput = screen.getByPlaceholderText('e.g. 000001.SZ')
    fireEvent.change(symbolInput, { target: { value: '000001.SZ' } })
    fireEvent.click(screen.getByText('Load'))
    await waitFor(() => {
      expect(screen.getByText(/Price Chart/)).toBeInTheDocument()
    })
  })

  it('handles error when loading fails', async () => {
    ;(marketDataAPI.history as any).mockRejectedValue(new Error('fail'))
    render(<VisualExplorer />)
    const symbolInput = screen.getByPlaceholderText('e.g. 000001.SZ')
    fireEvent.change(symbolInput, { target: { value: '000001.SZ' } })
    fireEvent.click(screen.getByText('Load'))
    await waitFor(() => {
      expect(screen.getByText('Failed to load market data')).toBeInTheDocument()
    })
  })

  it('disables Load button when symbol is empty', () => {
    render(<VisualExplorer />)
    const loadBtn = screen.getByText('Load')
    expect(loadBtn).toBeDisabled()
  })
})


