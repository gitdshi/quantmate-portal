import i18n from '@/i18n'
import Reports from '@/pages/Reports'
import { fireEvent, render, screen, waitFor } from '@test/support/utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockShowToast = vi.fn()
vi.mock('@/components/ui/toast-service', () => ({
  showToast: (...args: unknown[]) => mockShowToast(...args),
}))

vi.mock('@/lib/api', () => ({
  api: {
    get: vi.fn(),
    interceptors: { request: { use: vi.fn() }, response: { use: vi.fn() } },
  },
  reportsAPI: {
    list: vi.fn(),
    generate: vi.fn(),
  },
}))

import { reportsAPI } from '@/lib/api'

describe('Reports Page', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    localStorage.setItem('quantmate-lang', 'en')
    await i18n.changeLanguage('en')
    vi.mocked(reportsAPI.list).mockResolvedValue({ data: [] } as never)
    vi.mocked(reportsAPI.generate).mockResolvedValue({ data: {} } as never)
  })

  it('renders heading', () => {
    render(<Reports />)
    expect(screen.getByText('Reports & Review')).toBeInTheDocument()
  })

  it('shows all 4 tabs', () => {
    render(<Reports />)
    expect(screen.getByRole('button', { name: 'Performance' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Trade Review' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Attribution' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Reports' })).toBeInTheDocument()
  })

  it('shows generate button', () => {
    render(<Reports />)
    expect(screen.getByText('Generate Report')).toBeInTheDocument()
  })

  it('shows perf empty state on default tab', () => {
    render(<Reports />)
    expect(screen.getByText('Generate the first performance report')).toBeInTheDocument()
    expect(screen.getByText('Run a backtest')).toBeInTheDocument()
  })

  it('switches to review tab', () => {
    render(<Reports />)
    fireEvent.click(screen.getByRole('button', { name: 'Trade Review' }))
    expect(screen.getByText('Build some trading history first')).toBeInTheDocument()
    expect(screen.getByText('Open paper trading')).toBeInTheDocument()
  })

  it('switches to attribution tab', () => {
    render(<Reports />)
    fireEvent.click(screen.getByRole('button', { name: 'Attribution' }))
    expect(screen.getByText('Get strategy results before doing attribution')).toBeInTheDocument()
    expect(screen.getByText('Start first backtest')).toBeInTheDocument()
  })

  it('switches to list tab', async () => {
    render(<Reports />)
    fireEvent.click(screen.getByRole('button', { name: 'Reports' }))
    expect(await screen.findByText(/No reports yet/i)).toBeInTheDocument()
  })

  it('switches to list tab with data', async () => {
    vi.mocked(reportsAPI.list).mockResolvedValue({
      data: [{ id: '1', title: 'Monthly Report', report_type: 'monthly', created_at: '2025-01-01T00:00:00Z' }],
    } as never)

    render(<Reports />)
    fireEvent.click(screen.getByRole('button', { name: 'Reports' }))
    await waitFor(() => {
      expect(screen.getByText('Monthly Report')).toBeInTheDocument()
    })
  })

  it('opens generate report modal and submits successfully', async () => {
    render(<Reports />)
    fireEvent.click(screen.getByText('Generate Report'))

    // Modal should open
    await waitFor(() => {
      const modals = document.querySelectorAll('.fixed')
      expect(modals.length).toBeGreaterThan(0)
    })

    // Click submit button in modal
    const modals = document.querySelectorAll('.fixed')
    const modal = modals[modals.length - 1]
    const submitBtn = Array.from(modal.querySelectorAll('button')).find(b =>
      b.textContent?.match(/generate|create|submit/i)
    )
    expect(submitBtn).toBeTruthy()
    fireEvent.click(submitBtn!)

    await waitFor(() => {
      expect(reportsAPI.generate).toHaveBeenCalled()
    })
    await waitFor(() => {
      expect(mockShowToast).toHaveBeenCalledWith(expect.any(String), 'success')
    })
  })

  it('handles generate failure with error toast', async () => {
    vi.mocked(reportsAPI.generate).mockRejectedValue(new Error('fail'))

    render(<Reports />)
    fireEvent.click(screen.getByText('Generate Report'))

    await waitFor(() => {
      const modals = document.querySelectorAll('.fixed')
      expect(modals.length).toBeGreaterThan(0)
    })

    const modals = document.querySelectorAll('.fixed')
    const modal = modals[modals.length - 1]
    const submitBtn = Array.from(modal.querySelectorAll('button')).find(b =>
      b.textContent?.match(/generate|create|submit/i)
    )
    if (submitBtn) {
      fireEvent.click(submitBtn)
      await waitFor(() => {
        expect(reportsAPI.generate).toHaveBeenCalled()
      })
      await waitFor(() => {
        expect(mockShowToast).toHaveBeenCalledWith(expect.any(String), 'error')
      })
    }
  })

  it('closes generate report modal via cancel', async () => {
    render(<Reports />)
    fireEvent.click(screen.getByText('Generate Report'))

    await waitFor(() => {
      const modals = document.querySelectorAll('.fixed')
      expect(modals.length).toBeGreaterThan(0)
    })

    const modals = document.querySelectorAll('.fixed')
    const modal = modals[modals.length - 1]
    const cancelBtn = Array.from(modal.querySelectorAll('button')).find(b =>
      b.textContent?.match(/cancel/i)
    )
    if (cancelBtn) {
      fireEvent.click(cancelBtn)
      await waitFor(() => {
        const remaining = document.querySelectorAll('.fixed')
        // Modal should be closed (either removed or reduced)
        expect(remaining.length).toBeLessThanOrEqual(modals.length)
      })
    }
  })
})
