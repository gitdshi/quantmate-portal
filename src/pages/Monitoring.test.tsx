import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '../test/utils'
import Monitoring from './Monitoring'

vi.mock('../lib/api', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    delete: vi.fn(),
    interceptors: { request: { use: vi.fn() }, response: { use: vi.fn() } },
  },
  alertsAPI: {
    listRules: vi.fn(),
    createRule: vi.fn(),
    deleteRule: vi.fn(),
    updateRule: vi.fn(),
    listHistory: vi.fn(),
    acknowledgeAlert: vi.fn(),
    listChannels: vi.fn(),
    createChannel: vi.fn(),
    deleteChannel: vi.fn(),
  },
}))

import { alertsAPI } from '../lib/api'

const mockRules = [
  { id: 1, name: 'High CPU', metric: 'cpu_usage', comparator: '>', threshold: 90, level: 'severe', is_active: true, created_at: '2025-01-01T00:00:00Z' },
  { id: 2, name: 'Low Memory', metric: 'mem_free', comparator: '<', threshold: 512, level: 'warning', is_active: false, created_at: '2025-01-02T00:00:00Z' },
]

const mockHistory = [
  { id: 10, rule_id: 1, message: 'CPU exceeded 90%', level: 'severe', status: 'unread', triggered_at: '2025-01-03T12:00:00Z' },
  { id: 11, rule_id: 2, message: 'Memory low', level: 'warning', status: 'acknowledged', triggered_at: '2025-01-03T11:00:00Z' },
]

const mockChannels = [
  { id: 20, channel_type: 'email', config: { target: 'user@test.com' }, is_active: true, created_at: '2025-01-01T00:00:00Z' },
]

describe('Monitoring Page', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    ;(alertsAPI.listRules as any).mockResolvedValue({ data: mockRules })
    ;(alertsAPI.listHistory as any).mockResolvedValue({ data: mockHistory })
    ;(alertsAPI.listChannels as any).mockResolvedValue({ data: mockChannels })
    ;(alertsAPI.createRule as any).mockResolvedValue({ data: { id: 3 } })
    ;(alertsAPI.deleteRule as any).mockResolvedValue({ data: {} })
    ;(alertsAPI.acknowledgeAlert as any).mockResolvedValue({ data: {} })
    ;(alertsAPI.createChannel as any).mockResolvedValue({ data: { id: 21 } })
    ;(alertsAPI.deleteChannel as any).mockResolvedValue({ data: {} })
  })

  it('renders heading and tabs', () => {
    render(<Monitoring />)
    expect(screen.getByText('Monitoring & Alerts')).toBeInTheDocument()
    expect(screen.getByText('Alert Rules')).toBeInTheDocument()
    expect(screen.getByText('Alert History')).toBeInTheDocument()
    expect(screen.getByText('Channels')).toBeInTheDocument()
  })

  it('displays alert rules', async () => {
    render(<Monitoring />)
    await waitFor(() => {
      expect(screen.getByText('High CPU')).toBeInTheDocument()
      expect(screen.getByText('Low Memory')).toBeInTheDocument()
    })
  })

  it('shows rule status (active/disabled)', async () => {
    render(<Monitoring />)
    await waitFor(() => {
      expect(screen.getByText('Active')).toBeInTheDocument()
      expect(screen.getByText('Disabled')).toBeInTheDocument()
    })
  })

  it('shows new rule form on button click', async () => {
    render(<Monitoring />)
    await waitFor(() => {
      expect(screen.getByText('New Rule')).toBeInTheDocument()
    })
    fireEvent.click(screen.getByText('New Rule'))
    expect(screen.getByPlaceholderText('Rule name')).toBeInTheDocument()
    expect(screen.getByText('Create')).toBeInTheDocument()
  })

  it('switches to history tab', async () => {
    render(<Monitoring />)
    fireEvent.click(screen.getByText('Alert History'))
    await waitFor(() => {
      expect(screen.getByText('CPU exceeded 90%')).toBeInTheDocument()
      expect(screen.getByText('Memory low')).toBeInTheDocument()
    })
  })

  it('shows acknowledge button for unread alerts', async () => {
    render(<Monitoring />)
    fireEvent.click(screen.getByText('Alert History'))
    await waitFor(() => {
      // Only alert id=10 is unread
      expect(screen.getByText('Ack')).toBeInTheDocument()
    })
  })

  it('switches to channels tab', async () => {
    render(<Monitoring />)
    fireEvent.click(screen.getByText('Channels'))
    await waitFor(() => {
      expect(screen.getByText('email')).toBeInTheDocument()
      expect(screen.getByText('user@test.com')).toBeInTheDocument()
    })
  })

  it('handles rules API error', async () => {
    ;(alertsAPI.listRules as any).mockRejectedValue(new Error('fail'))
    render(<Monitoring />)
    await waitFor(() => {
      expect(screen.getByText('Failed to load data')).toBeInTheDocument()
    })
  })

  it('shows empty state for rules', async () => {
    ;(alertsAPI.listRules as any).mockResolvedValue({ data: [] })
    render(<Monitoring />)
    await waitFor(() => {
      expect(screen.getByText('No alert rules configured')).toBeInTheDocument()
    })
  })
})
