import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  BarChart3,
  BookOpen,
  Combine,
  Eye,
  Layers,
  Play,
  Plus,
  Search,
  Trash2,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

import Badge, { type BadgeVariant } from '../components/ui/Badge'
import DataTable, { type Column } from '../components/ui/DataTable'
import Modal from '../components/ui/Modal'
import TabPanel from '../components/ui/TabPanel'
import { showToast } from '../components/ui/toast-service'
import { compositeStrategiesAPI, compositeBacktestAPI, templateAPI } from '../lib/api'
import ComponentsTab from './ComponentsTab'
import type {
  ComponentLayer,
  ExecutionMode,
  CompositeStrategyListItem,
  CompositeStrategyDetail,
  ComponentBinding,
  CompositeBacktestListItem,
  CompositeBacktestResult,
  CompositeBacktestStatus,
} from '../types'

type TemplateItem = {
  id: number
  name: string
  description: string
  category: string
  template_type?: string | null
  code?: string
  params_schema?: Record<string, unknown>
  default_params?: Record<string, unknown>
  visibility: string
  downloads: number
  avg_rating: number
  source: 'marketplace' | 'mine'
  source_template_id?: number | null
  origin?: 'marketplace' | 'personal' | null
}

type FormComposite = {
  name: string
  description: string
  execution_mode: ExecutionMode
  portfolio_config: string
  market_constraints: string
}

type FormBinding = {
  component_id: string
  layer: ComponentLayer
  ordinal: string
  weight: string
  config_override: string
}

const LAYER_VARIANTS: Record<ComponentLayer, BadgeVariant> = {
  universe: 'primary',
  trading: 'success',
  risk: 'warning',
}

const MODE_VARIANTS: Record<ExecutionMode, BadgeVariant> = {
  backtest: 'primary',
  paper: 'warning',
  live: 'destructive',
}

const BT_STATUS_VARIANTS: Record<CompositeBacktestStatus, BadgeVariant> = {
  queued: 'muted',
  running: 'warning',
  completed: 'success',
  failed: 'destructive',
}

const emptyCompositeForm: FormComposite = {
  name: '', description: '', execution_mode: 'backtest', portfolio_config: '', market_constraints: '',
}

const emptyBindingForm: FormBinding = {
  component_id: '', layer: 'universe', ordinal: '0', weight: '1', config_override: '',
}

function tryParseJson(s: string): Record<string, unknown> | undefined {
  if (!s.trim()) return undefined
  try { return JSON.parse(s) } catch { return undefined }
}

export default function CompositeStrategies() {
  const { t } = useTranslation('composite')
  const { t: tc } = useTranslation('common')
  const queryClient = useQueryClient()

  const [activeTab, setActiveTab] = useState('components')

  // Template Library state
  const [tplSearch, setTplSearch] = useState('')
  const [tplSourceFilter, setTplSourceFilter] = useState<'all' | 'marketplace' | 'personal'>('all')
  const [tplTypeFilter, setTplTypeFilter] = useState<'all' | 'component' | 'composite'>('all')
  const [previewTemplate, setPreviewTemplate] = useState<TemplateItem | null>(null)
  const [selectedTplId, setSelectedTplId] = useState<number | null>(null)
  const [selectedTplCodeLoading, setSelectedTplCodeLoading] = useState(false)
  const [templateAsideTab, setTemplateAsideTab] = useState<'description' | 'code' | 'params'>('description')

  // Composite modals
  const [compositeModal, setCompositeModal] = useState(false)
  const [editCompositeId, setEditCompositeId] = useState<number | null>(null)
  const [compositeForm, setCompositeForm] = useState<FormComposite>({ ...emptyCompositeForm })
  const [deleteCompositeId, setDeleteCompositeId] = useState<number | null>(null)
  const [deleteCompositeName, setDeleteCompositeName] = useState('')

  // Binding modal
  const [bindingModal, setBindingModal] = useState(false)
  const [bindingCompositeId, setBindingCompositeId] = useState<number | null>(null)
  const [bindings, setBindings] = useState<FormBinding[]>([])

  // Detail view
  const [detailId, setDetailId] = useState<number | null>(null)

  // Backtest state
  const [btModal, setBtModal] = useState(false)
  const [btStrategyId, setBtStrategyId] = useState('')
  const [btStartDate, setBtStartDate] = useState('')
  const [btEndDate, setBtEndDate] = useState('')
  const [btCapital, setBtCapital] = useState('1000000')
  const [btBenchmark, setBtBenchmark] = useState('000300.SH')
  const [btResultJobId, setBtResultJobId] = useState<string | null>(null)
  const [deleteBtJobId, setDeleteBtJobId] = useState<string | null>(null)

  const tabs = [
    { key: 'components', label: t('tabs.components'), icon: <Layers size={16} /> },
    { key: 'composites', label: t('tabs.composites'), icon: <Combine size={16} /> },
    { key: 'templateLibrary', label: t('tabs.templateLibrary', 'Template Library'), icon: <BookOpen size={16} /> },
    { key: 'backtests', label: t('backtest.title'), icon: <BarChart3 size={16} /> },
  ]

  // ── Template Library queries ────────────────────────────

  function unwrapTemplateArray(data: unknown): Record<string, unknown>[] {
    if (Array.isArray(data)) return data as Record<string, unknown>[]
    if (data && typeof data === 'object') {
      const c = data as Record<string, unknown>
      const d = c.data ?? c.items ?? c.results
      if (Array.isArray(d)) return d as Record<string, unknown>[]
    }
    return []
  }

  const { data: myTemplates = [] } = useQuery<TemplateItem[]>({
    queryKey: ['composite-tpl-mine'],
    queryFn: () => templateAPI.listMine().then((r) =>
      unwrapTemplateArray(r.data).map((item) => ({
        ...item,
        source: 'mine' as const,
        origin: (item.source as 'marketplace' | 'personal' | undefined) ?? null,
        source_template_id: (item.source_template_id as number | undefined) ?? null,
      } as TemplateItem))
    ),
    enabled: activeTab === 'templateLibrary',
  })

  const librarySet = useMemo(
    () => new Set(myTemplates.filter((t) => t.source_template_id).map((t) => t.source_template_id as number)),
    [myTemplates]
  )

  const filteredTpl = useMemo(() => {
    const query = tplSearch.trim().toLowerCase()
    return myTemplates.filter((item) => {
      const ttype = item.template_type || 'standalone'
      if (ttype === 'standalone') return false // exclude standalone
      if (tplTypeFilter !== 'all' && ttype !== tplTypeFilter) return false
      if (tplSourceFilter !== 'all' && item.origin !== tplSourceFilter) return false
      if (query && !item.name.toLowerCase().includes(query) && !(item.description || '').toLowerCase().includes(query)) return false
      return true
    })
  }, [myTemplates, tplSearch, tplSourceFilter, tplTypeFilter])

  const selectedTpl = useMemo(
    () => myTemplates.find((t) => t.id === selectedTplId) ?? null,
    [selectedTplId, myTemplates]
  )

  const handlePreviewTemplate = (tpl: TemplateItem) => {
    if (!tpl.code) {
      setSelectedTplCodeLoading(true)
      templateAPI.get(tpl.id).then((r) => {
        const detail = r.data as Record<string, unknown>
        const full = { ...tpl, code: (detail.code as string) || '', params_schema: detail.params_schema as Record<string, unknown> | undefined, default_params: detail.default_params as Record<string, unknown> | undefined }
        setPreviewTemplate(full)
      }).finally(() => setSelectedTplCodeLoading(false))
    } else {
      setPreviewTemplate(tpl)
    }
  }

  useEffect(() => {
    setPreviewTemplate(null)
    setTemplateAsideTab('description')
    if (selectedTplId !== null) {
      const tpl = myTemplates.find((t) => t.id === selectedTplId)
      if (tpl) handlePreviewTemplate(tpl)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTplId])

  const handleAddToLibrary = async (tpl: TemplateItem) => {
    try {
      await templateAPI.clone(tpl.id)
      void queryClient.invalidateQueries({ queryKey: ['composite-tpl-mine'] })
      showToast(tc('operationSuccess'), 'success')
    } catch {
      showToast(t('templateLibrary.cloneFailed', 'Failed to add to library'), 'error')
    }
  }

  // ── Composites queries & mutations ─────────────────────

  const { data: composites = [], isLoading: loadingComposites } = useQuery<CompositeStrategyListItem[]>({
    queryKey: ['composite-strategies'],
    queryFn: () => compositeStrategiesAPI.list().then((r) => {
      const d = r.data
      return Array.isArray(d) ? d : d?.data ?? []
    }),
    enabled: activeTab === 'composites',
  })

  const { data: compositeDetail } = useQuery<CompositeStrategyDetail>({
    queryKey: ['composite-strategy-detail', detailId],
    queryFn: () => compositeStrategiesAPI.get(detailId!).then((r) => r.data),
    enabled: !!detailId,
  })

  const createCompositeMutation = useMutation({
    mutationFn: () => {
      const payload: Record<string, unknown> = {
        name: compositeForm.name,
        execution_mode: compositeForm.execution_mode,
      }
      if (compositeForm.description) payload.description = compositeForm.description
      const pc = tryParseJson(compositeForm.portfolio_config)
      if (pc) payload.portfolio_config = pc
      const mc = tryParseJson(compositeForm.market_constraints)
      if (mc) payload.market_constraints = mc
      return compositeStrategiesAPI.create(payload as Parameters<typeof compositeStrategiesAPI.create>[0])
    },
    onSuccess: () => {
      showToast(tc('operationSuccess'), 'success')
      setCompositeModal(false)
      setCompositeForm({ ...emptyCompositeForm })
      queryClient.invalidateQueries({ queryKey: ['composite-strategies'] })
    },
    onError: () => showToast(t('composites.saveFailed'), 'error'),
  })

  const updateCompositeMutation = useMutation({
    mutationFn: () => {
      const payload: Record<string, unknown> = {}
      if (compositeForm.name) payload.name = compositeForm.name
      if (compositeForm.description !== undefined) payload.description = compositeForm.description || null
      payload.execution_mode = compositeForm.execution_mode
      const pc = tryParseJson(compositeForm.portfolio_config)
      if (pc) payload.portfolio_config = pc
      const mc = tryParseJson(compositeForm.market_constraints)
      if (mc) payload.market_constraints = mc
      return compositeStrategiesAPI.update(editCompositeId!, payload)
    },
    onSuccess: () => {
      showToast(tc('operationSuccess'), 'success')
      setCompositeModal(false)
      setEditCompositeId(null)
      setCompositeForm({ ...emptyCompositeForm })
      queryClient.invalidateQueries({ queryKey: ['composite-strategies'] })
      if (detailId === editCompositeId) {
        queryClient.invalidateQueries({ queryKey: ['composite-strategy-detail', detailId] })
      }
    },
    onError: () => showToast(t('composites.saveFailed'), 'error'),
  })

  const deleteCompositeMutation = useMutation({
    mutationFn: (id: number) => compositeStrategiesAPI.delete(id),
    onSuccess: () => {
      showToast(tc('operationSuccess'), 'success')
      setDeleteCompositeId(null)
      if (detailId === deleteCompositeId) setDetailId(null)
      queryClient.invalidateQueries({ queryKey: ['composite-strategies'] })
    },
    onError: () => showToast(t('composites.deleteFailed'), 'error'),
  })

  const replaceBindingsMutation = useMutation({
    mutationFn: () => {
      const payload = bindings
        .filter((b) => b.component_id)
        .map((b) => ({
          component_id: Number(b.component_id),
          layer: b.layer,
          ordinal: Number(b.ordinal) || 0,
          weight: Number(b.weight) || 1,
          config_override: tryParseJson(b.config_override),
        }))
      return compositeStrategiesAPI.replaceBindings(bindingCompositeId!, payload)
    },
    onSuccess: () => {
      showToast(tc('operationSuccess'), 'success')
      setBindingModal(false)
      setBindingCompositeId(null)
      queryClient.invalidateQueries({ queryKey: ['composite-strategies'] })
      queryClient.invalidateQueries({ queryKey: ['composite-strategy-detail', bindingCompositeId] })
    },
    onError: () => showToast(t('composites.saveFailed'), 'error'),
  })

  // ── Backtest queries & mutations ───────────────────────

  const { data: backtests = [], isLoading: loadingBacktests } = useQuery<CompositeBacktestListItem[]>({
    queryKey: ['composite-backtests'],
    queryFn: () => compositeBacktestAPI.list().then((r) => {
      const d = r.data
      return Array.isArray(d) ? d : d?.data ?? []
    }),
    enabled: activeTab === 'backtests',
    refetchInterval: activeTab === 'backtests' ? 5000 : false,
  })

  const { data: btResult } = useQuery<CompositeBacktestResult>({
    queryKey: ['composite-backtest-result', btResultJobId],
    queryFn: () => compositeBacktestAPI.get(btResultJobId!).then((r) => r.data),
    enabled: !!btResultJobId,
    refetchInterval: (query) => {
      const status = query.state.data?.status
      return status === 'queued' || status === 'running' ? 3000 : false
    },
  })

  const { data: allComposites = [] } = useQuery<CompositeStrategyListItem[]>({
    queryKey: ['composite-strategies-for-bt'],
    queryFn: () => compositeStrategiesAPI.list().then((r) => {
      const d = r.data
      return Array.isArray(d) ? d : d?.data ?? []
    }),
    enabled: activeTab === 'backtests',
  })

  const submitBtMutation = useMutation({
    mutationFn: () => compositeBacktestAPI.submit({
      composite_strategy_id: Number(btStrategyId),
      start_date: btStartDate,
      end_date: btEndDate,
      initial_capital: Number(btCapital) || 1_000_000,
      benchmark: btBenchmark || '000300.SH',
    }),
    onSuccess: () => {
      showToast(tc('operationSuccess'), 'success')
      setBtModal(false)
      queryClient.invalidateQueries({ queryKey: ['composite-backtests'] })
    },
    onError: () => showToast(t('backtest.submitFailed'), 'error'),
  })

  const deleteBtMutation = useMutation({
    mutationFn: (jobId: string) => compositeBacktestAPI.delete(jobId),
    onSuccess: () => {
      showToast(tc('operationSuccess'), 'success')
      setDeleteBtJobId(null)
      if (btResultJobId === deleteBtJobId) setBtResultJobId(null)
      queryClient.invalidateQueries({ queryKey: ['composite-backtests'] })
    },
    onError: () => showToast(t('backtest.deleteFailed'), 'error'),
  })

  // ── Handlers ───────────────────────────────────────────

  const openEditComposite = (cs: CompositeStrategyListItem) => {
    compositeStrategiesAPI.get(cs.id).then((r) => {
      const c = r.data
      setEditCompositeId(c.id)
      setCompositeForm({
        name: c.name,
        description: c.description || '',
        execution_mode: c.execution_mode,
        portfolio_config: c.portfolio_config ? JSON.stringify(c.portfolio_config, null, 2) : '',
        market_constraints: c.market_constraints ? JSON.stringify(c.market_constraints, null, 2) : '',
      })
      setCompositeModal(true)
    })
  }

  const openBindings = (cs: CompositeStrategyListItem) => {
    compositeStrategiesAPI.get(cs.id).then((r) => {
      const detail: CompositeStrategyDetail = r.data
      setBindingCompositeId(cs.id)
      setBindings(
        detail.bindings.map((b: ComponentBinding) => ({
          component_id: String(b.component_id),
          layer: b.layer,
          ordinal: String(b.ordinal),
          weight: String(b.weight),
          config_override: b.config_override ? JSON.stringify(b.config_override, null, 2) : '',
        }))
      )
      setBindingModal(true)
    })
  }

  const addBindingRow = () => {
    setBindings([...bindings, { ...emptyBindingForm }])
  }

  const removeBindingRow = (idx: number) => {
    setBindings(bindings.filter((_, i) => i !== idx))
  }

  const updateBindingRow = (idx: number, field: keyof FormBinding, value: string) => {
    setBindings(bindings.map((b, i) => i === idx ? { ...b, [field]: value } : b))
  }

  // ── Column definitions ─────────────────────────────────

  const compositeCols: Column<CompositeStrategyListItem>[] = [
    { key: 'name', label: t('composites.name'), sortable: true },
    { key: 'description', label: t('composites.description'), render: (c) => <span className="text-xs text-muted-foreground truncate max-w-[200px] inline-block">{c.description || '-'}</span> },
    {
      key: 'execution_mode', label: t('composites.executionMode'), sortable: true,
      render: (c) => <Badge variant={MODE_VARIANTS[c.execution_mode]}>{t(`executionModes.${c.execution_mode}`)}</Badge>,
    },
    { key: 'component_count', label: t('composites.componentCount'), sortable: true },
    { key: 'updated_at', label: tc('actions'), render: (c) => new Date(c.updated_at).toLocaleDateString() },
    {
      key: 'id', label: '', width: '180px',
      render: (c) => (
        <div className="flex gap-2">
          <button onClick={(e) => { e.stopPropagation(); setDetailId(c.id) }} className="text-xs text-primary hover:underline">{tc('view')}</button>
          <button onClick={(e) => { e.stopPropagation(); openBindings(c) }} className="text-xs text-primary hover:underline">{t('composites.bindings')}</button>
          <button onClick={(e) => { e.stopPropagation(); openEditComposite(c) }} className="text-xs text-primary hover:underline">{tc('edit')}</button>
          <button onClick={(e) => { e.stopPropagation(); setDeleteCompositeId(c.id); setDeleteCompositeName(c.name) }} className="text-xs text-red-500 hover:underline">{tc('delete')}</button>
        </div>
      ),
    },
  ]

  const backtestCols: Column<CompositeBacktestListItem>[] = [
    { key: 'job_id', label: t('backtest.jobId'), render: (r) => <span className="font-mono text-xs">{r.job_id}</span> },
    {
      key: 'status', label: t('backtest.status'), sortable: true,
      render: (r) => <Badge variant={BT_STATUS_VARIANTS[r.status]}>{t(`backtest.${r.status}`)}</Badge>,
    },
    { key: 'start_date', label: t('backtest.startDate'), sortable: true },
    { key: 'end_date', label: t('backtest.endDate') },
    { key: 'initial_capital', label: t('backtest.initialCapital'), render: (r) => r.initial_capital.toLocaleString() },
    { key: 'benchmark', label: t('backtest.benchmark') },
    { key: 'created_at', label: tc('createdAt'), render: (r) => new Date(r.created_at).toLocaleString() },
    {
      key: 'id', label: '', width: '140px',
      render: (r) => (
        <div className="flex gap-2">
          {r.status === 'completed' && (
            <button onClick={(e) => { e.stopPropagation(); setBtResultJobId(r.job_id) }} className="text-xs text-primary hover:underline">{t('backtest.viewResult')}</button>
          )}
          <button onClick={(e) => { e.stopPropagation(); setDeleteBtJobId(r.job_id) }} className="text-xs text-red-500 hover:underline">{tc('delete')}</button>
        </div>
      ),
    },
  ]

  // ── Render ─────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t('title')}</h1>
          <p className="text-sm text-muted-foreground">{t('subtitle')}</p>
        </div>
        <div className="flex gap-2">
          {activeTab === 'composites' && (
            <button onClick={() => { setEditCompositeId(null); setCompositeForm({ ...emptyCompositeForm }); setCompositeModal(true) }} className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md bg-primary text-white hover:opacity-90">
              <Plus size={16} />{t('composites.newComposite')}
            </button>
          )}
          {activeTab === 'backtests' && (
            <button onClick={() => setBtModal(true)} className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md bg-primary text-white hover:opacity-90">
              <Play size={16} />{t('backtest.submit')}
            </button>
          )}
        </div>
      </div>

      <TabPanel tabs={tabs} activeTab={activeTab} onChange={setActiveTab}>
        {/* ── Components Tab (full CRUD) ────────────────── */}
        {activeTab === 'components' && <ComponentsTab />}

        {/* ── Template Library Tab ────────────────────────── */}
        {activeTab === 'templateLibrary' && (
          <div className="grid gap-4 xl:grid-cols-2">
            <section className="rounded-2xl border border-border bg-card shadow-sm p-5">
              <div className="mb-4">
                <h2 className="text-lg font-semibold text-card-foreground">{t('templateLibrary.title', 'Template Library')}</h2>
                <p className="mt-1 text-sm text-muted-foreground">{t('templateLibrary.subtitle', 'Browse component and composite strategy templates')}</p>
              </div>

              <div className="mb-4 flex flex-wrap items-center gap-3">
                <div className="relative min-w-0 flex-1">
                  <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="text"
                    className="h-9 w-full rounded-lg border border-border bg-background pl-9 pr-3 text-sm outline-none focus:border-ring"
                    placeholder={t('templateLibrary.searchPlaceholder', 'Search templates...')}
                    value={tplSearch}
                    onChange={(e) => setTplSearch(e.target.value)}
                  />
                </div>
                <select
                  className="h-9 rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-ring"
                  value={tplSourceFilter}
                  onChange={(e) => setTplSourceFilter(e.target.value as 'all' | 'marketplace' | 'personal')}
                >
                  <option value="all">{t('templateLibrary.sourceAll', 'All Sources')}</option>
                  <option value="marketplace">{t('templateLibrary.originMarketplace', 'From Marketplace')}</option>
                  <option value="personal">{t('templateLibrary.originPersonal', 'User Created')}</option>
                </select>
                <select
                  className="h-9 rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-ring"
                  value={tplTypeFilter}
                  onChange={(e) => setTplTypeFilter(e.target.value as 'all' | 'component' | 'composite')}
                >
                  <option value="all">{t('templateLibrary.typeAll', 'All Types')}</option>
                  <option value="component">{t('templateLibrary.typeComponent', 'Component')}</option>
                  <option value="composite">{t('templateLibrary.typeComposite', 'Composite')}</option>
                </select>
              </div>

              {filteredTpl.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
                  {t('templateLibrary.empty', 'No templates found')}
                </div>
              ) : (
                <div className="grid gap-3">
                  {filteredTpl.map((tpl) => (
                    <article
                      key={tpl.id}
                      className={`rounded-lg border bg-background p-4 space-y-2 cursor-pointer transition-colors ${
                        selectedTplId === tpl.id ? 'border-ring' : 'border-border hover:border-ring/50'
                      }`}
                      onClick={() => setSelectedTplId(tpl.id)}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="font-medium text-sm text-card-foreground truncate">{tpl.name}</span>
                        <Badge variant={tpl.template_type === 'composite' ? 'warning' : 'primary'}>
                          {tpl.template_type === 'composite' ? t('templateLibrary.typeComposite', 'Composite') : t('templateLibrary.typeComponent', 'Component')}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2">{tpl.description || '-'}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Badge variant={tpl.origin === 'marketplace' ? 'success' : 'muted'}>
                          {tpl.origin === 'marketplace' ? t('templateLibrary.originMarketplace', 'From Marketplace') : t('templateLibrary.originPersonal', 'User Created')}
                        </Badge>
                        <span>{tpl.downloads} downloads</span>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>

            <aside className="rounded-2xl border border-border bg-card shadow-sm p-5">
              {selectedTpl ? (
                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-semibold text-card-foreground">{selectedTpl.name}</h3>
                    <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{selectedTpl.description || '-'}</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Badge variant={selectedTpl.template_type === 'composite' ? 'warning' : 'primary'}>
                        {selectedTpl.template_type === 'composite' ? t('templateLibrary.typeComposite', 'Composite') : t('templateLibrary.typeComponent', 'Component')}
                      </Badge>
                      <Badge variant={selectedTpl.origin === 'marketplace' ? 'success' : 'muted'}>
                        {selectedTpl.origin === 'marketplace' ? t('templateLibrary.originMarketplace', 'From Marketplace') : t('templateLibrary.originPersonal', 'User Created')}
                      </Badge>
                    </div>
                  </div>
                  <TabPanel
                    tabs={[
                      { key: 'description', label: t('templateLibrary.tabs.description', 'Description') },
                      { key: 'code', label: t('templateLibrary.tabs.code', 'Code') },
                      { key: 'params', label: t('templateLibrary.tabs.params', 'Parameters') },
                    ]}
                    activeTab={templateAsideTab}
                    onChange={(k) => setTemplateAsideTab(k as 'description' | 'code' | 'params')}
                  >
                    {templateAsideTab === 'description' && (
                      <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
                        {selectedTpl.description || '-'}
                      </p>
                    )}
                    {templateAsideTab === 'code' && (
                      <div>
                        {selectedTplCodeLoading ? (
                          <div className="rounded-lg border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
                            {t('templateLibrary.tabs.loadingCode', 'Loading code...')}
                          </div>
                        ) : previewTemplate?.code ? (
                          <pre className="max-h-[40vh] overflow-auto rounded-lg border border-border bg-muted/20 p-4 text-xs font-mono leading-6 text-foreground whitespace-pre-wrap">
                            {previewTemplate.code}
                          </pre>
                        ) : (
                          <div className="rounded-lg border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
                            {t('templateLibrary.tabs.noCode', 'Code not available.')}
                          </div>
                        )}
                      </div>
                    )}
                    {templateAsideTab === 'params' && (
                      <div>
                        {selectedTplCodeLoading ? (
                          <div className="rounded-lg border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
                            {t('templateLibrary.tabs.loadingCode', 'Loading...')}
                          </div>
                        ) : (() => {
                          const raw = previewTemplate?.default_params
                          if (!raw) return (
                            <div className="rounded-lg border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
                              {t('templateLibrary.tabs.noParams', 'No parameters defined.')}
                            </div>
                          )
                          const parsed: Record<string, unknown> | null = typeof raw === 'string'
                            ? (() => { try { return JSON.parse(raw) as Record<string, unknown> } catch { return null } })()
                            : raw as Record<string, unknown>
                          if (!parsed || Object.keys(parsed).length === 0) return (
                            <div className="rounded-lg border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
                              {t('templateLibrary.tabs.noParams', 'No parameters defined.')}
                            </div>
                          )
                          return (
                            <pre className="max-h-[40vh] overflow-auto rounded-lg border border-border bg-muted/20 p-4 text-xs font-mono leading-6 text-foreground whitespace-pre-wrap">
                              {JSON.stringify(parsed, null, 2)}
                            </pre>
                          )
                        })()}
                      </div>
                    )}
                  </TabPanel>
                </div>
              ) : (
                <div className="flex min-h-[320px] flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-muted/20 px-6 text-center">
                  <Eye size={24} className="text-muted-foreground" />
                  <div className="mt-4 text-base font-semibold text-foreground">{t('templateLibrary.previewTitle', 'Select a Template')}</div>
                  <p className="mt-2 text-sm text-muted-foreground">{t('templateLibrary.previewDescription', 'Click a template card to see its details')}</p>
                </div>
              )}
            </aside>
          </div>
        )}

        {/* ── Composites Tab ──────────────────────────────── */}
        {activeTab === 'composites' && (
          <div className="space-y-4">
            <DataTable
              columns={compositeCols}
              data={composites}
              emptyText={loadingComposites ? tc('loading') : t('composites.noComposites')}
            />

            {/* Detail panel */}
            {detailId && compositeDetail && (
              <div className="rounded-lg border border-border bg-card p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-card-foreground">{compositeDetail.name}</h3>
                  <button onClick={() => setDetailId(null)} className="text-xs text-muted-foreground hover:text-foreground">{tc('close')}</button>
                </div>
                {compositeDetail.description && (
                  <p className="text-sm text-muted-foreground">{compositeDetail.description}</p>
                )}
                <div className="flex gap-4 text-sm">
                  <span>{t('composites.executionMode')}: <Badge variant={MODE_VARIANTS[compositeDetail.execution_mode]}>{t(`executionModes.${compositeDetail.execution_mode}`)}</Badge></span>
                </div>
                {compositeDetail.bindings.length > 0 ? (
                  <div>
                    <h4 className="text-sm font-medium mb-2">{t('composites.bindings')} ({compositeDetail.bindings.length})</h4>
                    <div className="space-y-2">
                      {compositeDetail.bindings.map((b) => (
                        <div key={b.id} className="flex items-center gap-3 text-sm px-3 py-2 rounded border border-border">
                          <Badge variant={LAYER_VARIANTS[b.layer]}>{t(`layers.${b.layer}`)}</Badge>
                          <span className="font-medium">{b.component_name || `#${b.component_id}`}</span>
                          {b.component_sub_type && <span className="text-muted-foreground">{b.component_sub_type}</span>}
                          <span className="text-muted-foreground ml-auto">{t('composites.weight')}: {b.weight}</span>
                          <span className="text-muted-foreground">{t('composites.ordinal')}: {b.ordinal}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">{t('components.noComponents')}</p>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── Backtests Tab ───────────────────────────────── */}
        {activeTab === 'backtests' && (
          <div className="space-y-4">
            <DataTable
              columns={backtestCols}
              data={backtests}
              emptyText={loadingBacktests ? tc('loading') : t('backtest.noBacktests')}
            />

            {/* Backtest result panel */}
            {btResultJobId && btResult && (
              <div className="rounded-lg border border-border bg-card p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-card-foreground">{t('backtest.result.title')}</h3>
                  <div className="flex items-center gap-3">
                    <Badge variant={BT_STATUS_VARIANTS[btResult.status]}>{t(`backtest.${btResult.status}`)}</Badge>
                    <button onClick={() => setBtResultJobId(null)} className="text-xs text-muted-foreground hover:text-foreground">{tc('close')}</button>
                  </div>
                </div>

                {btResult.status === 'queued' || btResult.status === 'running' ? (
                  <p className="text-sm text-muted-foreground animate-pulse">{t(`backtest.${btResult.status}`)}...</p>
                ) : btResult.status === 'failed' ? (
                  <p className="text-sm text-red-500">{btResult.error_message}</p>
                ) : btResult.result ? (
                  <div className="space-y-4">
                    {/* Metrics */}
                    <div>
                      <h4 className="text-sm font-medium mb-2">{t('backtest.result.metrics')}</h4>
                      <div className="grid grid-cols-4 gap-3">
                        {[
                          { label: t('backtest.result.totalReturn'), value: `${((btResult.result.metrics?.total_return ?? 0) * 100).toFixed(2)}%` },
                          { label: t('backtest.result.annualReturn'), value: `${((btResult.result.metrics?.annual_return ?? 0) * 100).toFixed(2)}%` },
                          { label: t('backtest.result.maxDrawdown'), value: `${((btResult.result.metrics?.max_drawdown ?? 0) * 100).toFixed(2)}%` },
                          { label: t('backtest.result.sharpeRatio'), value: (btResult.result.metrics?.sharpe_ratio ?? 0).toFixed(3) },
                          { label: t('backtest.result.winningRate'), value: `${((btResult.result.metrics?.winning_rate ?? 0) * 100).toFixed(1)}%` },
                          { label: t('backtest.result.totalTrades'), value: String(btResult.result.metrics?.total_trades ?? 0) },
                          { label: t('backtest.result.alpha'), value: btResult.result.metrics?.alpha != null ? (btResult.result.metrics.alpha * 100).toFixed(2) + '%' : '-' },
                          { label: t('backtest.result.beta'), value: btResult.result.metrics?.beta != null ? btResult.result.metrics.beta.toFixed(3) : '-' },
                        ].map((m) => (
                          <div key={m.label} className="px-3 py-2 rounded border border-border bg-muted/30">
                            <div className="text-xs text-muted-foreground">{m.label}</div>
                            <div className="text-sm font-semibold">{m.value}</div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Equity Curve (simple text-based) */}
                    {btResult.result.equity_curve && btResult.result.equity_curve.length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium mb-2">{t('backtest.result.equityCurve')} ({btResult.result.equity_curve.length} {t('backtest.result.date')})</h4>
                        <div className="max-h-48 overflow-auto border border-border rounded">
                          <table className="w-full text-xs">
                            <thead className="bg-muted/50 sticky top-0">
                              <tr>
                                <th className="px-3 py-1 text-left">{t('backtest.result.date')}</th>
                                <th className="px-3 py-1 text-right">{t('backtest.result.amount')}</th>
                              </tr>
                            </thead>
                            <tbody>
                              {btResult.result.equity_curve.map((p, i) => (
                                <tr key={i} className="border-t border-border">
                                  <td className="px-3 py-1">{p.date}</td>
                                  <td className="px-3 py-1 text-right font-mono">{p.equity.toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    {/* Trade Log */}
                    {btResult.result.trade_log && btResult.result.trade_log.length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium mb-2">{t('backtest.result.tradeLog')} ({btResult.result.trade_log.length})</h4>
                        <div className="max-h-64 overflow-auto border border-border rounded">
                          <table className="w-full text-xs">
                            <thead className="bg-muted/50 sticky top-0">
                              <tr>
                                {[t('backtest.result.date'), t('backtest.result.symbol'), t('backtest.result.direction'), t('backtest.result.quantity'), t('backtest.result.price'), t('backtest.result.amount'), t('backtest.result.commission'), t('backtest.result.reason')].map((h) => (
                                  <th key={h} className="px-2 py-1 text-left">{h}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {btResult.result.trade_log.map((tr, i) => (
                                <tr key={i} className="border-t border-border">
                                  <td className="px-2 py-1">{tr.date}</td>
                                  <td className="px-2 py-1 font-mono">{tr.symbol}</td>
                                  <td className="px-2 py-1"><Badge variant={tr.direction === 'BUY' ? 'success' : 'destructive'}>{tr.direction}</Badge></td>
                                  <td className="px-2 py-1 text-right">{tr.quantity}</td>
                                  <td className="px-2 py-1 text-right font-mono">{tr.price.toFixed(2)}</td>
                                  <td className="px-2 py-1 text-right font-mono">{tr.amount.toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
                                  <td className="px-2 py-1 text-right font-mono">{tr.commission.toFixed(2)}</td>
                                  <td className="px-2 py-1 text-muted-foreground">{tr.reason}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    {/* Attribution */}
                    {btResult.attribution && (
                      <div>
                        <h4 className="text-sm font-medium mb-2">{t('backtest.result.attribution')}</h4>
                        <div className="grid grid-cols-3 gap-3">
                          {(['universe', 'trading', 'risk'] as const).map((layer) => (
                            <div key={layer} className="rounded border border-border p-3">
                              <div className="flex items-center gap-2 mb-2">
                                <Badge variant={LAYER_VARIANTS[layer]}>{t(`layers.${layer}`)}</Badge>
                              </div>
                              <pre className="text-xs font-mono text-muted-foreground whitespace-pre-wrap max-h-32 overflow-auto">
                                {btResult.attribution?.[layer] ? JSON.stringify(btResult.attribution[layer], null, 2) : '-'}
                              </pre>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : null}
              </div>
            )}
          </div>
        )}
      </TabPanel>

      {/* ── Composite Create/Edit Modal ───────────────────── */}
      <Modal
        open={compositeModal}
        onClose={() => { setCompositeModal(false); setEditCompositeId(null) }}
        title={editCompositeId ? t('composites.editComposite') : t('composites.newComposite')}
        size="lg"
        footer={
          <>
            <button onClick={() => { setCompositeModal(false); setEditCompositeId(null) }} className="px-4 py-2 text-sm rounded-md border border-border hover:bg-muted">{tc('cancel')}</button>
            <button
              onClick={() => editCompositeId ? updateCompositeMutation.mutate() : createCompositeMutation.mutate()}
              disabled={!compositeForm.name}
              className="px-4 py-2 text-sm rounded-md bg-primary text-white hover:opacity-90 disabled:opacity-50"
            >
              {editCompositeId ? tc('update') : tc('create')}
            </button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">{t('composites.name')}</label>
            <input value={compositeForm.name} onChange={(e) => setCompositeForm({ ...compositeForm, name: e.target.value })} className="w-full px-3 py-2 text-sm rounded-md border border-border bg-background" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">{t('composites.description')}</label>
            <textarea value={compositeForm.description} onChange={(e) => setCompositeForm({ ...compositeForm, description: e.target.value })} rows={2} className="w-full px-3 py-2 text-sm rounded-md border border-border bg-background resize-none" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">{t('composites.executionMode')}</label>
            <select value={compositeForm.execution_mode} onChange={(e) => setCompositeForm({ ...compositeForm, execution_mode: e.target.value as ExecutionMode })} className="w-full px-3 py-2 text-sm rounded-md border border-border bg-background">
              <option value="backtest">{t('executionModes.backtest')}</option>
              <option value="paper">{t('executionModes.paper')}</option>
              <option value="live">{t('executionModes.live')}</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">{t('composites.portfolioConfig')} (JSON)</label>
              <textarea value={compositeForm.portfolio_config} onChange={(e) => setCompositeForm({ ...compositeForm, portfolio_config: e.target.value })} rows={3} className="w-full px-3 py-2 text-sm rounded-md border border-border bg-background font-mono resize-none" placeholder='{"allocator": "equal_weight"}' />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">{t('composites.marketConstraints')} (JSON)</label>
              <textarea value={compositeForm.market_constraints} onChange={(e) => setCompositeForm({ ...compositeForm, market_constraints: e.target.value })} rows={3} className="w-full px-3 py-2 text-sm rounded-md border border-border bg-background font-mono resize-none" placeholder='{"t_plus_1": true, "lot_size": 100}' />
            </div>
          </div>
        </div>
      </Modal>

      {/* ── Composite Delete Confirm ──────────────────────── */}
      <Modal
        open={!!deleteCompositeId}
        onClose={() => setDeleteCompositeId(null)}
        title={t('composites.deleteComposite')}
        footer={
          <>
            <button onClick={() => setDeleteCompositeId(null)} className="px-4 py-2 text-sm rounded-md border border-border hover:bg-muted">{tc('cancel')}</button>
            <button onClick={() => deleteCompositeMutation.mutate(deleteCompositeId!)} className="px-4 py-2 text-sm rounded-md bg-red-600 text-white hover:opacity-90">{tc('confirm')}</button>
          </>
        }
      >
        <p className="text-sm">{t('composites.deleteConfirm', { name: deleteCompositeName })}</p>
      </Modal>

      {/* ── Bindings Editor Modal ─────────────────────────── */}
      <Modal
        open={bindingModal}
        onClose={() => { setBindingModal(false); setBindingCompositeId(null) }}
        title={t('composites.bindings')}
        size="lg"
        footer={
          <>
            <button onClick={() => { setBindingModal(false); setBindingCompositeId(null) }} className="px-4 py-2 text-sm rounded-md border border-border hover:bg-muted">{tc('cancel')}</button>
            <button onClick={() => replaceBindingsMutation.mutate()} className="px-4 py-2 text-sm rounded-md bg-primary text-white hover:opacity-90">{tc('save')}</button>
          </>
        }
      >
        <div className="space-y-3">
          {bindings.map((b, idx) => (
            <div key={idx} className="flex items-start gap-2 p-3 rounded border border-border">
              <div className="flex-1 grid grid-cols-4 gap-2">
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">ID</label>
                  <input type="number" value={b.component_id} onChange={(e) => updateBindingRow(idx, 'component_id', e.target.value)} className="w-full px-2 py-1 text-sm rounded border border-border bg-background" />
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">{t('components.layer')}</label>
                  <select value={b.layer} onChange={(e) => updateBindingRow(idx, 'layer', e.target.value)} className="w-full px-2 py-1 text-sm rounded border border-border bg-background">
                    <option value="universe">{t('layers.universe')}</option>
                    <option value="trading">{t('layers.trading')}</option>
                    <option value="risk">{t('layers.risk')}</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">{t('composites.weight')}</label>
                  <input type="number" step="0.1" min="0" max="1" value={b.weight} onChange={(e) => updateBindingRow(idx, 'weight', e.target.value)} className="w-full px-2 py-1 text-sm rounded border border-border bg-background" />
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">{t('composites.ordinal')}</label>
                  <input type="number" value={b.ordinal} onChange={(e) => updateBindingRow(idx, 'ordinal', e.target.value)} className="w-full px-2 py-1 text-sm rounded border border-border bg-background" />
                </div>
              </div>
              <button onClick={() => removeBindingRow(idx)} className="mt-5 p-1 text-red-500 hover:text-red-700">
                <Trash2 size={14} />
              </button>
            </div>
          ))}
          <button onClick={addBindingRow} className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md border border-dashed border-border text-muted-foreground hover:text-foreground hover:border-primary">
            <Plus size={14} />{t('composites.addBinding')}
          </button>
        </div>
      </Modal>

      {/* ── Submit Backtest Modal ─────────────────────────── */}
      <Modal
        open={btModal}
        onClose={() => setBtModal(false)}
        title={t('backtest.submit')}
        footer={
          <>
            <button onClick={() => setBtModal(false)} className="px-4 py-2 text-sm rounded-md border border-border hover:bg-muted">{tc('cancel')}</button>
            <button
              onClick={() => submitBtMutation.mutate()}
              disabled={!btStrategyId || !btStartDate || !btEndDate}
              className="px-4 py-2 text-sm rounded-md bg-primary text-white hover:opacity-90 disabled:opacity-50"
            >
              {t('backtest.submit')}
            </button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">{t('backtest.strategy')}</label>
            <select value={btStrategyId} onChange={(e) => setBtStrategyId(e.target.value)} className="w-full px-3 py-2 text-sm rounded-md border border-border bg-background">
              <option value="">--</option>
              {allComposites.map((cs) => (
                <option key={cs.id} value={cs.id}>{cs.name}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">{t('backtest.startDate')}</label>
              <input type="date" value={btStartDate} onChange={(e) => setBtStartDate(e.target.value)} className="w-full px-3 py-2 text-sm rounded-md border border-border bg-background" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">{t('backtest.endDate')}</label>
              <input type="date" value={btEndDate} onChange={(e) => setBtEndDate(e.target.value)} className="w-full px-3 py-2 text-sm rounded-md border border-border bg-background" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">{t('backtest.initialCapital')}</label>
              <input type="number" value={btCapital} onChange={(e) => setBtCapital(e.target.value)} className="w-full px-3 py-2 text-sm rounded-md border border-border bg-background" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">{t('backtest.benchmark')}</label>
              <input value={btBenchmark} onChange={(e) => setBtBenchmark(e.target.value)} className="w-full px-3 py-2 text-sm rounded-md border border-border bg-background" placeholder="000300.SH" />
            </div>
          </div>
        </div>
      </Modal>

      {/* ── Backtest Delete Confirm ───────────────────────── */}
      <Modal
        open={!!deleteBtJobId}
        onClose={() => setDeleteBtJobId(null)}
        title={t('backtest.title')}
        footer={
          <>
            <button onClick={() => setDeleteBtJobId(null)} className="px-4 py-2 text-sm rounded-md border border-border hover:bg-muted">{tc('cancel')}</button>
            <button onClick={() => deleteBtMutation.mutate(deleteBtJobId!)} className="px-4 py-2 text-sm rounded-md bg-red-600 text-white hover:opacity-90">{tc('confirm')}</button>
          </>
        }
      >
        <p className="text-sm">{t('backtest.deleteConfirm')}</p>
      </Modal>

      {/* ── Template Preview Drawer ───────────────────────── */}
    </div>
  )
}
