import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@test/support/utils'
import i18n from '@/i18n'
import Reports from '@/pages/Reports'

vi.mock('@/components/ui/toast-service', () => ({
  showToast: vi.fn(),
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
    expect(screen.getByText('No performance reports yet. Generate one first.')).toBeInTheDocument()
  })

  it('switches to review tab', () => {
    render(<Reports />)
    fireEvent.click(screen.getByRole('button', { name: 'Trade Review' }))
    expect(screen.getByText('No trade review data available')).toBeInTheDocument()
  })

  it('switches to attribution tab', () => {
    render(<Reports />)
    fireEvent.click(screen.getByRole('button', { name: 'Attribution' }))
    expect(screen.getByText('No attribution data available')).toBeInTheDocument()
  })

  it('switches to list tab', async () => {
    render(<Reports />)
    fireEvent.click(screen.getByRole('button', { name: 'Reports' }))
    expect(await screen.findByText('No reports available')).toBeInTheDocument()
  })
})
