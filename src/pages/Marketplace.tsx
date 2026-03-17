import { useCallback, useEffect, useState } from 'react'
import {
  Copy, Download, Filter, Loader2, MessageSquare, Plus,
  Search, ShoppingBag, Star, Trash2
} from 'lucide-react'
import { templateAPI } from '../lib/api'
import type { StrategyTemplate, StrategyComment, StrategyRating } from '../types'

type Tab = 'marketplace' | 'mine'

export default function Marketplace() {
  const [tab, setTab] = useState<Tab>('marketplace')
  const [templates, setTemplates] = useState<StrategyTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedTemplate, setSelectedTemplate] = useState<StrategyTemplate | null>(null)
  const [comments, setComments] = useState<StrategyComment[]>([])
  const [ratings, setRatings] = useState<StrategyRating | null>(null)
  const [categoryFilter, setCategoryFilter] = useState<string>('')
  const [commentText, setCommentText] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState({ name: '', description: '', category: '', code: '', is_public: true })

  const fetchTemplates = useCallback(async () => {
    setLoading(true)
    try {
      const params: Record<string, unknown> = { page_size: 100 }
      if (categoryFilter) params.category = categoryFilter
      const { data } = tab === 'marketplace'
        ? await templateAPI.listMarketplace(params as any)
        : await templateAPI.listMine(params as any)
      const result = data as any
      setTemplates(result.data || result || [])
    } catch {
      setError('Failed to load templates')
    } finally {
      setLoading(false)
    }
  }, [tab, categoryFilter])

  useEffect(() => { fetchTemplates() }, [fetchTemplates])

  const selectTemplate = async (t: StrategyTemplate) => {
    setSelectedTemplate(t)
    try {
      const [commentsRes, ratingsRes] = await Promise.all([
        templateAPI.listComments(t.id),
        templateAPI.getRatings(t.id),
      ])
      setComments(Array.isArray(commentsRes.data) ? commentsRes.data : commentsRes.data.data || [])
      setRatings(ratingsRes.data as StrategyRating)
    } catch { /* ignore */ }
  }

  const handleClone = async (id: number) => {
    try {
      await templateAPI.clone(id)
      setTab('mine')
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Clone failed')
    }
  }

  const handleRate = async (score: number) => {
    if (!selectedTemplate) return
    try {
      await templateAPI.rate(selectedTemplate.id, { score })
      const { data } = await templateAPI.getRatings(selectedTemplate.id)
      setRatings(data as StrategyRating)
    } catch { setError('Rating failed') }
  }

  const handleComment = async () => {
    if (!commentText.trim() || !selectedTemplate) return
    try {
      await templateAPI.addComment(selectedTemplate.id, { content: commentText })
      setCommentText('')
      const { data } = await templateAPI.listComments(selectedTemplate.id)
      setComments(Array.isArray(data) ? data : data.data || [])
    } catch { setError('Failed to add comment') }
  }

  const handleCreate = async () => {
    if (!form.name.trim() || !form.code.trim()) return
    try {
      await templateAPI.create(form)
      setForm({ name: '', description: '', category: '', code: '', is_public: true })
      setShowCreate(false)
      setTab('mine')
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to create template')
    }
  }

  const handleDelete = async (id: number) => {
    try {
      await templateAPI.delete(id)
      if (selectedTemplate?.id === id) { setSelectedTemplate(null); setComments([]); setRatings(null) }
      fetchTemplates()
    } catch { setError('Failed to delete template') }
  }

  return (
    <div className="p-6" data-testid="marketplace-page">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <ShoppingBag className="h-7 w-7" /> Strategy Marketplace
        </h1>
        <button onClick={() => setShowCreate(true)} className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white rounded text-sm hover:bg-blue-700">
          <Plus className="h-4 w-4" /> Publish Template
        </button>
      </div>

      {error && (
        <div className="mb-4 px-3 py-2 bg-red-50 border border-red-200 rounded text-sm text-red-700">{error}</div>
      )}

      {/* Tabs */}
      <div className="flex gap-4 mb-4 border-b border-gray-200">
        {(['marketplace', 'mine'] as const).map(t => (
          <button
            key={t}
            onClick={() => { setTab(t); setSelectedTemplate(null) }}
            className={`pb-2 px-1 text-sm font-medium border-b-2 ${
              tab === t ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {t === 'marketplace' ? 'Browse Marketplace' : 'My Templates'}
          </button>
        ))}
        <div className="ml-auto">
          <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}
            className="border border-gray-300 rounded px-2 py-1 text-sm">
            <option value="">All categories</option>
            <option value="trend">Trend</option>
            <option value="mean_reversion">Mean Reversion</option>
            <option value="momentum">Momentum</option>
            <option value="arbitrage">Arbitrage</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Template List */}
        <div className="lg:col-span-1 space-y-3">
          {loading ? (
            <div className="text-center py-8"><Loader2 className="h-6 w-6 animate-spin mx-auto text-gray-400" /></div>
          ) : templates.length === 0 ? (
            <div className="text-center py-8 text-gray-400 text-sm">No templates found</div>
          ) : templates.map(t => (
            <div
              key={t.id}
              onClick={() => selectTemplate(t)}
              className={`bg-white rounded-lg border p-4 cursor-pointer transition group ${
                selectedTemplate?.id === t.id ? 'border-blue-500 ring-1 ring-blue-200' : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-medium text-gray-900 text-sm">{t.name}</h3>
                  <p className="text-xs text-gray-500 mt-1 line-clamp-2">{t.description || 'No description'}</p>
                </div>
                {tab === 'mine' && (
                  <button onClick={e => { e.stopPropagation(); handleDelete(t.id) }}
                    className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-100 rounded">
                    <Trash2 className="h-3 w-3 text-red-500" />
                  </button>
                )}
              </div>
              <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
                {t.category && <span className="bg-gray-100 px-2 py-0.5 rounded">{t.category}</span>}
                <span className="flex items-center gap-0.5"><Download className="h-3 w-3" /> {t.downloads}</span>
                {t.avg_rating != null && (
                  <span className="flex items-center gap-0.5"><Star className="h-3 w-3 text-yellow-500" /> {t.avg_rating.toFixed(1)}</span>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Template Detail */}
        <div className="lg:col-span-2">
          {!selectedTemplate ? (
            <div className="bg-white rounded-lg border border-gray-200 p-12 text-center text-gray-400">
              <Search className="h-10 w-10 mx-auto mb-3" />
              <p>Select a template to view details</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{selectedTemplate.name}</h3>
                    <p className="text-sm text-gray-500">{selectedTemplate.description}</p>
                  </div>
                  {tab === 'marketplace' && (
                    <button onClick={() => handleClone(selectedTemplate.id)}
                      className="flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white rounded text-sm hover:bg-green-700">
                      <Copy className="h-4 w-4" /> Clone
                    </button>
                  )}
                </div>
                <div className="bg-gray-900 rounded p-3 font-mono text-sm text-green-400 max-h-64 overflow-y-auto whitespace-pre">
                  {selectedTemplate.code}
                </div>
              </div>

              {/* Ratings */}
              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <h4 className="font-semibold text-sm text-gray-700 mb-2">Rating</h4>
                <div className="flex items-center gap-4">
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map(s => (
                      <button key={s} onClick={() => handleRate(s)} className="hover:scale-110 transition">
                        <Star className={`h-5 w-5 ${ratings && s <= Math.round(ratings.avg_rating) ? 'text-yellow-500 fill-yellow-500' : 'text-gray-300'}`} />
                      </button>
                    ))}
                  </div>
                  {ratings && (
                    <span className="text-sm text-gray-500">{ratings.avg_rating.toFixed(1)} ({ratings.rating_count} ratings)</span>
                  )}
                </div>
              </div>

              {/* Comments */}
              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <h4 className="font-semibold text-sm text-gray-700 mb-3 flex items-center gap-1">
                  <MessageSquare className="h-4 w-4" /> Comments ({comments.length})
                </h4>
                <div className="space-y-3 mb-3 max-h-48 overflow-y-auto">
                  {comments.map(c => (
                    <div key={c.id} className="text-sm border-b border-gray-100 pb-2">
                      <span className="font-medium text-gray-900">{c.username || `User #${c.user_id}`}</span>
                      <p className="text-gray-700 mt-0.5">{c.content}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{new Date(c.created_at).toLocaleString()}</p>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input type="text" value={commentText} onChange={e => setCommentText(e.target.value)}
                    placeholder="Add a comment..." className="flex-1 border border-gray-300 rounded px-3 py-1.5 text-sm" />
                  <button onClick={handleComment} disabled={!commentText.trim()}
                    className="px-3 py-1.5 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 disabled:opacity-50">
                    Post
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Create Template Modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-[32rem] shadow-xl">
            <h3 className="text-lg font-semibold mb-4">Publish Strategy Template</h3>
            <div className="space-y-3">
              <input type="text" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="Template name" className="w-full border border-gray-300 rounded px-3 py-2 text-sm" />
              <input type="text" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                placeholder="Description" className="w-full border border-gray-300 rounded px-3 py-2 text-sm" />
              <input type="text" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                placeholder="Category (e.g., trend, momentum)" className="w-full border border-gray-300 rounded px-3 py-2 text-sm" />
              <textarea value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value }))}
                placeholder="Strategy code" rows={6}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm font-mono" />
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={form.is_public} onChange={e => setForm(f => ({ ...f, is_public: e.target.checked }))} />
                Public (visible in marketplace)
              </label>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button onClick={() => setShowCreate(false)} className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded">Cancel</button>
              <button onClick={handleCreate} className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700">Publish</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
