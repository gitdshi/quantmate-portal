import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@test/support/utils'
import Positions from '@/pages/Positions'

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
  { symbol: '600519.SH', name: '贵州茅台', quantity: 100, market_price: 1850, market_value: 185000, cost: 1800, pnl: 5000, pnl_pct: 2.78, strategy: 'DualMA' },
  { symbol: '000001.SZ', name: '平安银行', quantity: 500, market_price: 12.5, market_value: 6250, cost: 13.0, pnl: -250, pnl_pct: -3.85, strategy: 'RSI' },
]

describe('Positions Page', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    ;(portfolioAPI.positions as any).mockResolvedValue({ data: { positions: mockPositions } })
  })

  it('renders heading', () => {
    render(<Positions />)
    expect(screen.getByText('持仓管理')).toBeInTheDocument()
  })

  it('shows stat cards', async () => {
    render(<Positions />)
    await waitFor(() => {
      expect(screen.getByText('持仓数量')).toBeInTheDocument()
      expect(screen.getByText('持仓市值')).toBeInTheDocument()
      expect(screen.getByText('总浮动盈亏')).toBeInTheDocument()
    })
  })

  it('shows search placeholder', () => {
    render(<Positions />)
    expect(screen.getByPlaceholderText('搜索持仓...')).toBeInTheDocument()
  })

  it('displays positions in table', async () => {
    render(<Positions />)
    await waitFor(() => {
      expect(screen.getByText('贵州茅台')).toBeInTheDocument()
      expect(screen.getByText('平安银行')).toBeInTheDocument()
    })
  })
})
