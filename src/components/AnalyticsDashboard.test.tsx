import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mockAnalyticsData } from '../../test/mockData'
import { render, screen, waitFor } from '../../test/utils'
import AnalyticsDashboard from '../AnalyticsDashboard'

// Mock API
vi.mock('../../lib/api', () => ({
  api: {
    get: vi.fn(),
    interceptors: {
      request: { use: vi.fn() },
      response: { use: vi.fn() },
    },
  },
  analyticsAPI: {
    dashboard: vi.fn(),
  },
}))

import { analyticsAPI } from '../../lib/api'

describe('AnalyticsDashboard Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders loading state initially', () => {
    ;(analyticsAPI.dashboard as any).mockImplementation(() => new Promise(() => {}))
    
    render(<AnalyticsDashboard />)
    
    expect(screen.getByRole('status')).toBeInTheDocument()
  })

  it('displays portfolio statistics cards', async () => {
    ;(analyticsAPI.dashboard as any).mockResolvedValue({ data: mockAnalyticsData })
    
    render(<AnalyticsDashboard />)
    
    await waitFor(() => {
      expect(screen.getByText('Total Value')).toBeInTheDocument()
      expect(screen.getByText('Daily P&L')).toBeInTheDocument()
      expect(screen.getByText('Total P&L')).toBeInTheDocument()
      expect(screen.getByText('Open Positions')).toBeInTheDocument()
    })
  })

  it('displays correct portfolio values', async () => {
    ;(analyticsAPI.dashboard as any).mockResolvedValue({ data: mockAnalyticsData })
    
    render(<AnalyticsDashboard />)
    
    await waitFor(() => {
      expect(screen.getByText('$150,000')).toBeInTheDocument()
      expect(screen.getByText('$500')).toBeInTheDocument()
      expect(screen.getByText('5')).toBeInTheDocument()
    })
  })

  it('displays performance chart', async () => {
    ;(analyticsAPI.dashboard as any).mockResolvedValue({ data: mockAnalyticsData })
    
    render(<AnalyticsDashboard />)
    
    await waitFor(() => {
      expect(screen.getByText('Portfolio Performance')).toBeInTheDocument()
    })
  })

  it('displays strategy performance section', async () => {
    ;(analyticsAPI.dashboard as any).mockResolvedValue({ data: mockAnalyticsData })
    
    render(<AnalyticsDashboard />)
    
    await waitFor(() => {
      expect(screen.getByText('Strategy Performance')).toBeInTheDocument()
      expect(screen.getByText('Test Strategy')).toBeInTheDocument()
    })
  })

  it('displays sector allocation', async () => {
    ;(analyticsAPI.dashboard as any).mockResolvedValue({ data: mockAnalyticsData })
    
    render(<AnalyticsDashboard />)
    
    await waitFor(() => {
      expect(screen.getByText('Sector Allocation')).toBeInTheDocument()
      expect(screen.getByText('Technology')).toBeInTheDocument()
      expect(screen.getByText('Finance')).toBeInTheDocument()
    })
  })

  it('displays risk metrics', async () => {
    ;(analyticsAPI.dashboard as any).mockResolvedValue({ data: mockAnalyticsData })
    
    render(<AnalyticsDashboard />)
    
    await waitFor(() => {
      expect(screen.getByText('Risk Metrics')).toBeInTheDocument()
      expect(screen.getByText('Volatility')).toBeInTheDocument()
      expect(screen.getByText('Max Drawdown')).toBeInTheDocument()
      expect(screen.getByText('Beta')).toBeInTheDocument()
      expect(screen.getByText('Alpha')).toBeInTheDocument()
    })
  })

  it('handles API error gracefully', async () => {
    ;(analyticsAPI.dashboard as any).mockRejectedValue(new Error('API Error'))
    
    render(<AnalyticsDashboard />)
    
    await waitFor(() => {
      expect(screen.getByText(/no analytics data/i)).toBeInTheDocument()
    })
  })

  it('shows positive P&L in green', async () => {
    ;(analyticsAPI.dashboard as any).mockResolvedValue({ data: mockAnalyticsData })
    
    render(<AnalyticsDashboard />)
    
    await waitFor(() => {
      const pnlElements = screen.getAllByText(/\$50,000/)
      expect(pnlElements[0]).toHaveClass('text-green-600')
    })
  })
})
