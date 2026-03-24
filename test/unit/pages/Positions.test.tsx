import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@test/support/utils'
import i18n from '@/i18n'
import Positions from '@/pages/Positions'

vi.mock('@/components/ui/toast-service', () => ({
  showConfirm: vi.fn(async () => true),
  showToast: vi.fn(),
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
})
