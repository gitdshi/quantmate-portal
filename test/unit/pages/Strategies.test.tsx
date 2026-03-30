import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor, within } from '@test/support/utils'

import i18n from '@/i18n'
import Strategies from '@/pages/Strategies'

vi.mock('@/lib/api', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
    interceptors: { request: { use: vi.fn() }, response: { use: vi.fn() } },
  },
  strategiesAPI: {
    list: vi.fn(),
    get: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    listBuiltin: vi.fn(),
  },
  strategyCodeAPI: {
    parse: vi.fn(),
    lintPyright: vi.fn(),
    listCodeHistory: vi.fn(),
    getCodeHistory: vi.fn(),
    restoreCodeHistory: vi.fn(),
  },
  templateAPI: {
    listMarketplace: vi.fn(),
    listMine: vi.fn(),
    get: vi.fn(),
    getRatings: vi.fn(),
    listComments: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    clone: vi.fn(),
    delete: vi.fn(),
    rate: vi.fn(),
    addComment: vi.fn(),
  },
}))

import { strategiesAPI, strategyCodeAPI, templateAPI } from '@/lib/api'

const mockList = [
  {
    id: 1,
    name: 'Momentum Alpha',
    class_name: 'MomentumAlphaStrategy',
    description: 'Primary production strategy',
    version: 3,
    is_active: true,
    created_at: '2025-03-01T09:00:00Z',
    updated_at: '2025-03-10T12:30:00Z',
  },
  {
    id: 2,
    name: 'Grid Neutral',
    class_name: 'GridNeutralStrategy',
    description: 'Range-bound mean reversion',
    version: 1,
    is_active: false,
    created_at: '2025-03-03T09:00:00Z',
    updated_at: '2025-03-08T08:00:00Z',
  },
]

const mockDetail = {
  id: 1,
  name: 'Momentum Alpha',
  class_name: 'MomentumAlphaStrategy',
  description: 'Primary production strategy',
  code: 'class MomentumAlphaStrategy:\n    pass\n',
  parameters: { lookback: 20, threshold: 1.5 },
  version: 3,
  is_active: true,
  user_id: 7,
  created_at: '2025-03-01T09:00:00Z',
  updated_at: '2025-03-10T12:30:00Z',
}

const mockHistory = [
  {
    id: 10,
    version: 3,
    created_at: '2025-03-10T12:30:00Z',
    code: 'class MomentumAlphaStrategy:\n    pass\n',
    parameters: { lookback: 20, threshold: 1.5 },
  },
]

const mockBuiltins = [
  {
    name: 'Dual MA Crossover',
    class_name: 'DualMAStrategy',
    description: 'Built-in trend strategy',
  },
]

const mockMarketplaceTemplates = [
  {
    id: 101,
    name: 'Dual MA Crossover',
    category: 'trend',
    description: 'Built-in trend strategy',
    code: 'class DualMAStrategy:\n    pass\n',
    default_params: { fast_window: 5, slow_window: 20 },
    visibility: 'public',
    downloads: 12,
  },
]

describe('Strategies Page', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    localStorage.setItem('quantmate-lang', 'en')
    await i18n.changeLanguage('en')

    vi.mocked(strategiesAPI.list).mockResolvedValue({ data: mockList } as never)
    vi.mocked(strategiesAPI.get).mockResolvedValue({ data: mockDetail } as never)
    vi.mocked(strategiesAPI.create).mockResolvedValue({
      data: { ...mockDetail, id: 11, name: 'MyStrategy', class_name: 'MyStrategy' },
    } as never)
    vi.mocked(strategiesAPI.update).mockResolvedValue({ data: { ...mockDetail } } as never)
    vi.mocked(strategiesAPI.delete).mockResolvedValue({ data: {} } as never)
    vi.mocked(strategiesAPI.listBuiltin).mockResolvedValue({ data: mockBuiltins } as never)

    vi.mocked(templateAPI.listMarketplace).mockResolvedValue({ data: mockMarketplaceTemplates } as never)
    vi.mocked(templateAPI.listMine).mockResolvedValue({ data: [] } as never)
    vi.mocked(templateAPI.get).mockResolvedValue({ data: mockMarketplaceTemplates[0] } as never)
    vi.mocked(templateAPI.getRatings).mockResolvedValue({
      data: { summary: { avg_rating: 4.5, count: 2 }, reviews: [] },
    } as never)
    vi.mocked(templateAPI.listComments).mockResolvedValue({ data: [] } as never)
    vi.mocked(templateAPI.create).mockResolvedValue({ data: mockMarketplaceTemplates[0] } as never)
    vi.mocked(templateAPI.update).mockResolvedValue({ data: mockMarketplaceTemplates[0] } as never)
    vi.mocked(templateAPI.clone).mockResolvedValue({ data: mockMarketplaceTemplates[0] } as never)
    vi.mocked(templateAPI.delete).mockResolvedValue({ data: {} } as never)
    vi.mocked(templateAPI.rate).mockResolvedValue({ data: {} } as never)
    vi.mocked(templateAPI.addComment).mockResolvedValue({ data: {} } as never)

    vi.mocked(strategyCodeAPI.listCodeHistory).mockResolvedValue({ data: mockHistory } as never)
    vi.mocked(strategyCodeAPI.lintPyright).mockResolvedValue({ data: { diagnostics: [] } } as never)
    vi.mocked(strategyCodeAPI.parse).mockResolvedValue({ data: { classes: [] } } as never)
    vi.mocked(strategyCodeAPI.getCodeHistory).mockResolvedValue({ data: mockHistory[0] } as never)
    vi.mocked(strategyCodeAPI.restoreCodeHistory).mockResolvedValue({ data: {} } as never)
  })

  it('loads strategy list, detail, and history from the real API shape', async () => {
    render(<Strategies />)

    expect(await screen.findByTestId('strategies-page')).toBeInTheDocument()

    await waitFor(() => {
      expect(strategiesAPI.list).toHaveBeenCalledTimes(1)
      expect(strategiesAPI.get).toHaveBeenCalledWith(1)
      expect(strategyCodeAPI.listCodeHistory).toHaveBeenCalledWith(1)
      expect(strategiesAPI.listBuiltin).toHaveBeenCalledTimes(1)
      expect(templateAPI.listMine).toHaveBeenCalledTimes(1)
      expect(templateAPI.listMarketplace).toHaveBeenCalledTimes(1)
    })

    fireEvent.click(await screen.findByRole('button', { name: 'Basic Info' }))
    expect(await screen.findByDisplayValue('Momentum Alpha')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Parameters' }))
    expect(screen.getByTestId('strategy-parameters-json')).toHaveValue(
      JSON.stringify({ lookback: 20, threshold: 1.5 }, null, 2)
    )

    expect(screen.getByTestId('strategy-card-2')).toBeInTheDocument()
  })

  it('allows editing strategy name and description before saving', async () => {
    render(<Strategies />)

    fireEvent.click(await screen.findByRole('button', { name: 'Basic Info' }))
    const nameInput = await screen.findByTestId('strategy-name-input')
    const descriptionInput = screen.getByTestId('strategy-description-input')

    fireEvent.change(nameInput, { target: { value: 'Momentum Alpha v2' } })
    fireEvent.change(descriptionInput, { target: { value: 'Updated editable description' } })
    fireEvent.click(screen.getByTestId('save-strategy-button'))

    await waitFor(() => {
      expect(strategyCodeAPI.lintPyright).toHaveBeenCalledWith({
        content: 'class MomentumAlphaStrategy:\n    pass\n',
      })
      expect(strategiesAPI.update).toHaveBeenCalledWith(
        1,
        expect.objectContaining({
          name: 'Momentum Alpha v2',
          description: 'Updated editable description',
          class_name: 'MomentumAlphaStrategy',
        })
      )
    })
  })

  it('creates a draft from the template library and saves it as a new strategy', async () => {
    render(<Strategies />)

    fireEvent.click(await screen.findByRole('button', { name: 'Template Library' }))
    fireEvent.click(await screen.findByRole('button', { name: 'From Marketplace' }))

    const grid = await screen.findByTestId('strategy-templates-grid')
    const firstCard = within(grid).getByTestId('template-card-marketplace-101')
    fireEvent.click(within(firstCard).getByRole('button', { name: 'Use Template' }))

    fireEvent.click(await screen.findByRole('button', { name: 'Basic Info' }))
    const draftNameInput = await screen.findByTestId('strategy-name-input')
    expect(draftNameInput).toHaveValue('MyStrategy')

    fireEvent.click(screen.getByTestId('save-strategy-button'))

    await waitFor(() => {
      expect(strategiesAPI.create).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'MyStrategy',
          class_name: 'MyStrategy',
        })
      )
    })
  })
})
