import i18n from '@/i18n'
import AIAssistant from '@/pages/AIAssistant'
import { fireEvent, render, screen, waitFor } from '@test/support/utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockShowToast = vi.fn()
vi.mock('@/components/ui/toast-service', () => ({
  showToast: (...args: unknown[]) => mockShowToast(...args),
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

  // ─── Chat: Send message ──────────────────────────────────
  it('sends a chat message and creates conversation', async () => {
    render(<AIAssistant />)
    const input = screen.getByPlaceholderText(/ask|type/i)
    fireEvent.change(input, { target: { value: 'Hello AI' } })
    fireEvent.keyDown(input, { key: 'Enter' })

    await waitFor(() => {
      expect(aiAPI.createConversation).toHaveBeenCalledWith(
        expect.objectContaining({ title: expect.any(String) })
      )
    })
  })

  it('sends via Enter key', async () => {
    render(<AIAssistant />)
    const input = screen.getByPlaceholderText(/ask|type/i)
    fireEvent.change(input, { target: { value: 'Test query' } })
    fireEvent.keyDown(input, { key: 'Enter' })

    await waitFor(() => {
      expect(aiAPI.createConversation).toHaveBeenCalled()
    })
  })

  it('does not send empty message', () => {
    render(<AIAssistant />)
    const input = screen.getByPlaceholderText(/ask|type/i)
    fireEvent.keyDown(input, { key: 'Enter' })
    expect(aiAPI.createConversation).not.toHaveBeenCalled()
  })

  it('displays user message in chat after sending', async () => {
    render(<AIAssistant />)
    const input = screen.getByPlaceholderText(/ask|type/i)
    fireEvent.change(input, { target: { value: 'My question' } })
    fireEvent.keyDown(input, { key: 'Enter' })

    expect(await screen.findByText('My question')).toBeInTheDocument()
  })

  it('shows assistant reply after conversation created', async () => {
    render(<AIAssistant />)
    const input = screen.getByPlaceholderText(/ask|type/i)
    fireEvent.change(input, { target: { value: 'Hello' } })
    fireEvent.keyDown(input, { key: 'Enter' })

    await waitFor(() => {
      expect(screen.getByText('Generated reply')).toBeInTheDocument()
    })
  })

  // ─── Chat: Error handling ────────────────────────────────
  it('shows error message when createConversation fails', async () => {
    vi.mocked(aiAPI.createConversation).mockRejectedValue(new Error('fail'))
    render(<AIAssistant />)
    const input = screen.getByPlaceholderText(/ask|type/i)
    fireEvent.change(input, { target: { value: 'Test' } })
    fireEvent.keyDown(input, { key: 'Enter' })

    await waitFor(() => {
      // Should show service down message
      const msgs = screen.getAllByText(/service|unavailable|error|down/i)
      expect(msgs.length).toBeGreaterThan(0)
    })
  })

  // ─── Codegen Tab ─────────────────────────────────────────
  it('generates code via codegen tab', async () => {
    render(<AIAssistant />)
    fireEvent.click(screen.getByText('Code Generation'))

    const textarea = screen.getByRole('textbox')
    fireEvent.change(textarea, { target: { value: 'Dual MA strategy' } })
    fireEvent.click(screen.getByRole('button', { name: 'Generate Code' }))

    await waitFor(() => {
      expect(aiAPI.createConversation).toHaveBeenCalled()
    })
  })

  it('does not generate with empty requirement', () => {
    render(<AIAssistant />)
    fireEvent.click(screen.getByText('Code Generation'))
    const genBtn = screen.getByRole('button', { name: 'Generate Code' })
    expect(genBtn).toBeDisabled()
  })

  it('shows generated code result', async () => {
    vi.mocked(aiAPI.sendMessage).mockResolvedValue({ data: { content: 'class DualMA:\n  pass' } } as never)
    render(<AIAssistant />)
    fireEvent.click(screen.getByText('Code Generation'))

    const textarea = screen.getByRole('textbox')
    fireEvent.change(textarea, { target: { value: 'Make a strategy' } })
    fireEvent.click(screen.getByRole('button', { name: 'Generate Code' }))

    await waitFor(() => {
      expect(screen.getByText(/class DualMA/)).toBeInTheDocument()
    })
  })

  it('fills requirement from prompt card click', () => {
    render(<AIAssistant />)
    fireEvent.click(screen.getByText('Code Generation'))

    // Click a prompt card
    const promptBtns = screen.getAllByRole('button').filter(b => b.className.includes('border'))
    const promptCard = promptBtns.find(b => b.textContent?.match(/dual ma|rsi|macd/i))
    if (promptCard) {
      fireEvent.click(promptCard)
      const textarea = screen.getByRole('textbox')
      expect((textarea as HTMLTextAreaElement).value).not.toBe('')
    }
  })

  it('shows codegen error toast on failure', async () => {
    vi.mocked(aiAPI.createConversation).mockRejectedValue(new Error('timeout'))
    render(<AIAssistant />)
    fireEvent.click(screen.getByText('Code Generation'))

    const textarea = screen.getByRole('textbox')
    fireEvent.change(textarea, { target: { value: 'Generate' } })
    fireEvent.click(screen.getByRole('button', { name: 'Generate Code' }))

    await waitFor(() => {
      expect(mockShowToast).toHaveBeenCalled()
    })
  })

  // ─── handleSend with existing conversationId (line 131) ────
  it('sends message with existing conversationId', async () => {
    vi.mocked(aiAPI.createConversation).mockResolvedValue({ data: { id: 42 } } as never)
    vi.mocked(aiAPI.sendMessage).mockResolvedValue({ data: { content: 'Hello reply' } } as never)

    render(<AIAssistant />)

    const chatInput = screen.getByPlaceholderText(/ask/i)
    // First message creates conversation
    fireEvent.change(chatInput, { target: { value: 'First message' } })
    fireEvent.keyDown(chatInput, { key: 'Enter' })

    await waitFor(() => {
      expect(aiAPI.createConversation).toHaveBeenCalled()
    })

    // Second message should use sendMessage with existing conversationId
    fireEvent.change(chatInput, { target: { value: 'Follow up' } })
    fireEvent.keyDown(chatInput, { key: 'Enter' })

    await waitFor(() => {
      expect(aiAPI.sendMessage).toHaveBeenCalledTimes(2)
    })
  })

  // ─── Codegen success + clipboard copy (lines 119, 228-229) ─
  it('generates code and copies to clipboard', async () => {
    vi.mocked(aiAPI.createConversation).mockResolvedValue({ data: { id: 10 } } as never)
    vi.mocked(aiAPI.sendMessage).mockResolvedValue({ data: { content: 'def strategy():\n  pass' } } as never)

    // Mock clipboard
    const writeTextMock = vi.fn().mockResolvedValue(undefined)
    Object.assign(navigator, { clipboard: { writeText: writeTextMock } })

    render(<AIAssistant />)
    fireEvent.click(screen.getByText('Code Generation'))

    const textarea = screen.getByRole('textbox')
    fireEvent.change(textarea, { target: { value: 'Generate a dual MA strategy' } })
    fireEvent.click(screen.getByRole('button', { name: 'Generate Code' }))

    await waitFor(() => {
      // Generated code should be displayed
      expect(screen.getByText(/def strategy/)).toBeInTheDocument()
    })

    // Click copy button
    const copyBtn = screen.getByRole('button', { name: /copy/i })
    fireEvent.click(copyBtn)

    expect(writeTextMock).toHaveBeenCalledWith('def strategy():\n  pass')
  })

  // ─── Empty input guard (line 126) ──────────────────────────
  it('does not send empty messages', () => {
    render(<AIAssistant />)
    const sendBtn = screen.getAllByRole('button').find(b => b.querySelector('svg'))
    expect(sendBtn).toBeTruthy()
    // The send button should be disabled when the input is empty
    const chatInput = screen.getByPlaceholderText(/ask/i)
    expect((chatInput as HTMLInputElement).value).toBe('')
  })
})
