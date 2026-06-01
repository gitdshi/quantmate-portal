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

    expect(screen.getByRole('heading', { name: /Auto Pilot/ })).toBeInTheDocument()
    expect(await screen.findByRole('heading', { name: /Mining Runs/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Start Mining/ })).toBeInTheDocument()
    expect(screen.getByDisplayValue('OpenCode AI / MiniMax M2.5 Free')).toBeInTheDocument()
  })

  it('renders Chinese copy after switching language', async () => {
    localStorage.setItem('quantmate-lang', 'zh')
    await i18n.changeLanguage('zh')

    render(<AutoPilot />)

    expect(screen.getByRole('heading', { name: '策略领航' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Auto Pilot' })).not.toBeInTheDocument()
    expect(await screen.findByRole('heading', { name: '挖掘运行记录' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '数据目录' }))
    expect(await screen.findByText(/共 2 个数值字段，来源于 tushare/i)).toBeInTheDocument()
  })

  it('opens run details in a modal after selecting a run id', async () => {
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
      expect(screen.getByText('run-12345678')).toBeInTheDocument()
    })
  })

  it('starts a mining run with the selected form values', async () => {
    vi.mocked(rdagentAPI.startMining).mockResolvedValue({ data: { run_id: 'run-new' } } as never)

    const { container } = render(<AutoPilot />)

    const selects = screen.getAllByRole('combobox')
    const maxIterationsInput = screen.getByDisplayValue('10')
    const dateInputs = container.querySelectorAll('input[type="date"]')

    fireEvent.change(selects[0], { target: { value: 'fin_model' } })
    fireEvent.change(maxIterationsInput, { target: { value: '12' } })
    fireEvent.change(selects[1], { target: { value: 'gpt-4o' } })
    fireEvent.change(selects[2], { target: { value: 'csi500' } })
    fireEvent.change(dateInputs[0], { target: { value: '2024-01-01' } })
    fireEvent.change(dateInputs[1], { target: { value: '2024-12-31' } })
    fireEvent.click(screen.getByRole('button', { name: 'Start Mining' }))

    await waitFor(() => {
      expect(rdagentAPI.startMining).toHaveBeenCalledWith({
        scenario: 'fin_model',
        max_iterations: 12,
        llm_model: 'gpt-4o',
        universe: 'csi500',
        start_date: '2024-01-01',
        end_date: '2024-12-31',
      })
    })
  })

  it('cancels a running mining run', async () => {
    vi.mocked(rdagentAPI.cancelRun).mockResolvedValue({ data: {} } as never)
    vi.mocked(rdagentAPI.listRuns).mockResolvedValue({
      data: [
        {
          run_id: 'run-running-1',
          scenario: 'fin_factor',
          status: 'running',
          current_iteration: 1,
          total_iterations: 5,
          created_at: '2024-01-01T00:00:00Z',
        },
      ],
    } as never)

    render(<AutoPilot />)

    fireEvent.click(await screen.findByRole('button', { name: 'Cancel run' }))

    await waitFor(() => {
      expect(rdagentAPI.cancelRun).toHaveBeenCalledWith('run-running-1')
    })
  })

  it('imports a discovered factor from the run detail modal', async () => {
    vi.mocked(rdagentAPI.importFactor).mockResolvedValue({ data: {} } as never)
    vi.mocked(rdagentAPI.listRuns).mockResolvedValue({
      data: [
        {
          run_id: 'run-87654321',
          scenario: 'fin_factor',
          status: 'completed',
          current_iteration: 5,
          total_iterations: 5,
          created_at: '2024-01-01T00:00:00Z',
        },
      ],
    } as never)
    vi.mocked(rdagentAPI.getDiscoveredFactors).mockResolvedValue({
      data: [
        {
          id: 7,
          run_id: 'run-87654321',
          factor_name: 'alpha_signal',
          expression: 'close / volume',
          ic_mean: 0.1234,
          icir: 1.2345,
          sharpe: 0.9876,
          status: 'completed',
          created_at: '2024-01-02T00:00:00Z',
        },
      ],
    } as never)

    render(<AutoPilot />)

    fireEvent.click(await screen.findByRole('button', { name: /run-8765/i }))
    fireEvent.click(await screen.findByRole('button', { name: 'Import' }))

    await waitFor(() => {
      expect(rdagentAPI.importFactor).toHaveBeenCalledWith('run-87654321', 7)
    })
  })

  it('paginates mining runs', async () => {
    vi.mocked(rdagentAPI.listRuns).mockResolvedValue({
      data: Array.from({ length: 11 }, (_, index) => ({
        run_id: `run-${String(index).padStart(8, '0')}`,
        scenario: 'fin_factor',
        status: 'completed',
        current_iteration: 1,
        total_iterations: 5,
        created_at: '2024-01-01T00:00:00Z',
      })),
    } as never)

    render(<AutoPilot />)

    expect(await screen.findByTitle('run-00000000')).toBeInTheDocument()
    expect(screen.queryByTitle('run-00000010')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: '2' }))

    await waitFor(() => {
      expect(screen.getByTitle('run-00000010')).toBeInTheDocument()
    })
  })
})