import i18n from '@/i18n'
import AutoPilot from '@/pages/AutoPilot'
import { fireEvent, render, screen } from '@test/support/utils'
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
  })

  it('renders Chinese copy after switching language', async () => {
    localStorage.setItem('quantmate-lang', 'zh')
    await i18n.changeLanguage('zh')

    render(<AutoPilot />)

    expect(screen.getByText('挖掘运行记录')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '数据目录' }))
    expect(await screen.findByText('共 2 个数值字段，来源于 tushare。')).toBeInTheDocument()
  })
})