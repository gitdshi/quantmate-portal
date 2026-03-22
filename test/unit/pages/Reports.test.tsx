import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@test/support/utils'
import Reports from '@/pages/Reports'

vi.mock('@/components/charts/BarChart', () => ({ default: (props: any) => <div data-testid="bar-chart">{props.title}</div> }))

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
  beforeEach(() => {
    vi.clearAllMocks()
    ;(reportsAPI.list as any).mockResolvedValue({ data: [] })
  })

  it('renders heading', () => {
    render(<Reports />)
    expect(screen.getByText('报告复盘')).toBeInTheDocument()
  })

  it('shows all 4 tabs', () => {
    render(<Reports />)
    expect(screen.getByText('绩效报告')).toBeInTheDocument()
    expect(screen.getByText('交易复盘')).toBeInTheDocument()
    expect(screen.getByText('归因分析')).toBeInTheDocument()
    expect(screen.getByText('报告列表')).toBeInTheDocument()
  })

  it('shows generate button', () => {
    render(<Reports />)
    expect(screen.getByText('生成报告')).toBeInTheDocument()
  })

  it('shows perf stat cards on default tab', () => {
    render(<Reports />)
    expect(screen.getByText('月收益率')).toBeInTheDocument()
    expect(screen.getByText('基准收益')).toBeInTheDocument()
    expect(screen.getByText('超额收益')).toBeInTheDocument()
    expect(screen.getByText('最大回撤')).toBeInTheDocument()
  })

  it('switches to review tab', () => {
    render(<Reports />)
    fireEvent.click(screen.getByText('交易复盘'))
    expect(screen.getByText('总交易次数')).toBeInTheDocument()
  })

  it('switches to attribution tab', () => {
    render(<Reports />)
    fireEvent.click(screen.getByText('归因分析'))
    expect(screen.getByText('收益归因')).toBeInTheDocument()
  })

  it('switches to list tab', () => {
    render(<Reports />)
    fireEvent.click(screen.getByText('报告列表'))
    expect(screen.getByText('报告名称')).toBeInTheDocument()
  })
})


