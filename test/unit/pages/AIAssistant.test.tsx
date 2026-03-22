import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@test/support/utils'
import AIAssistant from '@/pages/AIAssistant'

vi.mock('@/lib/api', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    interceptors: { request: { use: vi.fn() }, response: { use: vi.fn() } },
  },
  aiAPI: {
    chat: vi.fn(),
    generateCode: vi.fn(),
  },
}))

describe('AIAssistant Page', () => {
  it('renders heading', () => {
    render(<AIAssistant />)
    expect(screen.getByText('AI 智能助手')).toBeInTheDocument()
  })

  it('shows all 4 tabs', () => {
    render(<AIAssistant />)
    expect(screen.getByText('AI 对话')).toBeInTheDocument()
    expect(screen.getByText('代码生成')).toBeInTheDocument()
    expect(screen.getByText('智能洞察')).toBeInTheDocument()
    expect(screen.getByText('策略建议')).toBeInTheDocument()
  })

  it('shows initial assistant message in chat tab', () => {
    render(<AIAssistant />)
    expect(screen.getByText(/QuantMate AI 助手/)).toBeInTheDocument()
  })

  it('switches to codegen tab', () => {
    render(<AIAssistant />)
    fireEvent.click(screen.getByText('代码生成'))
    expect(screen.getByText('生成代码')).toBeInTheDocument()
  })

  it('switches to insight tab', () => {
    render(<AIAssistant />)
    fireEvent.click(screen.getByText('智能洞察'))
    expect(screen.getByText('市场情绪分析')).toBeInTheDocument()
  })

  it('switches to suggest tab', () => {
    render(<AIAssistant />)
    fireEvent.click(screen.getByText('策略建议'))
    expect(screen.getByText('双均线交叉优化')).toBeInTheDocument()
  })
})


