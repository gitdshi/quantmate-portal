import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@test/support/utils'
import i18n from '@/i18n'
import Trading from '@/pages/Trading'

vi.mock('@/components/ui/FilterBar', () => ({
  default: () => <div data-testid="filter-bar" />,
}))

vi.mock('@/components/ui/toast-service', () => ({
  showToast: vi.fn(),
}))

vi.mock('@/lib/api', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    interceptors: { request: { use: vi.fn() }, response: { use: vi.fn() } },
  },
  tradingAPI: {
    listOrders: vi.fn(),
    createOrder: vi.fn(),
    cancelOrder: vi.fn(),
  },
}))

import { tradingAPI } from '@/lib/api'

const mockOrders = [
  {
    id: '1',
    symbol: '000001.SZ',
    direction: 'buy',
    order_type: 'limit',
    price: 10.5,
    quantity: 100,
    filled_qty: 100,
    status: 'filled',
    strategy: 'DualMA',
    created_at: '2025-01-01T10:00:00Z',
  },
  {
    id: '2',
    symbol: '600519.SH',
    direction: 'sell',
    order_type: 'market',
    price: 1820,
    quantity: 50,
    filled_qty: 0,
    status: 'pending',
    strategy: 'RSI',
    created_at: '2025-01-02T10:00:00Z',
  },
]

describe('Trading Page', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    localStorage.setItem('quantmate-lang', 'en')
    await i18n.changeLanguage('en')
    vi.mocked(tradingAPI.listOrders).mockResolvedValue({ data: mockOrders } as never)
    vi.mocked(tradingAPI.createOrder).mockResolvedValue({ data: { id: '3' } } as never)
    vi.mocked(tradingAPI.cancelOrder).mockResolvedValue({ data: {} } as never)
  })

  it('renders heading', () => {
    render(<Trading />)
    expect(screen.getByText('Trading')).toBeInTheDocument()
  })

  it('shows tabs', () => {
    render(<Trading />)
    expect(screen.getByText('Open Orders')).toBeInTheDocument()
    expect(screen.getByText('Trades')).toBeInTheDocument()
    expect(screen.getByText('Order History')).toBeInTheDocument()
    expect(screen.getByText('Algo Trading')).toBeInTheDocument()
  })

  it('shows new order button', () => {
    render(<Trading />)
    expect(screen.getByText('New Order')).toBeInTheDocument()
  })

  it('displays stat cards in pending tab', async () => {
    render(<Trading />)
    await waitFor(() => {
      expect(screen.getByText('Today Orders')).toBeInTheDocument()
      expect(screen.getByText('Filled')).toBeInTheDocument()
      expect(screen.getByText('Pending')).toBeInTheDocument()
      expect(screen.getByText('Cancelled')).toBeInTheDocument()
    })
  })

  it('displays orders after loading', async () => {
    render(<Trading />)
    await waitFor(() => {
      expect(screen.getByText('000001.SZ')).toBeInTheDocument()
      expect(screen.getByText('600519.SH')).toBeInTheDocument()
    })
  })

  it('shows cancel button for pending orders', async () => {
    render(<Trading />)
    await waitFor(() => {
      expect(screen.getByText('Cancel')).toBeInTheDocument()
    })
  })

  it('opens order modal on button click', () => {
    render(<Trading />)
    fireEvent.click(screen.getByText('New Order'))
    expect(screen.getByText('Ticker')).toBeInTheDocument()
    expect(screen.getByText('Submit Order')).toBeInTheDocument()
  })

  it('switches to algo tab', () => {
    render(<Trading />)
    fireEvent.click(screen.getByText('Algo Trading'))
    expect(screen.getByText('Algo Orders')).toBeInTheDocument()
    expect(screen.getByText('TWAP Settings')).toBeInTheDocument()
    expect(screen.getByText('VWAP Settings')).toBeInTheDocument()
  })

  it('handles API error gracefully', async () => {
    vi.mocked(tradingAPI.listOrders).mockRejectedValue(new Error('fail') as never)
    render(<Trading />)
    await waitFor(() => {
      expect(screen.getByText('Trading')).toBeInTheDocument()
    })
  })
})
