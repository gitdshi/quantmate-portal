import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@test/support/utils'
import Marketplace from '@/pages/Marketplace'

vi.mock('@/lib/api', () => ({
  api: {
    get: vi.fn(),
    interceptors: { request: { use: vi.fn() }, response: { use: vi.fn() } },
  },
  templateAPI: {
    list: vi.fn(),
  },
}))

import { templateAPI } from '@/lib/api'

describe('Marketplace Page', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    ;(templateAPI.list as any).mockResolvedValue({ data: [] })
  })

  it('renders heading', () => {
    render(<Marketplace />)
    expect(screen.getByText('策略市场')).toBeInTheDocument()
  })

  it('shows search input', () => {
    render(<Marketplace />)
    expect(screen.getByPlaceholderText('搜索策略模板...')).toBeInTheDocument()
  })

  it('shows category filter buttons', () => {
    render(<Marketplace />)
    expect(screen.getByText('全部')).toBeInTheDocument()
    expect(screen.getByText('趋势跟踪')).toBeInTheDocument()
    expect(screen.getByText('均值回归')).toBeInTheDocument()
    expect(screen.getByText('多因子')).toBeInTheDocument()
  })

  it('shows featured template card', () => {
    render(<Marketplace />)
    expect(screen.getByText('推荐')).toBeInTheDocument()
    expect(screen.getByText('双均线交叉策略')).toBeInTheDocument()
  })

  it('shows template grid with placeholder data', () => {
    render(<Marketplace />)
    expect(screen.getByText('RSI 超买超卖策略')).toBeInTheDocument()
    expect(screen.getByText('多因子选股模型')).toBeInTheDocument()
    expect(screen.getByText('使用模板')).toBeInTheDocument()
  })
})


