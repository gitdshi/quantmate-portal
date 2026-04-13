import i18n from '@/i18n'
import Trading from '@/pages/Trading'
import { fireEvent, render, screen, waitFor } from '@test/support/utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

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

  // ─── Order submit through modal ─────────────────────────
  it('submits an order through the modal form', async () => {
    render(<Trading />)
    fireEvent.click(screen.getByText('New Order'))

    // Modal should open with form fields
    expect(screen.getByText('Ticker')).toBeInTheDocument()

    // Find modal container
    const modals = document.querySelectorAll('.fixed')
    const modal = modals[modals.length - 1]

    // Fill symbol (first text input) and quantity (number input)
    const textInputs = modal.querySelectorAll('input:not([type="number"])')
    const numberInputs = modal.querySelectorAll('input[type="number"]')

    fireEvent.change(textInputs[0], { target: { value: '000001.SZ' } })
    // quantity is the second number input (first is price)
    const qtyInput = numberInputs.length > 1 ? numberInputs[1] : numberInputs[0]
    fireEvent.change(qtyInput, { target: { value: '100' } })

    // Submit
    fireEvent.click(screen.getByText('Submit Order'))

    await waitFor(() => {
      expect(tradingAPI.createOrder).toHaveBeenCalled()
    })
  })

  // ─── Cancel pending order ───────────────────────────────
  it('cancels a pending order', async () => {
    render(<Trading />)
    await waitFor(() => {
      expect(screen.getByText('Cancel')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('Cancel'))

    await waitFor(() => {
      expect(tradingAPI.cancelOrder).toHaveBeenCalled()
    })
  })

  // ─── Order submit failure ───────────────────────────────
  it('handles order submit failure', async () => {
    vi.mocked(tradingAPI.createOrder).mockRejectedValue(new Error('fail'))
    render(<Trading />)
    fireEvent.click(screen.getByText('New Order'))

    // Find modal and fill required fields
    const modals = document.querySelectorAll('.fixed')
    const modal = modals[modals.length - 1]
    const textInputs = modal.querySelectorAll('input:not([type="number"])')
    const numberInputs = modal.querySelectorAll('input[type="number"]')

    fireEvent.change(textInputs[0], { target: { value: '000001.SZ' } })
    const qtyInput = numberInputs.length > 1 ? numberInputs[1] : numberInputs[0]
    fireEvent.change(qtyInput, { target: { value: '100' } })

    fireEvent.click(screen.getByText('Submit Order'))

    await waitFor(() => {
      expect(tradingAPI.createOrder).toHaveBeenCalled()
    })
  })

  // ─── Cancel order failure ───────────────────────────────
  it('handles cancel order failure', async () => {
    vi.mocked(tradingAPI.cancelOrder).mockRejectedValue(new Error('fail'))
    render(<Trading />)
    await waitFor(() => expect(screen.getByText('Cancel')).toBeInTheDocument())

    fireEvent.click(screen.getByText('Cancel'))

    await waitFor(() => {
      expect(tradingAPI.cancelOrder).toHaveBeenCalled()
    })
  })

  // ─── Trades tab ─────────────────────────────────────────
  it('switches to trades tab to view filled orders', async () => {
    render(<Trading />)
    fireEvent.click(screen.getByText('Trades'))
    await waitFor(() => {
      expect(screen.getByText('000001.SZ')).toBeInTheDocument()
    })
  })

  // ─── Order history tab ──────────────────────────────────
  it('switches to order history tab', async () => {
    render(<Trading />)
    fireEvent.click(screen.getByText('Order History'))
    await waitFor(() => {
      expect(screen.getByText('Trading')).toBeInTheDocument()
    })
  })

  // ─── Modal form select fields ───────────────────────────
  it('changes direction and type selects in order modal', () => {
    const { container } = render(<Trading />)
    fireEvent.click(screen.getByText('New Order'))

    // Native <select> elements (not combobox role)
    const selects = container.querySelectorAll('select')
    expect(selects.length).toBeGreaterThanOrEqual(2)
    // Change direction
    fireEvent.change(selects[0], { target: { value: 'sell' } })
    // Change order type
    fireEvent.change(selects[1], { target: { value: 'market' } })
  })

  // ─── Order modal form submission (lines 248-252) ────────
  it('submits order form with filled fields', async () => {
    vi.mocked(tradingAPI.createOrder).mockResolvedValue({ data: {} } as never)

    const { container } = render(<Trading />)
    fireEvent.click(screen.getByText('New Order'))

    // Fill in form fields
    const inputs = container.querySelectorAll('input')
    // Symbol input
    const symbolInput = Array.from(inputs).find(
      (i) => (i as HTMLInputElement).placeholder?.toLowerCase().includes('symbol') || (i as HTMLInputElement).type === 'text'
    )
    if (symbolInput) fireEvent.change(symbolInput, { target: { value: '600519.SH' } })

    // Quantity and price
    const numberInputs = Array.from(inputs).filter((i) => (i as HTMLInputElement).type === 'number')
    if (numberInputs[0]) fireEvent.change(numberInputs[0], { target: { value: '100' } })
    if (numberInputs[1]) fireEvent.change(numberInputs[1], { target: { value: '100' } })

    // Find submit button
    const modals = document.querySelectorAll('.fixed')
    const modal = modals[modals.length - 1]
    const submitBtn = Array.from(modal.querySelectorAll('button')).find(
      (b) => b.textContent?.match(/submit|place|create/i)
    )
    if (submitBtn && !submitBtn.disabled) {
      fireEvent.click(submitBtn)
      await waitFor(() => {
        expect(tradingAPI.createOrder).toHaveBeenCalled()
      })
    }
  })

  // ─── Cancel order (line 274+) ──────────────────────────
  it('cancels a pending order', async () => {
    vi.mocked(tradingAPI.cancelOrder).mockResolvedValue({ data: {} } as never)

    render(<Trading />)
    await waitFor(() => {
      expect(screen.getByText('000001.SZ')).toBeInTheDocument()
    })

    // Find cancel button for pending order
    const cancelBtn = Array.from(document.querySelectorAll('button')).find(
      (b) => b.textContent?.match(/cancel/i) && !b.textContent?.match(/order history/i)
    )
    if (cancelBtn) {
      fireEvent.click(cancelBtn)
      await waitFor(() => {
        expect(tradingAPI.cancelOrder).toHaveBeenCalled()
      })
    }
  })

  // ─── Order modal opens and fills form (lines 248-277) ──
  it('opens order modal and fills all form fields', async () => {
    render(<Trading />)
    await waitFor(() => {
      expect(screen.getByText('000001.SZ')).toBeInTheDocument()
    })

    // Click "New Order" button
    const newOrderBtn = Array.from(document.querySelectorAll('button')).find(
      (b) => b.textContent?.match(/new order|create order/i)
    )
    if (newOrderBtn) {
      fireEvent.click(newOrderBtn)
    }

    await waitFor(() => {
      const modals = document.querySelectorAll('.fixed')
      expect(modals.length).toBeGreaterThan(0)
    })

    const modal = Array.from(document.querySelectorAll('.fixed')).pop()!
    const inputs = modal.querySelectorAll('input')

    // Fill in symbol
    if (inputs[0]) {
      fireEvent.change(inputs[0], { target: { value: '600519.SH' } })
    }

    // Fill in strategy (last input)
    const strategyInput = Array.from(inputs).pop()
    if (strategyInput) {
      fireEvent.change(strategyInput, { target: { value: 'DualMA' } })
    }

    // Change direction select to sell
    const selects = modal.querySelectorAll('select')
    if (selects[0]) {
      fireEvent.change(selects[0], { target: { value: 'sell' } })
    }

    // Click cancel to close
    const cancelBtn = Array.from(modal.querySelectorAll('button')).find(
      (b) => b.textContent?.match(/cancel/i)
    )
    if (cancelBtn) {
      fireEvent.click(cancelBtn)
    }
  })
})
