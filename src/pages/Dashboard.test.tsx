import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '../test/utils'
import Dashboard from './Dashboard'

// Mock API
vi.mock('../lib/api', () => ({
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
  systemAPI: {
    syncStatus: vi.fn(),
  },
}))

import { queueAPI, systemAPI } from '../lib/api'

// The Dashboard component reads stats?.active, stats?.queued, stats?.completed, stats?.failed
// from the top level of the response data, so mock data must match that shape.
const mockStatsData = {
  active: 3,
  queued: 5,
  completed: 100,
  failed: 2,
  by_queue: {
    default: { queued: 5, started: 3, finished: 100, failed: 2 },
  },
}

describe('Dashboard Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    ;(queueAPI.getStats as any).mockResolvedValue({ data: mockStatsData })
    ;(systemAPI.syncStatus as any).mockResolvedValue({ data: {} })
  })

  it('renders dashboard heading and stat cards', () => {
    render(<Dashboard />)

    expect(screen.getByText('Dashboard')).toBeInTheDocument()
    expect(screen.getByText('Queue Status')).toBeInTheDocument()
  })

  it('displays stat card labels', async () => {
    render(<Dashboard />)

    await waitFor(() => {
      expect(screen.getByText('Active Jobs')).toBeInTheDocument()
      expect(screen.getByText('Queued Jobs')).toBeInTheDocument()
      expect(screen.getByText('Completed')).toBeInTheDocument()
      expect(screen.getByText('Failed')).toBeInTheDocument()
    })
  })

  it('displays correct queue numbers', async () => {
    render(<Dashboard />)

    await waitFor(() => {
      expect(screen.getByText('3')).toBeInTheDocument()   // active
      expect(screen.getByText('5')).toBeInTheDocument()   // queued
      expect(screen.getByText('100')).toBeInTheDocument() // completed
      expect(screen.getByText('2')).toBeInTheDocument()   // failed
    })
  })

  it('handles API error gracefully', async () => {
    ;(queueAPI.getStats as any).mockRejectedValue(new Error('API Error'))

    render(<Dashboard />)

    await waitFor(() => {
      expect(screen.getByText('Dashboard')).toBeInTheDocument()
    })
  })
})
