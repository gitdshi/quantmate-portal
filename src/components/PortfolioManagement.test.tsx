import { userEvent } from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mockClosedTrade, mockPosition } from '../../test/mockData'
import { render, screen, waitFor } from '../../test/utils'
import PortfolioManagement from '../PortfolioManagement'

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
  portfolioAPI: {
    positions: vi.fn(),
    closedTrades: vi.fn(),
    closePosition: vi.fn(),
  },
}))

import { portfolioAPI } from '../../lib/api'

describe('PortfolioManagement Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('displays summary cards', async () => {
    ;(portfolioAPI.positions as any).mockResolvedValue({ data: [mockPosition] })
    ;(portfolioAPI.closedTrades as any).mockResolvedValue({ data: [mockClosedTrade] })
    
    render(<PortfolioManagement />)
    
    await waitFor(() => {
      expect(screen.getByText('Total Market Value')).toBeInTheDocument()
      expect(screen.getByText('Unrealized P&L')).toBeInTheDocument()
      expect(screen.getByText('Realized P&L')).toBeInTheDocument()
    })
  })

  it('displays open positions table', async () => {
    ;(portfolioAPI.positions as any).mockResolvedValue({ data: [mockPosition] })
    ;(portfolioAPI.closedTrades as any).mockResolvedValue({ data: [] })
    
    render(<PortfolioManagement />)
    
    await waitFor(() => {
      expect(screen.getByText('Open Positions')).toBeInTheDocument()
      expect(screen.getByText('AAPL')).toBeInTheDocument()
      expect(screen.getByText('Test Strategy')).toBeInTheDocument()
      expect(screen.getByText('LONG')).toBeInTheDocument()
    })
  })

  it('displays closed trades table', async () => {
    ;(portfolioAPI.positions as any).mockResolvedValue({ data: [] })
    ;(portfolioAPI.closedTrades as any).mockResolvedValue({ data: [mockClosedTrade] })
    
    render(<PortfolioManagement />)
    
    await waitFor(() => {
      expect(screen.getByText('Closed Trades')).toBeInTheDocument()
      expect(screen.getByText('14 days')).toBeInTheDocument()
    })
  })

  it('opens close position modal on close button click', async () => {
    const user = userEvent.setup()
    ;(portfolioAPI.positions as any).mockResolvedValue({ data: [mockPosition] })
    ;(portfolioAPI.closedTrades as any).mockResolvedValue({ data: [] })
    
    render(<PortfolioManagement />)
    
    await waitFor(() => {
      expect(screen.getByText('AAPL')).toBeInTheDocument()
    })
    
    const closeButton = screen.getByRole('button', { name: /close/i })
    await user.click(closeButton)
    
    await waitFor(() => {
      expect(screen.getByText('Close Position')).toBeInTheDocument()
      expect(screen.getByText(/are you sure/i)).toBeInTheDocument()
    })
  })

  it('closes position when confirmed', async () => {
    const user = userEvent.setup()
    ;(portfolioAPI.positions as any).mockResolvedValue({ data: [mockPosition] })
    ;(portfolioAPI.closedTrades as any).mockResolvedValue({ data: [] })
    ;(portfolioAPI.closePosition as any).mockResolvedValue({ data: { success: true } })
    
    render(<PortfolioManagement />)
    
    await waitFor(() => {
      expect(screen.getByText('AAPL')).toBeInTheDocument()
    })
    
    const closeButton = screen.getByRole('button', { name: /close/i })
    await user.click(closeButton)
    
    await waitFor(() => {
      expect(screen.getByText('Close Position')).toBeInTheDocument()
    })
    
    const confirmButton = screen.getByRole('button', { name: /close position/i })
    await user.click(confirmButton)
    
    await waitFor(() => {
      expect(portfolioAPI.closePosition).toHaveBeenCalledWith(mockPosition.id)
    })
  })

  it('displays empty state for no positions', async () => {
    ;(portfolioAPI.positions as any).mockResolvedValue({ data: [] })
    ;(portfolioAPI.closedTrades as any).mockResolvedValue({ data: [] })
    
    render(<PortfolioManagement />)
    
    await waitFor(() => {
      expect(screen.getByText('No open positions')).toBeInTheDocument()
      expect(screen.getByText('No closed trades')).toBeInTheDocument()
    })
  })

  it('calculates totals correctly', async () => {
    const positions = [mockPosition, { ...mockPosition, id: 2, unrealized_pnl: 300 }]
    ;(portfolioAPI.positions as any).mockResolvedValue({ data: positions })
    ;(portfolioAPI.closedTrades as any).mockResolvedValue({ data: [] })
    
    render(<PortfolioManagement />)
    
    await waitFor(() => {
      expect(screen.getByText('$800')).toBeInTheDocument() // Total unrealized P&L
    })
  })
})
