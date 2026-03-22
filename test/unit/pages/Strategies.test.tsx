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
}))

import { strategiesAPI, strategyCodeAPI } from '@/lib/api'

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

describe('Strategies Page', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    localStorage.setItem('quantmate-lang', 'en')
    await i18n.changeLanguage('en')

    ;(strategiesAPI.list as any).mockResolvedValue({ data: { data: mockList } })
    ;(strategiesAPI.get as any).mockResolvedValue({ data: mockDetail })
    ;(strategiesAPI.create as any).mockResolvedValue({
      data: { ...mockDetail, id: 11, name: 'MyStrategy', class_name: 'MyStrategy' },
    })
    ;(strategiesAPI.update as any).mockResolvedValue({ data: { ...mockDetail } })
    ;(strategiesAPI.delete as any).mockResolvedValue({ data: {} })
    ;(strategiesAPI.listBuiltin as any).mockResolvedValue({ data: mockBuiltins })

    ;(strategyCodeAPI.listCodeHistory as any).mockResolvedValue({ data: mockHistory })
    ;(strategyCodeAPI.lintPyright as any).mockResolvedValue({ data: { diagnostics: [] } })
    ;(strategyCodeAPI.parse as any).mockResolvedValue({ data: { classes: [] } })
    ;(strategyCodeAPI.getCodeHistory as any).mockResolvedValue({ data: mockHistory[0] })
    ;(strategyCodeAPI.restoreCodeHistory as any).mockResolvedValue({ data: {} })
  })

  it('loads strategy list, detail, and history from the real API shape', async () => {
    render(<Strategies />)

    expect(await screen.findByTestId('strategies-page')).toBeInTheDocument()

    await waitFor(() => {
      expect(strategiesAPI.list).toHaveBeenCalledTimes(1)
      expect(strategiesAPI.get).toHaveBeenCalledWith(1)
      expect(strategyCodeAPI.listCodeHistory).toHaveBeenCalledWith(1)
      expect(strategiesAPI.listBuiltin).toHaveBeenCalledTimes(1)
    })

    expect(await screen.findByDisplayValue('Momentum Alpha')).toBeInTheDocument()
    expect(screen.getByTestId('strategy-card-2')).toBeInTheDocument()
    expect(screen.getByTestId('strategy-parameters-json')).toHaveValue(
      JSON.stringify({ lookback: 20, threshold: 1.5 }, null, 2)
    )
  })

  it('allows editing strategy name and description before saving', async () => {
    render(<Strategies />)

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

    fireEvent.click(await screen.findByRole('button', { name: 'Templates' }))

    const grid = await screen.findByTestId('strategy-templates-grid')
    const firstCard = within(grid).getByTestId('template-card-dual-ma')
    fireEvent.click(within(firstCard).getByRole('button', { name: 'Use Template' }))

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
