import { userEvent } from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mockClosedTrade, mockPosition } from '@test/support/mockData'
import { render, screen, waitFor } from '@test/support/utils'
import PortfolioManagement from '@/components/PortfolioManagement'

// Mock API �?component uses api.get()/api.post() directly
vi.mock('@/lib/api', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    interceptors: {
      request: { use: vi.fn() },
      response: { use: vi.fn() },
    },
  },
}))

import { api } from '@/lib/api'

// Helper to set up api.get mock based on URL
function setupApiMock(positions: any[] = [], closedTrades: any[] = []) {
  ;(api.get as any).mockImplementation((url: string) => {
    if (url.includes('positions')) return Promise.resolve({ data: { portfolio_id: 1, cash: 10000, positions } })
    if (url.includes('transactions')) return Promise.resolve({ data: { data: closedTrades } })
    return Promise.resolve({ data: [] })
  })
}

describe('PortfolioManagement Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('displays summary cards', async () => {
    setupApiMock([mockPosition], [mockClosedTrade])
    
    render(<PortfolioManagement />)
    
    await waitFor(() => {
      expect(screen.getByText('Total Market Value')).toBeInTheDocument()
      // "Unrealized P&L" appears in summary card + table header; use getAllByText
      expect(screen.getAllByText('Unrealized P&L').length).toBeGreaterThanOrEqual(1)
      expect(screen.getAllByText('Realized P&L').length).toBeGreaterThanOrEqual(1)
    })
  })

  it('displays open positions table', async () => {
    setupApiMock([mockPosition], [])
    
    render(<PortfolioManagement />)
    
    await waitFor(() => {
      expect(screen.getAllByText('Open Positions').length).toBeGreaterThanOrEqual(1)
      expect(screen.getByText('AAPL')).toBeInTheDocument()
      expect(screen.getByText('Test Strategy')).toBeInTheDocument()
      expect(screen.getByText('LONG')).toBeInTheDocument()
    })
  })

  it('displays closed trades table', async () => {
    setupApiMock([], [mockClosedTrade])
    
    render(<PortfolioManagement />)
    
    await waitFor(() => {
      expect(screen.getByText('Closed Trades')).toBeInTheDocument()
      expect(screen.getByText('14 days')).toBeInTheDocument()
    })
  })

  it('opens close position modal on close button click', async () => {
    const user = userEvent.setup()
    setupApiMock([mockPosition], [])
    
    render(<PortfolioManagement />)
    
    await waitFor(() => {
      expect(screen.getByText('AAPL')).toBeInTheDocument()
    })
    
    const closeButton = screen.getByRole('button', { name: /close/i })
    await user.click(closeButton)
    
    await waitFor(() => {
      // "Close Position" appears as both heading and button; use getAllByText
      expect(screen.getAllByText('Close Position').length).toBeGreaterThanOrEqual(1)
      expect(screen.getByText(/are you sure/i)).toBeInTheDocument()
    })
  })

  it('closes position when confirmed', async () => {
    const user = userEvent.setup()
    setupApiMock([mockPosition], [])
    ;(api.post as any).mockResolvedValue({ data: { success: true } })
    
    render(<PortfolioManagement />)
    
    await waitFor(() => {
      expect(screen.getByText('AAPL')).toBeInTheDocument()
    })
    
    const closeButton = screen.getByRole('button', { name: /close/i })
    await user.click(closeButton)
    
    await waitFor(() => {
      expect(screen.getAllByText('Close Position').length).toBeGreaterThanOrEqual(1)
    })
    
    // Find the confirm button specifically (it's the one inside the modal with destructive styling)
    const confirmButtons = screen.getAllByRole('button', { name: /close position/i })
    const confirmButton = confirmButtons[confirmButtons.length - 1] // last one is the confirm button in modal
    await user.click(confirmButton)
    
    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith(expect.stringContaining('/close'), expect.any(Object))
    })
  })

  it('displays empty state for no positions', async () => {
    setupApiMock([], [])
    
    render(<PortfolioManagement />)
    
    await waitFor(() => {
      expect(screen.getByText('No open positions')).toBeInTheDocument()
      expect(screen.getByText('No closed trades')).toBeInTheDocument()
    })
  })

  it('calculates totals correctly', async () => {
    const positions = [mockPosition, { ...mockPosition, id: 2, unrealized_pnl: 300 }]
    setupApiMock(positions, [])
    
    render(<PortfolioManagement />)
    
    await waitFor(() => {
      expect(screen.getByText('$800')).toBeInTheDocument() // Total unrealized P&L
    })
  })
})


