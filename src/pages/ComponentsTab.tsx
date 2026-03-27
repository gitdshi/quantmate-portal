/**
 * Components tab for Strategy Research page.
 *
 * Provides a split-panel view:
 *  - Left: component list grouped by layer (Universe / Trading / Risk)
 *  - Right: code editor + config + parameters + inline backtest drawer
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  ChevronDown,
  ChevronRight,
  FlaskConical,
  Layers,
  Loader2,
  Plus,
  Save,
  Search,
  Trash2,
} from 'lucide-react'
import { useCallback, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

import Badge, { type BadgeVariant } from '../components/ui/Badge'
import Modal from '../components/ui/Modal'
import TabPanel from '../components/ui/TabPanel'
import { showToast } from '../components/ui/toast-service'
import { strategyComponentsAPI, componentBacktestAPI } from '../lib/api'
import type { ComponentLayer, StrategyComponent, StrategyComponentListItem } from '../types'

// ── helpers ──────────────────────────────────────────────────────────────

const LAYERS: ComponentLayer[] = ['universe', 'trading', 'risk']

const LAYER_VARIANT: Record<ComponentLayer, BadgeVariant> = {
  universe: 'primary',
  trading: 'warning',
  risk: 'destructive',
}

function unwrapRows(value: unknown): StrategyComponentListItem[] {
  if (Array.isArray(value)) return value as StrategyComponentListItem[]
  if (value && typeof value === 'object') {
    const c = value as Record<string, unknown>
    const d = c.data ?? c.items ?? c.results
    if (Array.isArray(d)) return d as StrategyComponentListItem[]
  }
  return []
}

type EditorSubTab = 'code' | 'config' | 'parameters'

// ── main component ───────────────────────────────────────────────────────

export default function ComponentsTab() {
  const { t } = useTranslation('strategies')
  const qc = useQueryClient()

  // list state
  const [search, setSearch] = useState('')
  const [collapsedLayers, setCollapsedLayers] = useState<Set<ComponentLayer>>(new Set())
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [editorTab, setEditorTab] = useState<EditorSubTab>('code')
  const [showBacktest, setShowBacktest] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)

  // form state for new component
  const [formName, setFormName] = useState('')
  const [formLayer, setFormLayer] = useState<ComponentLayer>('trading')
  const [formSubType, setFormSubType] = useState('')

  // queries
  const { data: components = [] } = useQuery<StrategyComponentListItem[]>({
    queryKey: ['strategy-components'],
    queryFn: () => strategyComponentsAPI.list().then((r) => unwrapRows(r.data)),
  })

  const { data: detail } = useQuery<StrategyComponent>({
    queryKey: ['strategy-component', selectedId],
    queryFn: () => strategyComponentsAPI.get(selectedId!).then((r) => (r.data as Record<string, unknown>)?.data ?? r.data) as Promise<StrategyComponent>,
    enabled: selectedId != null,
  })

  // mutations
  const createMut = useMutation({
    mutationFn: (data: { name: string; layer: string; sub_type: string }) =>
      strategyComponentsAPI.create(data),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['strategy-components'] })
      setCreateOpen(false)
      showToast(t('page.components.created', 'Component created'), 'success')
    },
  })

  const deleteMut = useMutation({
    mutationFn: (id: number) => strategyComponentsAPI.delete(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['strategy-components'] })
      if (selectedId != null) setSelectedId(null)
      showToast(t('page.components.deleted', 'Component deleted'), 'success')
    },
  })

  const backtestMut = useMutation({
    mutationFn: (id: number) => componentBacktestAPI.run(id),
    onSuccess: () => showToast(t('page.components.backtestDone', 'Backtest complete'), 'success'),
  })

  // derived
  const normalizedSearch = search.trim().toLowerCase()

  const grouped = useMemo(() => {
    const map: Record<ComponentLayer, StrategyComponentListItem[]> = {
      universe: [],
      trading: [],
      risk: [],
    }
    for (const c of components) {
      if (normalizedSearch && !c.name.toLowerCase().includes(normalizedSearch)) continue
      const layer = c.layer as ComponentLayer
      if (map[layer]) map[layer].push(c)
    }
    return map
  }, [components, normalizedSearch])

  const toggleLayer = useCallback((layer: ComponentLayer) => {
    setCollapsedLayers((prev) => {
      const next = new Set(prev)
      next.has(layer) ? next.delete(layer) : next.add(layer)
      return next
    })
  }, [])

  const handleCreate = () => {
    if (!formName.trim() || !formSubType.trim()) return
    createMut.mutate({ name: formName.trim(), layer: formLayer, sub_type: formSubType.trim() })
  }

  const backtestResult = backtestMut.data?.data as Record<string, unknown> | undefined

  // ── JSX ────────────────────────────────────────────────────────────────

  return (
    <div className="grid gap-4 xl:grid-cols-[320px_1fr]">
      {/* Left: component list */}
      <section className="rounded-lg border border-border bg-card p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-card-foreground flex items-center gap-2">
            <Layers size={18} />
            {t('page.components.title', 'Components')}
          </h2>
          <button
            type="button"
            onClick={() => setCreateOpen(true)}
            className="flex items-center gap-1 text-xs px-2 py-1 rounded-md bg-primary text-white hover:opacity-90"
          >
            <Plus size={12} /> {t('page.components.new', 'New')}
          </button>
        </div>

        <div className="relative">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('page.components.search', 'Search components...')}
            className="w-full pl-8 pr-3 py-1.5 text-sm rounded-md border border-border bg-background"
          />
        </div>

        {LAYERS.map((layer) => (
          <div key={layer}>
            <button
              type="button"
              onClick={() => toggleLayer(layer)}
              className="flex items-center gap-1 w-full text-xs font-medium uppercase text-muted-foreground py-1 hover:text-foreground"
            >
              {collapsedLayers.has(layer) ? <ChevronRight size={12} /> : <ChevronDown size={12} />}
              <Badge variant={LAYER_VARIANT[layer]} className="text-[10px]">{layer}</Badge>
              <span className="ml-auto text-[10px]">{grouped[layer].length}</span>
            </button>
            {!collapsedLayers.has(layer) && (
              <div className="space-y-0.5 ml-3">
                {grouped[layer].map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setSelectedId(c.id)}
                    className={`w-full text-left px-2 py-1.5 text-sm rounded-md transition-colors ${
                      selectedId === c.id ? 'bg-primary/10 text-primary' : 'hover:bg-muted text-card-foreground'
                    }`}
                  >
                    <span className="block truncate">{c.name}</span>
                    <span className="block text-[10px] text-muted-foreground">{c.sub_type}</span>
                  </button>
                ))}
                {grouped[layer].length === 0 && (
                  <p className="text-xs text-muted-foreground py-1 pl-2">{t('page.components.empty', 'No components')}</p>
                )}
              </div>
            )}
          </div>
        ))}
      </section>

      {/* Right: editor panel */}
      <section className="rounded-lg border border-border bg-card p-4">
        {!detail ? (
          <div className="flex items-center justify-center h-64 text-muted-foreground text-sm">
            {t('page.components.selectPrompt', 'Select a component to edit')}
          </div>
        ) : (
          <div className="space-y-4">
            {/* header */}
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-card-foreground">{detail.name}</h3>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant={LAYER_VARIANT[detail.layer]}>{detail.layer}</Badge>
                  <span className="text-xs text-muted-foreground">{detail.sub_type}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => deleteMut.mutate(detail.id)}
                  className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                  title="Delete"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>

            {/* sub-tabs */}
            <TabPanel
              tabs={[
                { key: 'code', label: t('page.components.tabs.code', 'Code') },
                { key: 'config', label: t('page.components.tabs.config', 'Config') },
                { key: 'parameters', label: t('page.components.tabs.parameters', 'Parameters') },
              ]}
              activeTab={editorTab}
              onChange={(k) => setEditorTab(k as EditorSubTab)}
            >
              <div className="min-h-[300px]">
                {editorTab === 'code' && (
                  <pre className="text-xs font-mono bg-muted/50 rounded-md p-3 overflow-auto max-h-[400px] whitespace-pre-wrap">
                    {detail.code || '# No code yet'}
                  </pre>
                )}
                {editorTab === 'config' && (
                  <pre className="text-xs font-mono bg-muted/50 rounded-md p-3 overflow-auto max-h-[400px] whitespace-pre-wrap">
                    {JSON.stringify(detail.config ?? {}, null, 2)}
                  </pre>
                )}
                {editorTab === 'parameters' && (
                  <pre className="text-xs font-mono bg-muted/50 rounded-md p-3 overflow-auto max-h-[400px] whitespace-pre-wrap">
                    {JSON.stringify(detail.parameters ?? {}, null, 2)}
                  </pre>
                )}
              </div>
            </TabPanel>

            {/* backtest drawer */}
            <div className="border-t border-border pt-3">
              <button
                type="button"
                onClick={() => setShowBacktest(!showBacktest)}
                className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground"
              >
                {showBacktest ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                <FlaskConical size={14} />
                {t('page.components.backtest', 'Component Backtest')}
              </button>

              {showBacktest && (
                <div className="mt-3 space-y-3">
                  <button
                    type="button"
                    onClick={() => backtestMut.mutate(detail.id)}
                    disabled={backtestMut.isPending}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md bg-primary text-white hover:opacity-90 disabled:opacity-50"
                  >
                    {backtestMut.isPending ? <Loader2 size={14} className="animate-spin" /> : <FlaskConical size={14} />}
                    {t('page.components.runBacktest', 'Run Backtest')}
                  </button>

                  {backtestResult && (
                    <pre className="text-xs font-mono bg-muted/50 rounded-md p-3 overflow-auto max-h-[300px] whitespace-pre-wrap">
                      {JSON.stringify(backtestResult, null, 2)}
                    </pre>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </section>

      {/* Create modal */}
      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title={t('page.components.createTitle', 'New Component')}>
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">{t('page.components.form.name', 'Name')}</label>
            <input
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-md border border-border bg-background"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">{t('page.components.form.layer', 'Layer')}</label>
            <select
              value={formLayer}
              onChange={(e) => setFormLayer(e.target.value as ComponentLayer)}
              className="w-full px-3 py-2 text-sm rounded-md border border-border bg-background"
            >
              {LAYERS.map((l) => (
                <option key={l} value={l}>
                  {l.charAt(0).toUpperCase() + l.slice(1)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">{t('page.components.form.subType', 'Sub Type')}</label>
            <input
              value={formSubType}
              onChange={(e) => setFormSubType(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-md border border-border bg-background"
              placeholder="e.g. dual_ma_signal"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setCreateOpen(false)}
              className="px-3 py-1.5 text-sm rounded-md border border-border hover:bg-muted"
            >
              {t('common.cancel', 'Cancel')}
            </button>
            <button
              type="button"
              onClick={handleCreate}
              disabled={createMut.isPending || !formName.trim() || !formSubType.trim()}
              className="px-3 py-1.5 text-sm rounded-md bg-primary text-white hover:opacity-90 disabled:opacity-50"
            >
              {t('common.create', 'Create')}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
