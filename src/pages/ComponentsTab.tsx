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
  Layers,
  Search,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

import ComponentEditor from '../components/ComponentEditor'
import Badge, { type BadgeVariant } from '../components/ui/Badge'
import Modal from '../components/ui/Modal'
import { showToast } from '../components/ui/toast-service'
import { strategyComponentsAPI, templateAPI } from '../lib/api'
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

// ── main component ───────────────────────────────────────────────────────

export default function ComponentsTab({ createOpen, setCreateOpen }: { createOpen: boolean; setCreateOpen: (v: boolean) => void }) {
  const { t } = useTranslation('strategies')
  const qc = useQueryClient()

  // list state
  const [search, setSearch] = useState('')
  const [collapsedLayers, setCollapsedLayers] = useState<Set<ComponentLayer>>(new Set())
  const [selectedId, setSelectedId] = useState<number | null>(null)

  // form state for new component
  const [formName, setFormName] = useState('')
  const [formLayer, setFormLayer] = useState<ComponentLayer>('trading')
  const [formSubType, setFormSubType] = useState('')
  const [formTemplateId, setFormTemplateId] = useState<number | null>(null)
  const [formTemplateCode, setFormTemplateCode] = useState<string | null>(null)
  const [formTemplateParams, setFormTemplateParams] = useState<Record<string, unknown> | null>(null)
  const [loadingTemplate, setLoadingTemplate] = useState(false)

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

  interface TemplateListItem { id: number; name: string; template_type?: string; layer?: string }
  const { data: myTemplates = [] } = useQuery<TemplateListItem[]>({
    queryKey: ['component-create-templates'],
    queryFn: () =>
      templateAPI.listMine({ page_size: 100 }).then((r) => {
        const raw = r.data as { data?: unknown; items?: unknown; results?: unknown }
        const arr = (raw.data ?? raw.items ?? raw.results ?? r.data) as TemplateListItem[]
        return Array.isArray(arr) ? arr : []
      }),
    enabled: createOpen,
  })

  useEffect(() => {
    if (createOpen) {
      setFormName('')
      setFormLayer('trading')
      setFormSubType('')
      setFormTemplateId(null)
      setFormTemplateCode(null)
      setFormTemplateParams(null)
    }
  }, [createOpen])

  const handleTemplateSelect = async (id: number | null) => {
    setFormTemplateId(id)
    if (!id) {
      setFormTemplateCode(null)
      setFormTemplateParams(null)
      return
    }
    try {
      setLoadingTemplate(true)
      const res = await templateAPI.get(id)
      const d = (res.data as Record<string, unknown>)?.data ?? res.data
      const detail = d as Record<string, unknown>
      setFormTemplateCode((detail.code as string) || null)
      const params = detail.default_params as Record<string, unknown> | null
      setFormTemplateParams(params || null)
    } catch {
      setFormTemplateCode(null)
      setFormTemplateParams(null)
    } finally {
      setLoadingTemplate(false)
    }
  }

  // mutations
  const createMut = useMutation({
    mutationFn: (data: { name: string; layer: string; sub_type: string; code?: string; parameters?: Record<string, unknown> }) =>
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
      if (next.has(layer)) next.delete(layer)
      else next.add(layer)
      return next
    })
  }, [])

  const handleCreate = () => {
    if (!formName.trim() || !formSubType.trim()) return
    createMut.mutate({
      name: formName.trim(),
      layer: formLayer,
      sub_type: formSubType.trim(),
      ...(formTemplateCode ? { code: formTemplateCode } : {}),
      ...(formTemplateParams ? { parameters: formTemplateParams } : {}),
    })
  }

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
        <ComponentEditor
          detail={detail ?? null}
          onDelete={(id) => deleteMut.mutate(id)}
        />
      </section>

      {/* Create modal */}
      <Modal open={createOpen} onClose={() => { setCreateOpen(false); setFormTemplateId(null); setFormTemplateCode(null); setFormTemplateParams(null) }} title={t('page.components.createTitle', 'New Component')}>
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">{t('page.components.form.template', 'From Template (optional)')}</label>
            <select
              value={formTemplateId ?? ''}
              onChange={(e) => {
                const val = e.target.value ? Number(e.target.value) : null
                void handleTemplateSelect(val)
              }}
              disabled={loadingTemplate}
              className="w-full px-3 py-2 text-sm rounded-md border border-border bg-background"
            >
              <option value="">{t('page.components.form.noTemplate', '-- Blank --')}</option>
              {myTemplates.filter((tpl) => (tpl.template_type ?? 'standalone') === 'component').map((tpl) => (
                <option key={tpl.id} value={tpl.id}>{tpl.name}</option>
              ))}
            </select>
            {loadingTemplate && (
              <p className="text-xs text-muted-foreground mt-1">{t('page.table.loading', 'Loading...')}</p>
            )}
          </div>
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
