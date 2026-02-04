import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mockQueueStats } from '../../test/mockData'
import { render, screen, waitFor } from '../../test/utils'
import Dashboard from '../Dashboard'

// Mock API
vi.mock('../../lib/api', () => ({
  api: {
    get: vi.fn(),
    interceptors: {
      request: { use: vi.fn() },
      response: { use: vi.fn() },
    },
  },
  queueAPI: {
    getStats: vi.fn(),
  },
}))

import { queueAPI } from '../../lib/api'

describe('Dashboard Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders dashboard with loading state', () => {
    ;(queueAPI.getStats as any).mockResolvedValue({ data: mockQueueStats })
    
    render(<Dashboard />)
    
    expect(screen.getByText('Dashboard')).toBeInTheDocument()
    expect(screen.getByText(/queue statistics/i)).toBeInTheDocument()
  })

  it('displays queue statistics when data is loaded', async () => {
    ;(queueAPI.getStats as any).mockResolvedValue({ data: mockQueueStats })
    
    render(<Dashboard />)
    
    await waitFor(() => {
      expect(screen.getByText(/queued/i)).toBeInTheDocument()
      expect(screen.getByText(/started/i)).toBeInTheDocument()
      expect(screen.getByText(/finished/i)).toBeInTheDocument()
      expect(screen.getByText(/failed/i)).toBeInTheDocument()
    })
  })

  it('displays correct queue numbers', async () => {
    ;(queueAPI.getStats as any).mockResolvedValue({ data: mockQueueStats })
    
    render(<Dashboard />)
    
    await waitFor(() => {
      expect(screen.getByText('5')).toBeInTheDocument() // queued
      expect(screen.getByText('3')).toBeInTheDocument() // started
      expect(screen.getByText('100')).toBeInTheDocument() // finished
      expect(screen.getByText('2')).toBeInTheDocument() // failed
    })
  })

  it('handles API error gracefully', async () => {
    ;(queueAPI.getStats as any).mockRejectedValue(new Error('API Error'))
    
    render(<Dashboard />)
    
    await waitFor(() => {
      // Component should still render even with error
      expect(screen.getByText('Dashboard')).toBeInTheDocument()
    })
  })
})
