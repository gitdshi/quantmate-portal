import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '../test/utils'
import Reports from './Reports'

vi.mock('../lib/api', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    interceptors: { request: { use: vi.fn() }, response: { use: vi.fn() } },
  },
  reportsAPI: {
    list: vi.fn(),
    get: vi.fn(),
    generate: vi.fn(),
  },
}))

import { reportsAPI } from '../lib/api'

const mockReports = [
  { id: 1, report_type: 'daily', title: 'Daily Report 2025-01-01', content_json: { profit: 100 }, created_at: '2025-01-01T08:00:00Z' },
  { id: 2, report_type: 'weekly', title: 'Weekly Report W1', content_json: null, created_at: '2025-01-07T08:00:00Z' },
]

describe('Reports Page', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    ;(reportsAPI.list as any).mockResolvedValue({ data: mockReports })
    ;(reportsAPI.get as any).mockResolvedValue({ data: mockReports[0] })
    ;(reportsAPI.generate as any).mockResolvedValue({ data: { id: 3 } })
  })

  it('renders heading and generate button', () => {
    render(<Reports />)
    expect(screen.getByText('Reports')).toBeInTheDocument()
    expect(screen.getByText('Generate Report')).toBeInTheDocument()
  })

  it('displays report list', async () => {
    render(<Reports />)
    await waitFor(() => {
      expect(screen.getByText('Daily Report 2025-01-01')).toBeInTheDocument()
      expect(screen.getByText('Weekly Report W1')).toBeInTheDocument()
    })
  })

  it('shows report type badges', async () => {
    render(<Reports />)
    await waitFor(() => {
      expect(screen.getByText('Daily')).toBeInTheDocument()
      expect(screen.getByText('Weekly')).toBeInTheDocument()
    })
  })

  it('shows generate form on button click', async () => {
    render(<Reports />)
    fireEvent.click(screen.getByText('Generate Report'))
    expect(screen.getByText('Generate')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Auto-generated if empty')).toBeInTheDocument()
  })

  it('navigates to detail view on click', async () => {
    render(<Reports />)
    await waitFor(() => {
      expect(screen.getByText('Daily Report 2025-01-01')).toBeInTheDocument()
    })
    
    const viewBtns = screen.getAllByText('View')
    fireEvent.click(viewBtns[0])

    await waitFor(() => {
      expect(screen.getByText('Back to list')).toBeInTheDocument()
      expect(screen.getByText(/"profit": 100/)).toBeInTheDocument()
    })
  })

  it('handles API error gracefully', async () => {
    ;(reportsAPI.list as any).mockRejectedValue(new Error('Network error'))
    render(<Reports />)
    await waitFor(() => {
      expect(screen.getByText('Failed to load reports')).toBeInTheDocument()
    })
  })

  it('shows empty state when no reports', async () => {
    ;(reportsAPI.list as any).mockResolvedValue({ data: [] })
    render(<Reports />)
    await waitFor(() => {
      expect(screen.getByText(/No reports yet/)).toBeInTheDocument()
    })
  })

  it('filters by report type', async () => {
    render(<Reports />)
    await waitFor(() => {
      expect(screen.getByText('Daily Report 2025-01-01')).toBeInTheDocument()
    })

    const typeSelect = screen.getAllByRole('combobox')[0]
    fireEvent.change(typeSelect, { target: { value: 'daily' } })

    await waitFor(() => {
      expect(reportsAPI.list).toHaveBeenCalledWith(expect.objectContaining({
        report_type: 'daily',
      }))
    })
  })
})
