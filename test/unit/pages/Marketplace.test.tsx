import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@test/support/utils'
import i18n from '@/i18n'
import Marketplace from '@/pages/Marketplace'

vi.mock('@/lib/api', () => ({
  api: {
    get: vi.fn(),
    interceptors: { request: { use: vi.fn() }, response: { use: vi.fn() } },
  },
  templateAPI: {
    listMarketplace: vi.fn(),
  },
}))

import { templateAPI } from '@/lib/api'

describe('Marketplace Page', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    localStorage.setItem('quantmate-lang', 'en')
    await i18n.changeLanguage('en')
    vi.mocked(templateAPI.listMarketplace).mockResolvedValue({ data: [] } as never)
  })

  it('renders heading', () => {
    render(<Marketplace />)
    expect(screen.getByText('Strategy Marketplace')).toBeInTheDocument()
  })

  it('shows search input', () => {
    render(<Marketplace />)
    expect(screen.getByPlaceholderText('Search strategy templates...')).toBeInTheDocument()
  })

  it('shows category filter buttons', () => {
    render(<Marketplace />)
    expect(screen.getByRole('button', { name: 'All' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Trend Following' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Mean Reversion' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Multi-Factor' })).toBeInTheDocument()
  })

  it('shows empty state when no templates are available', async () => {
    render(<Marketplace />)
    expect(await screen.findByText('No strategy templates available')).toBeInTheDocument()
  })

  it('hides featured card when there are no templates', () => {
    render(<Marketplace />)
    expect(screen.queryByText('Featured')).not.toBeInTheDocument()
  })
})
