import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@test/support/utils'
import FactorLab from '@/pages/FactorLab'

vi.mock('@/components/charts/BarChart', () => ({ default: (props: any) => <div data-testid="bar-chart">{props.title}</div> }))
vi.mock('@/components/charts/HeatmapChart', () => ({ default: (props: any) => <div data-testid="heatmap-chart">{props.title}</div> }))
vi.mock('@/components/charts/LineChart', () => ({ default: (props: any) => <div data-testid="line-chart">{props.title}</div> }))

vi.mock('@/lib/api', () => ({
  api: {
    get: vi.fn(),
    interceptors: { request: { use: vi.fn() }, response: { use: vi.fn() } },
  },
  factorAPI: {
    list: vi.fn(),
    create: vi.fn(),
  },
}))

import { factorAPI } from '@/lib/api'

describe('FactorLab Page', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    ;(factorAPI.list as any).mockResolvedValue({ data: [] })
  })

  it('renders heading', () => {
    render(<FactorLab />)
    expect(screen.getByText('因子实验室')).toBeInTheDocument()
  })

  it('shows all 4 tabs', () => {
    render(<FactorLab />)
    expect(screen.getByText('因子库')).toBeInTheDocument()
    expect(screen.getByText('IC/IR 分析')).toBeInTheDocument()
    expect(screen.getByText('因子合成')).toBeInTheDocument()
    expect(screen.getByText('因子回测')).toBeInTheDocument()
  })

  it('shows new factor button', () => {
    render(<FactorLab />)
    expect(screen.getByText('新建因子')).toBeInTheDocument()
  })

  it('switches to IC/IR tab', () => {
    render(<FactorLab />)
    fireEvent.click(screen.getByText('IC/IR 分析'))
    expect(screen.getByText('均值 IC')).toBeInTheDocument()
  })

  it('switches to combine tab', () => {
    render(<FactorLab />)
    fireEvent.click(screen.getByText('因子合成'))
    expect(screen.getByText('等权合成')).toBeInTheDocument()
  })

  it('switches to backtest tab', () => {
    render(<FactorLab />)
    fireEvent.click(screen.getByText('因子回测'))
    expect(screen.getByText('年化收益')).toBeInTheDocument()
  })
})


