import { useMutation, useQuery } from '@tanstack/react-query'
import {
  Bot,
  Code2,
  Lightbulb,
  Paperclip,
  BarChart3,
  Send,
  Sparkles,
} from 'lucide-react'
import { useRef, useState } from 'react'

import TabPanel from '../components/ui/TabPanel'
import { showToast } from '../components/ui/Toast'
import { aiAPI } from '../lib/api'

interface Message {
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

const TABS = [
  { key: 'chat', label: 'AI 对话', icon: <Bot size={16} /> },
  { key: 'codegen', label: '代码生成', icon: <Code2 size={16} /> },
  { key: 'insight', label: '智能洞察', icon: <Lightbulb size={16} /> },
  { key: 'suggest', label: '策略建议', icon: <Sparkles size={16} /> },
]

export default function AIAssistant() {
  const [activeTab, setActiveTab] = useState('chat')
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: '你好！我是 QuantMate AI 助手，可以帮你分析策略、生成代码、解读行情。请问有什么可以帮助你的？', timestamp: new Date() },
  ])
  const [input, setInput] = useState('')
  const [codeReq, setCodeReq] = useState('')
  const [generatedCode, setGeneratedCode] = useState('')
  const [conversationId, setConversationId] = useState<number | null>(null)
  const chatEndRef = useRef<HTMLDivElement>(null)

  const { data: conversations = [] } = useQuery<{ id: number; title: string }[]>({
    queryKey: ['ai-conversations'],
    queryFn: () => aiAPI.listConversations().then((r) => {
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
      setMessages((prev) => [...prev, { role: 'assistant', content: '抱歉，AI 服务暂时不可用，请稍后重试。', timestamp: new Date() }])
    },
  })

  const sendMessageMutation = useMutation({
    mutationFn: (data: { conversationId: number; content: string }) => aiAPI.sendMessage(data.conversationId, { content: data.content }),
    onSuccess: (res) => {
      const reply = res.data?.content ?? res.data?.data?.content ?? '收到，正在思考中...'
      setMessages((prev) => [...prev, { role: 'assistant', content: reply, timestamp: new Date() }])
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    },
    onError: () => {
      setMessages((prev) => [...prev, { role: 'assistant', content: '抱歉，AI 服务暂时不可用，请稍后重试。', timestamp: new Date() }])
    },
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

  const codeGenConvId = useRef<number | null>(null)

  const codeGenCreateMutation = useMutation({
    mutationFn: (req: string) => aiAPI.createConversation({ title: `代码生成: ${req.slice(0, 30)}` }),
    onSuccess: (res, req) => {
      const conv = res.data
      const id = conv?.id ?? conv?.data?.id
      if (id) {
        codeGenConvId.current = id
        codeGenSendMutation.mutate({ conversationId: id, content: `请生成以下策略代码：${req}` })
      }
    },
    onError: () => showToast('代码生成失败', 'error'),
  })

  const codeGenSendMutation = useMutation({
    mutationFn: (data: { conversationId: number; content: string }) => aiAPI.sendMessage(data.conversationId, { content: data.content }),
    onSuccess: (res) => {
      const code = res.data?.content ?? res.data?.data?.content ?? '# TODO: AI generated code'
      setGeneratedCode(code)
    },
    onError: () => showToast('代码生成失败', 'error'),
  })

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
          <h1 className="text-2xl font-bold text-foreground">AI 助手</h1>
          <p className="text-sm text-muted-foreground">智能对话 · 代码生成 · 策略洞察</p>
        </div>
      </div>

      <TabPanel tabs={TABS} activeTab={activeTab} onChange={setActiveTab}>
        {/* ── Chat ─────────────────────────────────────── */}
        {activeTab === 'chat' && (
          <div className="flex flex-col h-[60vh]">
            <div className="flex-1 overflow-y-auto space-y-4 p-4 rounded-lg border border-border bg-card">
              {messages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
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
                <div className="flex justify-start"><div className="bg-muted rounded-lg px-4 py-2.5 text-sm"><span className="animate-pulse">思考中...</span></div></div>
              )}
              <div ref={chatEndRef} />
            </div>

            <div className="flex items-center gap-2 mt-3">
              <button className="p-2 rounded-md hover:bg-muted text-muted-foreground"><Paperclip size={18} /></button>
              <button className="p-2 rounded-md hover:bg-muted text-muted-foreground"><BarChart3 size={18} /></button>
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
                placeholder="输入你的问题..."
                className="flex-1 px-4 py-2.5 text-sm rounded-md border border-border bg-background"
              />
              <button onClick={handleSend} disabled={!input.trim() || isChatPending} className="p-2.5 rounded-md bg-primary text-white hover:opacity-90 disabled:opacity-50"><Send size={18} /></button>
            </div>
          </div>
        )}

        {/* ── Code Generation ─────────────────────────── */}
        {activeTab === 'codegen' && (
          <div className="space-y-4">
            <div className="rounded-lg border border-border bg-card p-5">
              <h3 className="font-semibold text-card-foreground mb-3">需求描述</h3>
              <textarea
                value={codeReq}
                onChange={(e) => setCodeReq(e.target.value)}
                placeholder="描述你需要的策略逻辑，例如：生成一个基于RSI指标的反转策略，RSI低于30时买入，高于70时卖出..."
                className="w-full h-28 px-3 py-2 text-sm rounded-md border border-border bg-background resize-none"
              />
              <div className="flex items-center gap-2 mt-3">
              <button onClick={handleCodeGen} disabled={!codeReq.trim() || isCodeGenPending} className="px-4 py-2 text-sm rounded-md bg-primary text-white hover:opacity-90 disabled:opacity-50">
                  {isCodeGenPending ? '生成中...' : '生成代码'}
                </button>
              </div>
            </div>

            {generatedCode && (
              <div className="rounded-lg border border-border bg-card p-5">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-card-foreground">生成结果</h3>
                  <button onClick={() => { navigator.clipboard.writeText(generatedCode); showToast('已复制', 'success') }} className="text-xs px-2 py-1 rounded border border-border hover:bg-muted">复制代码</button>
                </div>
                <pre className="bg-muted rounded-md p-4 text-xs font-mono overflow-x-auto whitespace-pre-wrap">{generatedCode}</pre>
              </div>
            )}

            <div className="rounded-lg border border-border bg-card p-5">
              <h3 className="font-semibold text-card-foreground mb-3">常用提示</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {[
                  { label: '双均线策略', prompt: '生成一个双均线交叉策略，使用5日和20日均线' },
                  { label: 'RSI 反转', prompt: '生成一个RSI超买超卖反转策略' },
                  { label: 'MACD 策略', prompt: '生成MACD金叉死叉策略' },
                ].map((t) => (
                  <button key={t.label} onClick={() => setCodeReq(t.prompt)} className="text-left px-3 py-2 text-sm rounded-md border border-border hover:bg-muted hover:border-primary">{t.label}</button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── Insights ────────────────────────────────── */}
        {activeTab === 'insight' && (
          <p className="text-center text-muted-foreground py-8">暂无智能洞察数据，通过 AI 对话获取洞察建议</p>
        )}

        {/* ── Suggestions ─────────────────────────────── */}
        {activeTab === 'suggest' && (
          <p className="text-center text-muted-foreground py-8">暂无策略建议，通过 AI 对话获取个性化建议</p>
        )}
      </TabPanel>
    </div>
  )
}
