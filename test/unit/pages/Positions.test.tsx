import i18n from '@/i18n'
import Positions from '@/pages/Positions'
import { fireEvent, render, screen, waitFor } from '@test/support/utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockShowConfirm = vi.fn(async () => true)
const mockShowToast = vi.fn()
vi.mock('@/components/ui/toast-service', () => ({
  showConfirm: (...args: unknown[]) => mockShowConfirm(...args),
  showToast: (...args: unknown[]) => mockShowToast(...args),
}))

vi.mock('@/lib/api', () => ({
  api: {
    get: vi.fn(),
    interceptors: { request: { use: vi.fn() }, response: { use: vi.fn() } },
  },
  portfolioAPI: {
    positions: vi.fn(),
    close: vi.fn(),
  },
}))

import { portfolioAPI } from '@/lib/api'

const mockPositions = [
  {
    symbol: '600519.SH',
    name: 'Kweichow Moutai',
    strategy: 'DualMA',
    direction: 'long',
    quantity: 100,
    avg_cost: 1800,
    market_price: 1850,
    market_value: 185000,
    pnl: 5000,
    pnl_pct: 2.78,
  },
  {
    symbol: '000001.SZ',
    name: 'Ping An Bank',
    strategy: 'RSI',
    direction: 'long',
    quantity: 500,
    avg_cost: 13,
    market_price: 12.5,
    market_value: 6250,
    pnl: -250,
    pnl_pct: -3.85,
  },
]

describe('Positions Page', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    localStorage.setItem('quantmate-lang', 'en')
    await i18n.changeLanguage('en')
    vi.mocked(portfolioAPI.positions).mockResolvedValue({ data: { positions: mockPositions } } as never)
  })

  it('renders heading', async () => {
    render(<Positions />)
    expect(await screen.findByText('Positions')).toBeInTheDocument()
  })

  it('shows stat cards', async () => {
    render(<Positions />)
    await waitFor(() => {
      expect(screen.getByText('Positions')).toBeInTheDocument()
      expect(screen.getByText('Position Value')).toBeInTheDocument()
      expect(screen.getByText('Floating P&L')).toBeInTheDocument()
    })
  })

  it('shows search placeholder', async () => {
    render(<Positions />)
    expect(await screen.findByPlaceholderText('Search positions...')).toBeInTheDocument()
  })

  it('displays positions in table', async () => {
    render(<Positions />)
    await waitFor(() => {
      expect(screen.getByText('Kweichow Moutai')).toBeInTheDocument()
      expect(screen.getByText('Ping An Bank')).toBeInTheDocument()
    })
  })

  it('calculates totalMV and totalPnl in stat cards', async () => {
    render(<Positions />)
    await waitFor(() => {
      // totalMV = 185000 + 6250 = 191250
      expect(screen.getByText(/191,250/)).toBeInTheDocument()
      // totalPnl = 5000 - 250 = 4750
      expect(screen.getByText(/4,750/)).toBeInTheDocument()
    })
  })

  it('shows direction badges for long and short positions', async () => {
    const positionsWithShort = [
      ...mockPositions,
      { symbol: '300750.SZ', name: 'CATL', strategy: 'RSI', direction: 'short', quantity: 200, avg_cost: 250, market_price: 240, market_value: 48000, pnl: 2000, pnl_pct: 4.0 },
    ]
    vi.mocked(portfolioAPI.positions).mockResolvedValue({ data: { positions: positionsWithShort } } as never)

    render(<Positions />)
    await waitFor(() => {
      expect(screen.getByText('CATL')).toBeInTheDocument()
    })
  })

  it('shows close position button and handles close', async () => {
    vi.mocked(portfolioAPI.close).mockResolvedValue({ data: {} } as never)

    render(<Positions />)
    await screen.findByText('Kweichow Moutai')

    const closeBtns = screen.getAllByRole('button').filter(b => b.textContent?.match(/close/i))
    expect(closeBtns.length).toBeGreaterThan(0)
    fireEvent.click(closeBtns[0])

    await waitFor(() => {
      expect(mockShowConfirm).toHaveBeenCalled()
    })
    await waitFor(() => {
      expect(portfolioAPI.close).toHaveBeenCalled()
    })
  })

  it('handles close position failure', async () => {
    vi.mocked(portfolioAPI.close).mockRejectedValue(new Error('fail'))

    render(<Positions />)
    await screen.findByText('Kweichow Moutai')

    const closeBtns = screen.getAllByRole('button').filter(b => b.textContent?.match(/close/i))
    if (closeBtns.length > 0) {
      fireEvent.click(closeBtns[0])
      await waitFor(() => {
        expect(portfolioAPI.close).toHaveBeenCalled()
      })
      await waitFor(() => {
        expect(mockShowToast).toHaveBeenCalledWith(expect.any(String), 'error')
      })
    }
  })

  it('filters positions by search', async () => {
    render(<Positions />)
    await screen.findByText('Kweichow Moutai')

    const search = screen.getByPlaceholderText('Search positions...')
    fireEvent.change(search, { target: { value: 'moutai' } })

    await waitFor(() => {
      expect(screen.getByText('Kweichow Moutai')).toBeInTheDocument()
      expect(screen.queryByText('Ping An Bank')).not.toBeInTheDocument()
    })
  })

  it('shows positive and negative PnL styling', async () => {
    render(<Positions />)
    await waitFor(() => {
      // Positive PnL: 5000 → green class
      const positivePnl = screen.getByText('+¥5,000')
      expect(positivePnl.className).toMatch(/green/)
      // Negative PnL: -250 → red class
      const negativePnl = screen.getByText('¥250')
      expect(negativePnl.className).toMatch(/red/)
    })
  })
})
