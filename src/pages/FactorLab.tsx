import { useCallback, useEffect, useState } from 'react'
import {
  BarChart3, FlaskConical, Loader2, Plus, RefreshCw, Search, Trash2
} from 'lucide-react'
import { factorAPI } from '../lib/api'
import type { FactorDefinition, FactorEvaluation } from '../types'

const CATEGORIES = ['value', 'momentum', 'quality', 'growth', 'volatility', 'size', 'other']
const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-700',
  testing: 'bg-yellow-100 text-yellow-700',
  active: 'bg-green-100 text-green-700',
  archived: 'bg-red-100 text-red-700',
}

export default function FactorLab() {
  const [factors, setFactors] = useState<FactorDefinition[]>([])
  const [evaluations, setEvaluations] = useState<FactorEvaluation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedFactor, setSelectedFactor] = useState<FactorDefinition | null>(null)
  const [categoryFilter, setCategoryFilter] = useState<string>('')
  const [showCreate, setShowCreate] = useState(false)
  const [evalLoading, setEvalLoading] = useState(false)
  const [form, setForm] = useState({ name: '', category: 'value', expression: '', description: '' })

  const fetchFactors = useCallback(async () => {
    setLoading(true)
    try {
      const params: Record<string, unknown> = { page_size: 100 }
      if (categoryFilter) params.category = categoryFilter
      const { data } = await factorAPI.list(params as any)
      const result = data as any
      setFactors(result.data || result || [])
    } catch {
      setError('Failed to load factors')
    } finally {
      setLoading(false)
    }
  }, [categoryFilter])

  useEffect(() => { fetchFactors() }, [fetchFactors])

  const selectFactor = async (f: FactorDefinition) => {
    setSelectedFactor(f)
    try {
      const { data } = await factorAPI.listEvaluations(f.id)
      setEvaluations(Array.isArray(data) ? data : data.data || [])
    } catch {
      setError('Failed to load evaluations')
    }
  }

  const handleCreate = async () => {
    if (!form.name.trim() || !form.expression.trim()) return
    try {
      await factorAPI.create(form)
      setForm({ name: '', category: 'value', expression: '', description: '' })
      setShowCreate(false)
      fetchFactors()
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to create factor')
    }
  }

  const handleRunEvaluation = async () => {
    if (!selectedFactor) return
    setEvalLoading(true)
    try {
      await factorAPI.runEvaluation(selectedFactor.id, {
        start_date: '2020-01-01', end_date: '2024-01-01',
      })
      const { data } = await factorAPI.listEvaluations(selectedFactor.id)
      setEvaluations(Array.isArray(data) ? data : data.data || [])
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Evaluation failed')
    } finally {
      setEvalLoading(false)
    }
  }

  const handleDelete = async (id: number) => {
    try {
      await factorAPI.delete(id)
      if (selectedFactor?.id === id) { setSelectedFactor(null); setEvaluations([]) }
      fetchFactors()
    } catch { setError('Failed to delete factor') }
  }

  return (
    <div className="p-6" data-testid="factor-lab-page">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <FlaskConical className="h-7 w-7" /> Factor Lab
        </h1>
        <div className="flex gap-2">
          <select
            value={categoryFilter}
            onChange={e => setCategoryFilter(e.target.value)}
            className="border border-gray-300 rounded px-3 py-1.5 text-sm"
          >
            <option value="">All categories</option>
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <button onClick={() => setShowCreate(true)} className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white rounded text-sm hover:bg-blue-700">
            <Plus className="h-4 w-4" /> New Factor
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 px-3 py-2 bg-red-50 border border-red-200 rounded text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Factor List */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
            <div className="p-3 border-b border-gray-200 flex items-center justify-between">
              <h2 className="font-semibold text-sm text-gray-700">Factors ({factors.length})</h2>
              <button onClick={fetchFactors} className="p-1 hover:bg-gray-100 rounded">
                <RefreshCw className="h-4 w-4 text-gray-500" />
              </button>
            </div>
            {loading ? (
              <div className="p-8 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto text-gray-400" /></div>
            ) : factors.length === 0 ? (
              <div className="p-8 text-center text-gray-400 text-sm">No factors defined</div>
            ) : (
              <div className="divide-y divide-gray-100 max-h-[60vh] overflow-y-auto">
                {factors.map(f => (
                  <div
                    key={f.id}
                    onClick={() => selectFactor(f)}
                    className={`p-3 cursor-pointer flex items-center justify-between group ${
                      selectedFactor?.id === f.id ? 'bg-blue-50' : 'hover:bg-gray-50'
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-900 truncate">{f.name}</p>
                      <div className="flex gap-2 mt-1">
                        <span className="text-xs text-gray-500">{f.category}</span>
                        <span className={`text-xs px-1.5 py-0.5 rounded ${STATUS_COLORS[f.status] || ''}`}>
                          {f.status}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={e => { e.stopPropagation(); handleDelete(f.id) }}
                      className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-100 rounded"
                    >
                      <Trash2 className="h-3 w-3 text-red-500" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Factor Detail + Evaluations */}
        <div className="lg:col-span-2">
          {!selectedFactor ? (
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-12 text-center text-gray-400">
              <Search className="h-10 w-10 mx-auto mb-3" />
              <p>Select a factor to view details</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Detail card */}
              <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{selectedFactor.name}</h3>
                <p className="text-sm text-gray-500 mb-3">{selectedFactor.description || 'No description'}</p>
                <div className="bg-gray-50 rounded p-3 font-mono text-sm text-gray-800">
                  {selectedFactor.expression}
                </div>
              </div>

              {/* Evaluations */}
              <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
                <div className="p-3 border-b border-gray-200 flex items-center justify-between">
                  <h3 className="font-semibold text-sm text-gray-700">Evaluations</h3>
                  <button
                    onClick={handleRunEvaluation}
                    disabled={evalLoading}
                    className="flex items-center gap-1 px-3 py-1 bg-green-600 text-white rounded text-xs hover:bg-green-700 disabled:opacity-50"
                  >
                    {evalLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <BarChart3 className="h-3 w-3" />}
                    Run Evaluation
                  </button>
                </div>
                {evaluations.length === 0 ? (
                  <div className="p-6 text-center text-gray-400 text-sm">No evaluations yet</div>
                ) : (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200 bg-gray-50">
                        <th className="text-left p-2">Period</th>
                        <th className="text-right p-2">IC Mean</th>
                        <th className="text-right p-2">IR</th>
                        <th className="text-right p-2">Long/Short</th>
                        <th className="text-right p-2">Turnover</th>
                      </tr>
                    </thead>
                    <tbody>
                      {evaluations.map(ev => (
                        <tr key={ev.id} className="border-b border-gray-100">
                          <td className="p-2">{ev.start_date} ~ {ev.end_date}</td>
                          <td className="p-2 text-right font-mono">{ev.ic_mean?.toFixed(4) ?? '—'}</td>
                          <td className="p-2 text-right font-mono">{ev.ir?.toFixed(4) ?? '—'}</td>
                          <td className="p-2 text-right font-mono">{ev.long_short_return != null ? `${(ev.long_short_return * 100).toFixed(2)}%` : '—'}</td>
                          <td className="p-2 text-right font-mono">{ev.turnover?.toFixed(4) ?? '—'}</td>
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

      {/* Create Factor Modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-[28rem] shadow-xl">
            <h3 className="text-lg font-semibold mb-4">New Factor</h3>
            <div className="space-y-3">
              <input type="text" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="Factor name" className="w-full border border-gray-300 rounded px-3 py-2 text-sm" />
              <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm">
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <textarea value={form.expression} onChange={e => setForm(f => ({ ...f, expression: e.target.value }))}
                placeholder="Factor expression (e.g., PE_ratio / PB_ratio)" rows={3}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm font-mono" />
              <input type="text" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                placeholder="Description (optional)" className="w-full border border-gray-300 rounded px-3 py-2 text-sm" />
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button onClick={() => setShowCreate(false)} className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded">Cancel</button>
              <button onClick={handleCreate} className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700">Create</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
