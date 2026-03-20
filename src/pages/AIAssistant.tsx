import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Bot, Loader2, MessageSquare, Plus, Send, Settings2, Trash2, X
} from 'lucide-react'
import { aiAPI } from '../lib/api'
import type { AIConversation, AIMessage, AIModelConfig } from '../types'

export default function AIAssistant() {
  const { t } = useTranslation(['social', 'common'])
  const [conversations, setConversations] = useState<AIConversation[]>([])
  const [messages, setMessages] = useState<AIMessage[]>([])
  const [models, setModels] = useState<AIModelConfig[]>([])
  const [activeConv, setActiveConv] = useState<AIConversation | null>(null)
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [input, setInput] = useState('')
  const [showNewConv, setShowNewConv] = useState(false)
  const [showModels, setShowModels] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newModel, setNewModel] = useState('')

  const fetchConversations = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await aiAPI.listConversations({ page_size: 100 })
      const result = data as any
      setConversations(result.data || result || [])
    } catch {
      setError(t('ai.loadFailed'))
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchModels = useCallback(async () => {
    try {
      const { data } = await aiAPI.listModels()
      setModels(Array.isArray(data) ? data : data.data || [])
    } catch { /* ignore */ }
  }, [])

  useEffect(() => { fetchConversations(); fetchModels() }, [fetchConversations, fetchModels])

  const selectConversation = async (conv: AIConversation) => {
    setActiveConv(conv)
    try {
      const { data } = await aiAPI.listMessages(conv.id)
      setMessages(Array.isArray(data) ? data : data.data || [])
    } catch {
      setError(t('ai.loadMessagesFailed'))
    }
  }

  const handleCreateConversation = async () => {
    if (!newTitle.trim()) return
    try {
      await aiAPI.createConversation({ title: newTitle, model: newModel || undefined })
      setNewTitle('')
      setNewModel('')
      setShowNewConv(false)
      fetchConversations()
    } catch (err: any) {
      setError(err?.response?.data?.message || t('ai.createFailed'))
    }
  }

  const handleSendMessage = async () => {
    if (!input.trim() || !activeConv) return
    setSending(true)
    try {
      const { data } = await aiAPI.sendMessage(activeConv.id, { content: input })
      setInput('')
      // data contains both user message and assistant response
      const newMsgs = data as any
      if (newMsgs.user_message) {
        setMessages(prev => [...prev, newMsgs.user_message, newMsgs.assistant_message])
      } else {
        // Refresh
        const { data: msgs } = await aiAPI.listMessages(activeConv.id)
        setMessages(Array.isArray(msgs) ? msgs : msgs.data || [])
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || t('ai.sendFailed'))
    } finally {
      setSending(false)
    }
  }

  const handleDeleteConversation = async (id: number) => {
    try {
      await aiAPI.deleteConversation(id)
      if (activeConv?.id === id) { setActiveConv(null); setMessages([]) }
      fetchConversations()
    } catch { setError(t('ai.deleteFailed')) }
  }

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]" data-testid="ai-assistant-page">
      <div className="flex flex-1 min-h-0">
      {/* Sidebar */}
      <div className="w-72 border-r border-gray-200 bg-gray-50 flex flex-col">
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="font-semibold text-gray-900 flex items-center gap-2">
            <Bot className="h-5 w-5" /> {t('ai.title')}
          </h2>
          <div className="flex gap-1">
            <button onClick={() => setShowModels(true)} className="p-1 hover:bg-gray-200 rounded" title={t('ai.modelSettings')}>
              <Settings2 className="h-4 w-4" />
            </button>
            <button onClick={() => setShowNewConv(true)} className="p-1 hover:bg-gray-200 rounded" title={t('ai.newConversation')}>
              <Plus className="h-4 w-4" />
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {conversations.map(c => (
            <div
              key={c.id}
              onClick={() => selectConversation(c)}
              className={`p-3 cursor-pointer border-b border-gray-100 flex items-center justify-between group ${
                activeConv?.id === c.id ? 'bg-blue-50 border-l-2 border-l-blue-500' : 'hover:bg-gray-100'
              }`}
            >
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-gray-900 truncate">{c.title}</p>
                <p className="text-xs text-gray-500">{c.model || t('ai.defaultModel')}</p>
              </div>
              <button
                onClick={e => { e.stopPropagation(); handleDeleteConversation(c.id) }}
                className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-100 rounded"
              >
                <Trash2 className="h-3 w-3 text-red-500" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Chat area */}
      <div className="flex-1 flex flex-col">
        {error && (
          <div className="mx-4 mt-2 px-3 py-2 bg-red-50 border border-red-200 rounded text-sm text-red-700">
            {error}
            <button onClick={() => setError(null)} className="ml-2 text-red-500 hover:text-red-700">
              <X className="h-3 w-3 inline" />
            </button>
          </div>
        )}

        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          </div>
        ) : !activeConv ? (
          <div className="flex-1 flex items-center justify-center text-gray-400">
            <div className="text-center">
              <MessageSquare className="h-12 w-12 mx-auto mb-3" />
              <p>{t('ai.selectConversation')}</p>
            </div>
          </div>
        ) : (
          <>
            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map(msg => (
                <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] rounded-lg px-4 py-2 ${
                    msg.role === 'user'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-900'
                  }`}>
                    <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                    <p className={`text-xs mt-1 ${msg.role === 'user' ? 'text-blue-100' : 'text-gray-400'}`}>
                      {new Date(msg.created_at).toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Input */}
            <div className="border-t border-gray-200 p-4">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
                  placeholder={t('ai.typeMessage')}
                  className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={sending}
                />
                <button
                  onClick={handleSendMessage}
                  disabled={sending || !input.trim()}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-1"
                >
                  {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* New Conversation Modal */}
      {showNewConv && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96 shadow-xl">
            <h3 className="text-lg font-semibold mb-4">{t('ai.newConversationTitle')}</h3>
            <input
              type="text"
              value={newTitle}
              onChange={e => setNewTitle(e.target.value)}
              placeholder={t('ai.conversationTitle')}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm mb-3"
            />
            <select
              value={newModel}
              onChange={e => setNewModel(e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm mb-4"
            >
              <option value="">{t('ai.defaultModelOption')}</option>
              {models.map(m => (
                <option key={m.id} value={m.name}>{m.name} ({m.provider})</option>
              ))}
            </select>
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowNewConv(false)} className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded">
                {t('common:cancel')}
              </button>
              <button onClick={handleCreateConversation} className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700">
                {t('common:create')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Models Modal */}
      {showModels && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-[32rem] shadow-xl max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">{t('ai.aiModels')}</h3>
              <button onClick={() => setShowModels(false)} className="p-1 hover:bg-gray-100 rounded">
                <X className="h-4 w-4" />
              </button>
            </div>
            {models.length === 0 ? (
              <p className="text-gray-500 text-sm">{t('ai.noModels')}</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-2">{t('common:name')}</th>
                    <th className="text-left py-2">{t('ai.provider')}</th>
                    <th className="text-left py-2">{t('common:status')}</th>
                  </tr>
                </thead>
                <tbody>
                  {models.map(m => (
                    <tr key={m.id} className="border-b border-gray-100">
                      <td className="py-2 font-medium">{m.name}</td>
                      <td className="py-2 text-gray-600">{m.provider}</td>
                      <td className="py-2">
                        <span className={`px-2 py-0.5 rounded text-xs ${m.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                          {m.is_active ? t('common:active') : t('common:inactive')}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </div>
    </div>
  )
}
