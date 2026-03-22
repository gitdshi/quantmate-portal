import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@test/support/utils'
import PaperTrading from '@/pages/PaperTrading'

vi.mock('@/components/charts/LineChart', () => ({ default: (props: any) => <div data-testid="line-chart">{props.title}</div> }))

vi.mock('@/lib/api', () => ({
  api: {
    get: vi.fn(),
    interceptors: { request: { use: vi.fn() }, response: { use: vi.fn() } },
  },
  paperTradingAPI: {
    listSessions: vi.fn(),
    createSession: vi.fn(),
    stopSession: vi.fn(),
  },
  strategiesAPI: {
    list: vi.fn(),
  },
}))

import { paperTradingAPI } from '@/lib/api'

describe('PaperTrading Page', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    ;(paperTradingAPI.listSessions as any).mockResolvedValue({ data: [] })
  })

  it('renders heading', () => {
    render(<PaperTrading />)
    expect(screen.getByText('模拟交易')).toBeInTheDocument()
  })

  it('shows all 4 tabs', () => {
    render(<PaperTrading />)
    expect(screen.getByText('模拟部署')).toBeInTheDocument()
    expect(screen.getByText('模拟委托')).toBeInTheDocument()
    expect(screen.getByText('模拟持仓')).toBeInTheDocument()
    expect(screen.getByText('绩效概览')).toBeInTheDocument()
  })

  it('shows new deployment button', () => {
    render(<PaperTrading />)
    expect(screen.getByText('新建模拟')).toBeInTheDocument()
  })

  it('switches to orders tab', () => {
    render(<PaperTrading />)
    fireEvent.click(screen.getByText('模拟委托'))
    expect(screen.getByText('贵州茅台')).toBeInTheDocument()
  })

  it('switches to positions tab', () => {
    render(<PaperTrading />)
    fireEvent.click(screen.getByText('模拟持仓'))
    expect(screen.getByText('代码')).toBeInTheDocument()
  })

  it('switches to performance tab', () => {
    render(<PaperTrading />)
    fireEvent.click(screen.getByText('绩效概览'))
    expect(screen.getByText('总收益')).toBeInTheDocument()
  })
})
