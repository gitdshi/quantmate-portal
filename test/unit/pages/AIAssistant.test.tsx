import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@test/support/utils'
import i18n from '@/i18n'
import AIAssistant from '@/pages/AIAssistant'

vi.mock('@/components/ui/toast-service', () => ({
  showToast: vi.fn(),
}))

vi.mock('@/lib/api', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    interceptors: { request: { use: vi.fn() }, response: { use: vi.fn() } },
  },
  aiAPI: {
    listConversations: vi.fn(),
    createConversation: vi.fn(),
    sendMessage: vi.fn(),
  },
}))

import { aiAPI } from '@/lib/api'

describe('AIAssistant Page', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    localStorage.setItem('quantmate-lang', 'en')
    await i18n.changeLanguage('en')
    vi.mocked(aiAPI.listConversations).mockResolvedValue({ data: [] } as never)
    vi.mocked(aiAPI.createConversation).mockResolvedValue({ data: { id: 1, title: 'Chat' } } as never)
    vi.mocked(aiAPI.sendMessage).mockResolvedValue({ data: { content: 'Generated reply' } } as never)
  })

  it('renders heading', () => {
    render(<AIAssistant />)
    expect(screen.getByText('AI Assistant')).toBeInTheDocument()
  })

  it('shows all 4 tabs', () => {
    render(<AIAssistant />)
    expect(screen.getByText('AI Chat')).toBeInTheDocument()
    expect(screen.getByText('Code Generation')).toBeInTheDocument()
    expect(screen.getByText('Insights')).toBeInTheDocument()
    expect(screen.getByText('Strategy Ideas')).toBeInTheDocument()
  })

  it('shows initial assistant message in chat tab', async () => {
    render(<AIAssistant />)
    expect(await screen.findByText(/QuantMate AI assistant/i)).toBeInTheDocument()
  })

  it('switches to codegen tab', () => {
    render(<AIAssistant />)
    fireEvent.click(screen.getByText('Code Generation'))
    expect(screen.getByText('Generate Code')).toBeInTheDocument()
  })

  it('switches to insight tab', () => {
    render(<AIAssistant />)
    fireEvent.click(screen.getByText('Insights'))
    expect(screen.getByText('No AI insights yet. Use chat to request one.')).toBeInTheDocument()
  })

  it('switches to suggest tab', () => {
    render(<AIAssistant />)
    fireEvent.click(screen.getByText('Strategy Ideas'))
    expect(screen.getByText('No strategy suggestions yet. Use chat to request personalized ideas.')).toBeInTheDocument()
  })
})
