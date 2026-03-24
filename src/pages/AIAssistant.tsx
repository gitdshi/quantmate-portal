import { useMutation, useQuery } from '@tanstack/react-query'
import {
  BarChart3,
  Bot,
  Code2,
  Lightbulb,
  Paperclip,
  Send,
  Sparkles,
} from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import TabPanel from '../components/ui/TabPanel'
import { showToast } from '../components/ui/toast-service'
import { aiAPI } from '../lib/api'

interface Message {
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

export default function AIAssistant() {
  const { t, i18n } = useTranslation('social')
  const [activeTab, setActiveTab] = useState('chat')
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [codeReq, setCodeReq] = useState('')
  const [generatedCode, setGeneratedCode] = useState('')
  const [conversationId, setConversationId] = useState<number | null>(null)
  const chatEndRef = useRef<HTMLDivElement>(null)

  const tabs = [
    { key: 'chat', label: t('ai.tabs.chat'), icon: <Bot size={16} /> },
    { key: 'codegen', label: t('ai.tabs.codegen'), icon: <Code2 size={16} /> },
    { key: 'insight', label: t('ai.tabs.insight'), icon: <Lightbulb size={16} /> },
    { key: 'suggest', label: t('ai.tabs.suggest'), icon: <Sparkles size={16} /> },
  ]

  const promptCards = useMemo(
    () => [
      {
        label: t('ai.promptCards.dualMa.label'),
        prompt: t('ai.promptCards.dualMa.prompt'),
      },
      {
        label: t('ai.promptCards.rsi.label'),
        prompt: t('ai.promptCards.rsi.prompt'),
      },
      {
        label: t('ai.promptCards.macd.label'),
        prompt: t('ai.promptCards.macd.prompt'),
      },
    ],
    [i18n.language, t]
  )

  useEffect(() => {
    setMessages([{ role: 'assistant', content: t('ai.welcome'), timestamp: new Date() }])
  }, [i18n.language, t])

  useQuery<{ id: number; title: string }[]>({
    queryKey: ['ai-conversations'],
    queryFn: () =>
      aiAPI.listConversations().then((r) => {
        const d = r.data
        return Array.isArray(d) ? d : d?.data ?? []
      }),
  })

  const createConvMutation = useMutation({
    mutationFn: (msg: string) => aiAPI.createConversation({ title: msg.slice(0, 50) }),
    onSuccess: (res, msg) => {
      const conv = res.data
      const id = conv?.id ?? conv?.data?.id
      if (id) {
        setConversationId(id)
        sendMessageMutation.mutate({ conversationId: id, content: msg })
      }
    },
    onError: () => {
      setMessages((prev) => [...prev, { role: 'assistant', content: t('ai.serviceDown'), timestamp: new Date() }])
    },
  })

  const sendMessageMutation = useMutation({
    mutationFn: (data: { conversationId: number; content: string }) =>
      aiAPI.sendMessage(data.conversationId, { content: data.content }),
    onSuccess: (res) => {
      const reply = res.data?.content ?? res.data?.data?.content ?? t('ai.pendingReply')
      setMessages((prev) => [...prev, { role: 'assistant', content: reply, timestamp: new Date() }])
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    },
    onError: () => {
      setMessages((prev) => [...prev, { role: 'assistant', content: t('ai.serviceDown'), timestamp: new Date() }])
    },
  })

  const codeGenConvId = useRef<number | null>(null)

  const codeGenCreateMutation = useMutation({
    mutationFn: (req: string) => aiAPI.createConversation({ title: `${t('ai.codePrefix')}${req.slice(0, 30)}` }),
    onSuccess: (res, req) => {
      const conv = res.data
      const id = conv?.id ?? conv?.data?.id
      if (id) {
        codeGenConvId.current = id
        codeGenSendMutation.mutate({ conversationId: id, content: `${t('ai.codePromptPrefix')}${req}` })
      }
    },
    onError: () => showToast(t('ai.codeFailed'), 'error'),
  })

  const codeGenSendMutation = useMutation({
    mutationFn: (data: { conversationId: number; content: string }) =>
      aiAPI.sendMessage(data.conversationId, { content: data.content }),
    onSuccess: (res) => {
      const code = res.data?.content ?? res.data?.data?.content ?? '# TODO: AI generated code'
      setGeneratedCode(code)
    },
    onError: () => showToast(t('ai.codeFailed'), 'error'),
  })

  const handleSend = () => {
    if (!input.trim()) return
    const msg = input.trim()
    setMessages((prev) => [...prev, { role: 'user', content: msg, timestamp: new Date() }])
    setInput('')
    if (conversationId) {
      sendMessageMutation.mutate({ conversationId, content: msg })
    } else {
      createConvMutation.mutate(msg)
    }
  }

  const handleCodeGen = () => {
    if (!codeReq.trim()) return
    codeGenCreateMutation.mutate(codeReq.trim())
  }

  const isChatPending = createConvMutation.isPending || sendMessageMutation.isPending
  const isCodeGenPending = codeGenCreateMutation.isPending || codeGenSendMutation.isPending

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t('ai.title')}</h1>
          <p className="text-sm text-muted-foreground">{t('ai.subtitle')}</p>
        </div>
      </div>

      <TabPanel tabs={tabs} activeTab={activeTab} onChange={setActiveTab}>
        {activeTab === 'chat' && (
          <div className="flex flex-col h-[60vh]">
            <div className="flex-1 overflow-y-auto space-y-4 p-4 rounded-lg border border-border bg-card">
              {messages.map((msg, index) => (
                <div key={index} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[75%] rounded-lg px-4 py-2.5 text-sm ${msg.role === 'user' ? 'bg-primary text-white' : 'bg-muted text-foreground'}`}>
                    {msg.content.includes('```') ? (
                      <pre className="whitespace-pre-wrap font-mono text-xs mt-1 bg-black/10 dark:bg-white/10 rounded p-2">{msg.content}</pre>
                    ) : (
                      <p className="whitespace-pre-wrap">{msg.content}</p>
                    )}
                    <p className="text-[10px] opacity-60 mt-1">{msg.timestamp.toLocaleTimeString()}</p>
                  </div>
                </div>
              ))}
              {isChatPending && (
                <div className="flex justify-start">
                  <div className="bg-muted rounded-lg px-4 py-2.5 text-sm">
                    <span className="animate-pulse">{t('ai.thinking')}</span>
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            <div className="flex items-center gap-2 mt-3">
              <button className="p-2 rounded-md hover:bg-muted text-muted-foreground"><Paperclip size={18} /></button>
              <button className="p-2 rounded-md hover:bg-muted text-muted-foreground"><BarChart3 size={18} /></button>
              <input
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={(event) => event.key === 'Enter' && !event.shiftKey && handleSend()}
                placeholder={t('ai.askPlaceholder')}
                className="flex-1 px-4 py-2.5 text-sm rounded-md border border-border bg-background"
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() || isChatPending}
                className="p-2.5 rounded-md bg-primary text-white hover:opacity-90 disabled:opacity-50"
              >
                <Send size={18} />
              </button>
            </div>
          </div>
        )}

        {activeTab === 'codegen' && (
          <div className="space-y-4">
            <div className="rounded-lg border border-border bg-card p-5">
              <h3 className="font-semibold text-card-foreground mb-3">{t('ai.requirement')}</h3>
              <textarea
                value={codeReq}
                onChange={(event) => setCodeReq(event.target.value)}
                placeholder={t('ai.requirementPlaceholder')}
                className="w-full h-28 px-3 py-2 text-sm rounded-md border border-border bg-background resize-none"
              />
              <div className="flex items-center gap-2 mt-3">
                <button
                  onClick={handleCodeGen}
                  disabled={!codeReq.trim() || isCodeGenPending}
                  className="px-4 py-2 text-sm rounded-md bg-primary text-white hover:opacity-90 disabled:opacity-50"
                >
                  {isCodeGenPending ? t('ai.generating') : t('ai.generateCode')}
                </button>
              </div>
            </div>

            {generatedCode && (
              <div className="rounded-lg border border-border bg-card p-5">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-card-foreground">{t('ai.result')}</h3>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(generatedCode)
                      showToast(t('ai.copied'), 'success')
                    }}
                    className="text-xs px-2 py-1 rounded border border-border hover:bg-muted"
                  >
                    {t('ai.copyCode')}
                  </button>
                </div>
                <pre className="bg-muted rounded-md p-4 text-xs font-mono overflow-x-auto whitespace-pre-wrap">{generatedCode}</pre>
              </div>
            )}

            <div className="rounded-lg border border-border bg-card p-5">
              <h3 className="font-semibold text-card-foreground mb-3">{t('ai.quickPrompts')}</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {promptCards.map((item) => (
                  <button
                    key={item.label}
                    onClick={() => setCodeReq(item.prompt)}
                    className="text-left px-3 py-2 text-sm rounded-md border border-border hover:bg-muted hover:border-primary"
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'insight' && (
          <p className="text-center text-muted-foreground py-8">{t('ai.noInsight')}</p>
        )}
        {activeTab === 'suggest' && (
          <p className="text-center text-muted-foreground py-8">{t('ai.noSuggest')}</p>
        )}
      </TabPanel>
    </div>
  )
}
