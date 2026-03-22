import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@test/support/utils'
import Monitoring from '@/pages/Monitoring'

vi.mock('@/lib/api', () => ({
  api: {
    get: vi.fn(),
    interceptors: { request: { use: vi.fn() }, response: { use: vi.fn() } },
  },
  alertsAPI: {
    listActive: vi.fn(),
    listHistory: vi.fn(),
    listRules: vi.fn(),
    acknowledge: vi.fn(),
    createRule: vi.fn(),
    updateRule: vi.fn(),
  },
}))

import { alertsAPI } from '@/lib/api'

describe('Monitoring Page', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    ;(alertsAPI.listActive as any).mockResolvedValue({ data: [] })
    ;(alertsAPI.listHistory as any).mockResolvedValue({ data: [] })
    ;(alertsAPI.listRules as any).mockResolvedValue({ data: [] })
  })

  it('renders heading', () => {
    render(<Monitoring />)
    expect(screen.getByText('监控告警')).toBeInTheDocument()
  })

  it('shows all 4 tabs', () => {
    render(<Monitoring />)
    expect(screen.getByText('实时告警')).toBeInTheDocument()
    expect(screen.getByText('告警规则')).toBeInTheDocument()
    expect(screen.getByText('告警历史')).toBeInTheDocument()
    expect(screen.getByText('通知渠道')).toBeInTheDocument()
  })

  it('shows new rule button', () => {
    render(<Monitoring />)
    expect(screen.getByText('新建规则')).toBeInTheDocument()
  })

  it('shows stat cards on live tab', () => {
    render(<Monitoring />)
    expect(screen.getByText('活跃告警')).toBeInTheDocument()
    expect(screen.getByText('严重')).toBeInTheDocument()
    expect(screen.getByText('今日触发')).toBeInTheDocument()
    expect(screen.getByText('活跃规则')).toBeInTheDocument()
  })

  it('shows placeholder alert cards', () => {
    render(<Monitoring />)
    expect(screen.getByText('策略停止运行')).toBeInTheDocument()
    expect(screen.getByText('持仓集中度过高')).toBeInTheDocument()
  })

  it('switches to rules tab', () => {
    render(<Monitoring />)
    fireEvent.click(screen.getByText('告警规则'))
    expect(screen.getByText('规则名称')).toBeInTheDocument()
    expect(screen.getByText('策略停止告警')).toBeInTheDocument()
  })

  it('switches to channels tab', () => {
    render(<Monitoring />)
    fireEvent.click(screen.getByText('通知渠道'))
    expect(screen.getByText('微信机器人')).toBeInTheDocument()
    expect(screen.getByText('邮件通知')).toBeInTheDocument()
    expect(screen.getByText('短信通知')).toBeInTheDocument()
  })
})


