import SystemHealthStrip from '@/components/SystemHealthStrip'
import i18n from '@/i18n'
import { render, screen } from '@test/support/utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/api', () => ({
  api: {
    get: vi.fn(),
    interceptors: { request: { use: vi.fn() }, response: { use: vi.fn() } },
  },
  systemAPI: {
    syncStatus: vi.fn(),
  },
}))

import { systemAPI } from '@/lib/api'

describe('SystemHealthStrip', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    localStorage.setItem('quantmate-lang', 'en')
    await i18n.changeLanguage('en')
  })

  it('returns null when no data is available', () => {
    vi.mocked(systemAPI.syncStatus).mockResolvedValue({ data: null } as never)
    const { container } = render(<SystemHealthStrip />)
    // No data yet from query, should render nothing
    expect(container.querySelector('section')).toBeNull()
  })

  it('shows healthy state when data is consistent', async () => {
    vi.mocked(systemAPI.syncStatus).mockResolvedValue({
      data: {
        consistency: { is_consistent: true, missing_count: 0 },
        daemon: { status: 'running', last_run_at: '2025-01-15T10:00:00Z' },
      },
    } as never)

    render(<SystemHealthStrip />)
    expect(await screen.findByText(/data sync looks healthy/i)).toBeInTheDocument()
  })

  it('shows warning state when data has gaps', async () => {
    vi.mocked(systemAPI.syncStatus).mockResolvedValue({
      data: {
        consistency: { is_consistent: false, missing_count: 5 },
        daemon: { status: 'running', last_run_at: '2025-01-15T10:00:00Z' },
      },
    } as never)

    render(<SystemHealthStrip />)
    expect(await screen.findByText(/data sync has gaps/i)).toBeInTheDocument()
  })

  it('handles missing daemon data with fallbacks', async () => {
    vi.mocked(systemAPI.syncStatus).mockResolvedValue({
      data: {
        consistency: { is_consistent: true },
      },
    } as never)

    render(<SystemHealthStrip />)
    expect(await screen.findByText(/data sync looks healthy/i)).toBeInTheDocument()
  })
})
