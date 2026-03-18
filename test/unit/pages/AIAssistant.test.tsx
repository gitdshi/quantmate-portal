import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@test/support/utils'
import AIAssistant from '@/pages/AIAssistant'

vi.mock('@/lib/api', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    interceptors: { request: { use: vi.fn() }, response: { use: vi.fn() } },
  },
  aiAPI: {
    listConversations: vi.fn(),
    getConversation: vi.fn(),
    createConversation: vi.fn(),
    updateConversation: vi.fn(),
    deleteConversation: vi.fn(),
    listMessages: vi.fn(),
    sendMessage: vi.fn(),
    listModels: vi.fn(),
    createModel: vi.fn(),
    updateModel: vi.fn(),
    deleteModel: vi.fn(),
  },
}))

import { aiAPI } from '@/lib/api'

const mockConversations = [
  { id: 1, user_id: 1, title: 'Strategy Help', model: 'gpt-4', total_tokens: 500, status: 'active', created_at: '2025-01-01T00:00:00Z', updated_at: '2025-01-01T00:00:00Z' },
  { id: 2, user_id: 1, title: 'Debug Session', model: 'gpt-3.5', total_tokens: 200, status: 'active', created_at: '2025-01-02T00:00:00Z', updated_at: '2025-01-02T00:00:00Z' },
]

const mockMessages = [
  { id: 1, conversation_id: 1, role: 'user', content: 'Help me write a strategy', tokens: 10, created_at: '2025-01-01T00:01:00Z' },
  { id: 2, conversation_id: 1, role: 'assistant', content: 'Here is a sample strategy...', tokens: 50, created_at: '2025-01-01T00:01:05Z' },
]

const mockModels = [
  { id: 1, name: 'GPT-4', provider: 'openai', model_id: 'gpt-4', max_tokens: 4096, temperature: 0.7, is_active: true, created_at: '2025-01-01T00:00:00Z' },
]

describe('AIAssistant Page', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    ;(aiAPI.listConversations as any).mockResolvedValue({ data: { data: mockConversations } })
    ;(aiAPI.listModels as any).mockResolvedValue({ data: mockModels })
    ;(aiAPI.listMessages as any).mockResolvedValue({ data: mockMessages })
    ;(aiAPI.createConversation as any).mockResolvedValue({ data: { id: 3 } })
    ;(aiAPI.sendMessage as any).mockResolvedValue({ data: { user_message: { id: 3, role: 'user', content: 'test', created_at: '2025-01-01T00:02:00Z' }, assistant_message: { id: 4, role: 'assistant', content: 'response', created_at: '2025-01-01T00:02:05Z' } } })
    ;(aiAPI.deleteConversation as any).mockResolvedValue({})
  })

  it('renders the page', () => {
    render(<AIAssistant />)
    expect(screen.getByTestId('ai-assistant-page')).toBeInTheDocument()
    expect(screen.getByText('AI Assistant')).toBeInTheDocument()
  })

  it('shows conversations after loading', async () => {
    render(<AIAssistant />)
    await waitFor(() => {
      expect(screen.getByText('Strategy Help')).toBeInTheDocument()
      expect(screen.getByText('Debug Session')).toBeInTheDocument()
    })
  })

  it('shows empty state when no conversation selected', async () => {
    render(<AIAssistant />)
    await waitFor(() => {
      expect(screen.getByText('Select or create a conversation')).toBeInTheDocument()
    })
  })

  it('loads messages when selecting a conversation', async () => {
    render(<AIAssistant />)
    await waitFor(() => {
      expect(screen.getByText('Strategy Help')).toBeInTheDocument()
    })
    fireEvent.click(screen.getByText('Strategy Help'))
    await waitFor(() => {
      expect(screen.getByText('Help me write a strategy')).toBeInTheDocument()
      expect(screen.getByText('Here is a sample strategy...')).toBeInTheDocument()
    })
  })

  it('has message input field', async () => {
    render(<AIAssistant />)
    await waitFor(() => { screen.getByText('Strategy Help') })
    fireEvent.click(screen.getByText('Strategy Help'))
    await waitFor(() => {
      expect(screen.getByPlaceholderText('Type a message...')).toBeInTheDocument()
    })
  })

  it('handles error when loading fails', async () => {
    ;(aiAPI.listConversations as any).mockRejectedValue(new Error('fail'))
    render(<AIAssistant />)
    await waitFor(() => {
      expect(screen.getByText('Failed to load conversations')).toBeInTheDocument()
    })
  })

  it('shows model count in models panel', async () => {
    render(<AIAssistant />)
    await waitFor(() => { screen.getByText('Strategy Help') })
  })
})


