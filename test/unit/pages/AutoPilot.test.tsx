import i18n from '@/i18n'
import AutoPilot from '@/pages/AutoPilot'
import { fireEvent, render, screen, waitFor } from '@test/support/utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/components/ui/toast-service', () => ({
  showToast: vi.fn(),
}))

vi.mock('@/lib/api', () => ({
  api: {
    get: vi.fn(),
    interceptors: { request: { use: vi.fn() }, response: { use: vi.fn() } },
  },
  rdagentAPI: {
    startMining: vi.fn(),
    listRuns: vi.fn(),
    getIterations: vi.fn(),
    getDiscoveredFactors: vi.fn(),
    cancelRun: vi.fn(),
    importFactor: vi.fn(),
    getDataCatalog: vi.fn(),
  },
}))

import { rdagentAPI } from '@/lib/api'

describe('AutoPilot Page', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    localStorage.setItem('quantmate-lang', 'en')
    await i18n.changeLanguage('en')

    vi.mocked(rdagentAPI.listRuns).mockResolvedValue({ data: [] } as never)
    vi.mocked(rdagentAPI.getIterations).mockResolvedValue({ data: [] } as never)
    vi.mocked(rdagentAPI.getDiscoveredFactors).mockResolvedValue({ data: [] } as never)
    vi.mocked(rdagentAPI.getDataCatalog).mockResolvedValue({
      data: {
        categories: {
          alpha: ['close', 'volume'],
        },
        total_fields: 2,
        sources: ['tushare'],
      },
    } as never)
  })

  it('renders English copy and controls', async () => {
    render(<AutoPilot />)

    expect(screen.getByRole('heading', { name: 'Auto Pilot' })).toBeInTheDocument()
    expect(await screen.findByRole('heading', { name: 'Mining Runs' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Start Mining' })).toBeInTheDocument()
    expect(screen.getByDisplayValue('OpenCode AI / MiniMax M2.5 Free')).toBeInTheDocument()
  })

  it('renders Chinese copy after switching language', async () => {
    localStorage.setItem('quantmate-lang', 'zh')
    await i18n.changeLanguage('zh')

    render(<AutoPilot />)

    expect(screen.getByText('挖掘运行记录')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '数据目录' }))
    expect(await screen.findByText('共 2 个数值字段，来源于 tushare。')).toBeInTheDocument()
  })

  it('scrolls to run details after selecting a run id', async () => {
    const scrollIntoView = vi.fn()
    Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
      configurable: true,
      value: scrollIntoView,
    })

    vi.mocked(rdagentAPI.listRuns).mockResolvedValue({
      data: [
        {
          run_id: 'run-12345678',
          scenario: 'fin_factor',
          status: 'completed',
          current_iteration: 2,
          total_iterations: 5,
          created_at: '2024-01-01T00:00:00Z',
        },
      ],
    } as never)

    render(<AutoPilot />)

    fireEvent.click(await screen.findByRole('button', { name: /run-1234/i }))

    await waitFor(() => {
      expect(rdagentAPI.getIterations).toHaveBeenCalledWith('run-12345678')
      expect(rdagentAPI.getDiscoveredFactors).toHaveBeenCalledWith('run-12345678')
      expect(scrollIntoView).toHaveBeenCalled()
    })
  })
})