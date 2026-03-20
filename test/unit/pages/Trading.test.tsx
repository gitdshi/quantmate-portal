import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@test/support/utils'
import Trading from '@/pages/Trading'

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
    connectGateway: vi.fn(),
    disconnectGateway: vi.fn(),
    listGateways: vi.fn(),
    getGatewayPositions: vi.fn(),
    getGatewayAccount: vi.fn(),
    startAutoStrategy: vi.fn(),
    stopAutoStrategy: vi.fn(),
    listAutoStrategies: vi.fn(),
  },
}))

import { tradingAPI } from '@/lib/api'

const mockOrders = [
  {
    id: 1, symbol: '000001.SZ', direction: 'buy', order_type: 'limit',
    quantity: 100, price: 10.5, status: 'filled', mode: 'live',
    filled_quantity: 100, avg_fill_price: 10.48, created_at: '2025-01-01T10:00:00Z',
  },
  {
    id: 2, symbol: '600519.SH', direction: 'sell', order_type: 'market',
    quantity: 50, status: 'created', mode: 'live',
    created_at: '2025-01-02T10:00:00Z',
  },
]

const mockGateways = [
  { name: 'ctp_01', type: 'ctp', connected: true },
]

describe('Trading Page (Live-Only)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    ;(tradingAPI.listOrders as any).mockResolvedValue({ data: mockOrders })
    ;(tradingAPI.createOrder as any).mockResolvedValue({ data: { id: 3 } })
    ;(tradingAPI.cancelOrder as any).mockResolvedValue({ data: {} })
    ;(tradingAPI.listGateways as any).mockResolvedValue({ data: { gateways: mockGateways } })
  })

  it('renders heading and order form', () => {
    render(<Trading />)
    expect(screen.getByText('Live Trading')).toBeInTheDocument()
    expect(screen.getByText('New Order')).toBeInTheDocument()
    expect(screen.getByText('Submit Order')).toBeInTheDocument()
  })

  it('does not show paper/live mode toggle', () => {
    render(<Trading />)
    expect(screen.queryByText('Paper')).not.toBeInTheDocument()
  })

  it('shows gateway selector', async () => {
    render(<Trading />)
    await waitFor(() => {
      expect(screen.getByText(/ctp_01/)).toBeInTheDocument()
    })
  })

  it('displays orders after loading', async () => {
    render(<Trading />)
    await waitFor(() => {
      expect(screen.getByText('000001.SZ')).toBeInTheDocument()
      expect(screen.getByText('600519.SH')).toBeInTheDocument()
    })
  })

  it('shows direction with correct colors', async () => {
    render(<Trading />)
    await waitFor(() => {
      expect(screen.getByText('BUY')).toBeInTheDocument()
      expect(screen.getByText('SELL')).toBeInTheDocument()
    })
  })

  it('shows status badges', async () => {
    render(<Trading />)
    await waitFor(() => {
      expect(screen.getByText('filled')).toBeInTheDocument()
      expect(screen.getByText('created')).toBeInTheDocument()
    })
  })

  it('shows cancel button for cancellable orders', async () => {
    render(<Trading />)
    await waitFor(() => {
      const cancelButtons = screen.getAllByTitle('Cancel')
      expect(cancelButtons.length).toBe(1)
    })
  })

  it('submits a live order', async () => {
    render(<Trading />)

    const symbolInput = screen.getByPlaceholderText('000001.SZ')
    fireEvent.change(symbolInput, { target: { value: '300001.SZ' } })

    const submitBtn = screen.getByText('Submit Order')
    fireEvent.click(submitBtn)

    await waitFor(() => {
      expect(tradingAPI.createOrder).toHaveBeenCalledWith(expect.objectContaining({
        symbol: '300001.SZ',
        direction: 'buy',
        order_type: 'market',
        quantity: 100,
        mode: 'live',
      }))
    })
  })

  it('shows price field for limit orders', async () => {
    render(<Trading />)

    const typeSelect = screen.getAllByRole('combobox')[1]
    fireEvent.change(typeSelect, { target: { value: 'limit' } })

    expect(screen.getByText('Price')).toBeInTheDocument()
  })

  it('handles API error gracefully', async () => {
    ;(tradingAPI.listOrders as any).mockRejectedValue(new Error('Network error'))
    render(<Trading />)
    await waitFor(() => {
      expect(screen.getByText('Failed to load orders')).toBeInTheDocument()
    })
  })
})
      expect(screen.getByText('Failed to load orders')).toBeInTheDocument()
    })
  })

  it('toggles between paper and live mode', () => {
    render(<Trading />)
    const liveBtn = screen.getByText('Live')
    fireEvent.click(liveBtn)
    expect(liveBtn.className).toContain('bg-red-600')
  })

  it('shows empty state when no orders', async () => {
    ;(tradingAPI.listOrders as any).mockResolvedValue({ data: [] })
    render(<Trading />)
    await waitFor(() => {
      expect(screen.getByText('No orders yet')).toBeInTheDocument()
    })
  })
})


