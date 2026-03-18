import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@test/support/utils'
import Marketplace from '@/pages/Marketplace'

vi.mock('@/lib/api', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    interceptors: { request: { use: vi.fn() }, response: { use: vi.fn() } },
  },
  templateAPI: {
    listMarketplace: vi.fn(),
    listMine: vi.fn(),
    get: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    clone: vi.fn(),
    listComments: vi.fn(),
    addComment: vi.fn(),
    deleteComment: vi.fn(),
    getRatings: vi.fn(),
    rate: vi.fn(),
  },
}))

import { templateAPI } from '@/lib/api'

const mockTemplates = [
  { id: 1, author_id: 1, name: 'MA Crossover', description: 'Simple moving average crossover strategy', category: 'trend', code: 'class MACross:\n  pass', is_public: true, downloads: 42, avg_rating: 4.2, rating_count: 10, created_at: '2025-01-01T00:00:00Z', updated_at: '2025-01-01T00:00:00Z' },
  { id: 2, author_id: 2, name: 'RSI Strategy', description: 'RSI-based mean reversion', category: 'mean_reversion', code: 'class RSI:\n  pass', is_public: true, downloads: 15, avg_rating: 3.8, rating_count: 5, created_at: '2025-01-02T00:00:00Z', updated_at: '2025-01-02T00:00:00Z' },
]

const mockComments = [
  { id: 1, template_id: 1, user_id: 2, username: 'trader1', content: 'Great strategy!', created_at: '2025-01-03T00:00:00Z' },
]

const mockRatings = { template_id: 1, avg_rating: 4.2, rating_count: 10 }

describe('Marketplace Page', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    ;(templateAPI.listMarketplace as any).mockResolvedValue({ data: { data: mockTemplates } })
    ;(templateAPI.listMine as any).mockResolvedValue({ data: { data: [] } })
    ;(templateAPI.listComments as any).mockResolvedValue({ data: mockComments })
    ;(templateAPI.getRatings as any).mockResolvedValue({ data: mockRatings })
    ;(templateAPI.create as any).mockResolvedValue({ data: { id: 3 } })
    ;(templateAPI.clone as any).mockResolvedValue({ data: { id: 4 } })
    ;(templateAPI.rate as any).mockResolvedValue({})
    ;(templateAPI.addComment as any).mockResolvedValue({ data: { id: 2 } })
    ;(templateAPI.delete as any).mockResolvedValue({})
  })

  it('renders heading', () => {
    render(<Marketplace />)
    expect(screen.getByTestId('marketplace-page')).toBeInTheDocument()
    expect(screen.getByText('Strategy Marketplace')).toBeInTheDocument()
  })

  it('shows templates after loading', async () => {
    render(<Marketplace />)
    await waitFor(() => {
      expect(screen.getByText('MA Crossover')).toBeInTheDocument()
      expect(screen.getByText('RSI Strategy')).toBeInTheDocument()
    })
  })

  it('shows tab navigation', () => {
    render(<Marketplace />)
    expect(screen.getByText('Browse Marketplace')).toBeInTheDocument()
    expect(screen.getByText('My Templates')).toBeInTheDocument()
  })

  it('shows empty state when no selection', async () => {
    render(<Marketplace />)
    await waitFor(() => {
      expect(screen.getByText('Select a template to view details')).toBeInTheDocument()
    })
  })

  it('selects template and shows details', async () => {
    render(<Marketplace />)
    await waitFor(() => { screen.getByText('MA Crossover') })
    fireEvent.click(screen.getByText('MA Crossover'))
    await waitFor(() => {
      expect(screen.getByText(/class\s+MACross/)).toBeInTheDocument()
      expect(screen.getByText(/pass/)).toBeInTheDocument()
    })
  })

  it('shows comments for selected template', async () => {
    render(<Marketplace />)
    await waitFor(() => { screen.getByText('MA Crossover') })
    fireEvent.click(screen.getByText('MA Crossover'))
    await waitFor(() => {
      expect(screen.getByText('Great strategy!')).toBeInTheDocument()
    })
  })

  it('has Publish Template button', () => {
    render(<Marketplace />)
    expect(screen.getByText('Publish Template')).toBeInTheDocument()
  })

  it('opens create modal', async () => {
    render(<Marketplace />)
    fireEvent.click(screen.getByText('Publish Template'))
    await waitFor(() => {
      expect(screen.getByPlaceholderText('Template name')).toBeInTheDocument()
    })
  })

  it('handles loading error', async () => {
    ;(templateAPI.listMarketplace as any).mockRejectedValue(new Error('fail'))
    render(<Marketplace />)
    await waitFor(() => {
      expect(screen.getByText('Failed to load templates')).toBeInTheDocument()
    })
  })

  it('shows download count on template card', async () => {
    render(<Marketplace />)
    await waitFor(() => {
      expect(screen.getByText('42')).toBeInTheDocument()
    })
  })
})


