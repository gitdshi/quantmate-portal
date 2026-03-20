import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@test/support/utils'
import Positions from '@/pages/Positions'

vi.mock('@/lib/api', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    interceptors: { request: { use: vi.fn() }, response: { use: vi.fn() } },
  },
  tradingAPI: {
    listGateways: vi.fn(),
    getGatewayPositions: vi.fn(),
    getGatewayAccount: vi.fn(),
  },
}))

import { tradingAPI } from '@/lib/api'

const mockGateways = [
  { name: 'ctp_01', type: 'ctp', connected: true },
  { name: 'xtp_01', type: 'xtp', connected: false },
]

const mockPositions = [
  {
    symbol: 'IF2406.CFFEX', direction: 'long', volume: 2, frozen: 0,
    price: 4200.0, pnl: 1500.0, gateway_name: 'ctp_01',
  },
  {
    symbol: '000001.SZ', direction: 'buy', volume: 1000, frozen: 0,
    price: 12.5, pnl: -200.0, gateway_name: 'ctp_01',
  },
]

const mockAccount = {
  account_id: 'test_001', balance: 1000000, available: 800000,
  frozen: 100000, margin: 100000, gateway_name: 'ctp_01',
}

describe('Positions Page', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    ;(tradingAPI.listGateways as any).mockResolvedValue({ data: { gateways: mockGateways } })
    ;(tradingAPI.getGatewayPositions as any).mockResolvedValue({ data: { positions: mockPositions } })
    ;(tradingAPI.getGatewayAccount as any).mockResolvedValue({ data: { account: mockAccount } })
  })

  it('renders heading', () => {
    render(<Positions />)
    expect(screen.getByText('Positions')).toBeInTheDocument()
  })

  it('shows gateway selector with connected gateways', async () => {
    render(<Positions />)
    await waitFor(() => {
      expect(screen.getByText(/ctp_01/)).toBeInTheDocument()
    })
  })

  it('displays positions after loading', async () => {
    render(<Positions />)
    await waitFor(() => {
      expect(screen.getByText('IF2406.CFFEX')).toBeInTheDocument()
      expect(screen.getByText('000001.SZ')).toBeInTheDocument()
    })
  })

  it('shows position direction with colors', async () => {
    render(<Positions />)
    await waitFor(() => {
      expect(screen.getByText('LONG')).toBeInTheDocument()
      expect(screen.getByText('BUY')).toBeInTheDocument()
    })
  })

  it('shows P&L with correct sign', async () => {
    render(<Positions />)
    await waitFor(() => {
      expect(screen.getByText('+1500.00')).toBeInTheDocument()
      expect(screen.getByText('-200.00')).toBeInTheDocument()
    })
  })

  it('shows account summary', async () => {
    render(<Positions />)
    await waitFor(() => {
      expect(screen.getByText('Balance')).toBeInTheDocument()
      expect(screen.getByText('1000000.00')).toBeInTheDocument()
    })
  })

  it('shows empty state if no positions', async () => {
    ;(tradingAPI.getGatewayPositions as any).mockResolvedValue({ data: { positions: [] } })
    render(<Positions />)
    await waitFor(() => {
      expect(screen.getByText('No positions for this gateway')).toBeInTheDocument()
    })
  })

  it('handles API error gracefully', async () => {
    ;(tradingAPI.listGateways as any).mockRejectedValue(new Error('Network error'))
    render(<Positions />)
    await waitFor(() => {
      expect(screen.getByText(/Failed to load gateways/)).toBeInTheDocument()
    })
  })
})
