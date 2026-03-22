import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@test/support/utils'
import Settings from '@/pages/Settings'

vi.mock('@/lib/api', () => ({
  api: {
    get: vi.fn(),
    interceptors: { request: { use: vi.fn() }, response: { use: vi.fn() } },
  },
  systemAPI: { healthCheck: vi.fn() },
  dataSourceAPI: {},
}))

import { systemAPI } from '@/lib/api'

describe('Settings Page', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    ;(systemAPI.healthCheck as any).mockResolvedValue({ data: { status: '正常', version: 'v1.2.0' } })
  })

  it('renders heading', () => {
    render(<Settings />)
    expect(screen.getByText('系统设置')).toBeInTheDocument()
  })

  it('shows all 6 tabs', () => {
    render(<Settings />)
    expect(screen.getByText('常规设置')).toBeInTheDocument()
    expect(screen.getByText('数据源')).toBeInTheDocument()
    expect(screen.getByText('交易参数')).toBeInTheDocument()
    expect(screen.getByText('通知设置')).toBeInTheDocument()
    expect(screen.getByText('界面设置')).toBeInTheDocument()
    expect(screen.getByText('系统信息')).toBeInTheDocument()
  })

  it('shows save button', () => {
    render(<Settings />)
    expect(screen.getByText('保存设置')).toBeInTheDocument()
  })

  it('shows general settings by default', () => {
    render(<Settings />)
    expect(screen.getByText('语言')).toBeInTheDocument()
    expect(screen.getByText('时区')).toBeInTheDocument()
    expect(screen.getByText('日期格式')).toBeInTheDocument()
    expect(screen.getByText('默认货币')).toBeInTheDocument()
    expect(screen.getByText('自动保存')).toBeInTheDocument()
  })

  it('switches to datasource tab', () => {
    render(<Settings />)
    fireEvent.click(screen.getByText('数据源'))
    expect(screen.getByText('Tushare Pro')).toBeInTheDocument()
    expect(screen.getByText('AkShare')).toBeInTheDocument()
  })

  it('shows trading config tab', () => {
    render(<Settings />)
    fireEvent.click(screen.getByText('交易参数'))
    expect(screen.getByText('交易参数')).toBeInTheDocument()
    expect(screen.getByText('风控参数')).toBeInTheDocument()
  })

  it('shows notification settings tab', () => {
    render(<Settings />)
    fireEvent.click(screen.getByText('通知设置'))
    expect(screen.getByText('策略状态变更通知')).toBeInTheDocument()
    expect(screen.getByText('交易执行通知')).toBeInTheDocument()
    expect(screen.getByText('风控告警通知')).toBeInTheDocument()
  })

  it('shows UI settings tab', () => {
    render(<Settings />)
    fireEvent.click(screen.getByText('界面设置'))
    expect(screen.getByText('主题模式')).toBeInTheDocument()
    expect(screen.getByText('主题色')).toBeInTheDocument()
    expect(screen.getByText('图表库')).toBeInTheDocument()
  })

  it('shows system info tab with health data', async () => {
    render(<Settings />)
    fireEvent.click(screen.getByText('系统信息'))
    expect(screen.getByText('系统状态')).toBeInTheDocument()
    expect(screen.getByText('CPU')).toBeInTheDocument()
    expect(screen.getByText('内存')).toBeInTheDocument()
    expect(screen.getByText('磁盘')).toBeInTheDocument()
  })
})


