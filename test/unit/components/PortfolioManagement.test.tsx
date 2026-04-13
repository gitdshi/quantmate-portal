import PortfolioManagement from '@/components/PortfolioManagement'
import i18n from '@/i18n'
import { mockClosedTrade, mockPosition } from '@test/support/mockData'
import { render, screen, waitFor } from '@test/support/utils'
import { userEvent } from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// Mock API component uses api.get()/api.post() directly
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

function setupApiMock(positions: any[] = [], closedTrades: any[] = []) {
  ;(api.get as any).mockImplementation((url: string) => {
    if (url.includes('/portfolio/positions')) {
      return Promise.resolve({ data: { portfolio_id: 1, cash: 10000, positions } })
    }
    if (url.includes('/transactions')) {
      return Promise.resolve({ data: { data: closedTrades } })
    }
    return Promise.resolve({ data: [] })
  })
}

describe('PortfolioManagement Component', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    localStorage.setItem('quantmate-lang', 'en')
    await i18n.changeLanguage('en')
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

  // ─── Close modal details (lines 340-382) ─────────
  it('shows position details in close modal including direction and PnL', async () => {
    const user = userEvent.setup()
    setupApiMock([mockPosition], [])

    render(<PortfolioManagement />)

    await waitFor(() => {
      expect(screen.getByText('AAPL')).toBeInTheDocument()
    })

    const closeButton = screen.getByRole('button', { name: /close/i })
    await user.click(closeButton)

    await waitFor(() => {
      expect(screen.getAllByText('Close Position').length).toBeGreaterThanOrEqual(1)
    })

    // Modal shows symbol and direction
    expect(screen.getAllByText('AAPL').length).toBeGreaterThanOrEqual(2)
    expect(screen.getAllByText('LONG').length).toBeGreaterThanOrEqual(1)
  })

  it('shows short direction in close modal', async () => {
    const user = userEvent.setup()
    const shortPosition = { ...mockPosition, direction: 'short', unrealized_pnl: -200, unrealized_pnl_pct: -5.0 }
    setupApiMock([shortPosition], [])

    render(<PortfolioManagement />)

    await waitFor(() => {
      expect(screen.getByText('AAPL')).toBeInTheDocument()
    })

    const closeButton = screen.getByRole('button', { name: /close/i })
    await user.click(closeButton)

    await waitFor(() => {
      expect(screen.getAllByText('Close Position').length).toBeGreaterThanOrEqual(1)
    })

    expect(screen.getAllByText('SHORT').length).toBeGreaterThanOrEqual(1)
  })

  // ─── Close modal cancel button (line 385) ─────────────
  it('closes modal when cancel button is clicked', async () => {
    const user = userEvent.setup()
    setupApiMock([mockPosition], [])

    render(<PortfolioManagement />)

    await waitFor(() => {
      expect(screen.getByText('AAPL')).toBeInTheDocument()
    })

    const closeButton = screen.getByRole('button', { name: /close/i })
    await user.click(closeButton)

    await waitFor(() => {
      expect(screen.getAllByText('Close Position').length).toBeGreaterThanOrEqual(1)
    })

    // Click Cancel button to dismiss modal
    const cancelBtn = screen.getByRole('button', { name: /cancel/i })
    await user.click(cancelBtn)

    // Modal should be closed — "are you sure" text should be gone
    await waitFor(() => {
      expect(screen.queryByText(/are you sure/i)).not.toBeInTheDocument()
    })
  })

  // ─── Close modal shows quantity and current price (lines 365-370) ───
  it('shows quantity and current price in close modal', async () => {
    const user = userEvent.setup()
    setupApiMock([mockPosition], [])

    render(<PortfolioManagement />)

    await waitFor(() => {
      expect(screen.getByText('AAPL')).toBeInTheDocument()
    })

    const closeButton = screen.getByRole('button', { name: /close/i })
    await user.click(closeButton)

    await waitFor(() => {
      expect(screen.getAllByText('Close Position').length).toBeGreaterThanOrEqual(1)
    })

    // Check that price and PnL details are visible (appears in both table and modal)
    expect(screen.getAllByText('$155.00').length).toBeGreaterThanOrEqual(2) // current_price in table + modal
    expect(screen.getAllByText(/\$500\.00/).length).toBeGreaterThanOrEqual(2) // unrealized_pnl in table + modal
  })

  // ─── Close modal dismiss via X button (line 340) ───
  it('closes the close modal via X button', async () => {
    const user = userEvent.setup()
    setupApiMock([mockPosition], [])

    render(<PortfolioManagement />)

    await waitFor(() => {
      expect(screen.getByText('AAPL')).toBeInTheDocument()
    })

    const closeButton = screen.getByRole('button', { name: /close/i })
    await user.click(closeButton)

    await waitFor(() => {
      expect(screen.getAllByText('Close Position').length).toBeGreaterThanOrEqual(1)
    })

    // Find the modal backdrop and the X/close button inside the modal
    const modal = document.querySelector('.fixed')
    expect(modal).toBeTruthy()
    const xBtn = modal?.querySelector('button')
    if (xBtn) {
      await user.click(xBtn)
      await waitFor(() => {
        expect(document.querySelector('.fixed')).toBeFalsy()
      })
    }
  })
})


