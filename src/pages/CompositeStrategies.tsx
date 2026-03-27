import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  BarChart3,
  Combine,
  Layers,
  Play,
  Plus,
  Trash2,
} from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import Badge, { type BadgeVariant } from '../components/ui/Badge'
import DataTable, { type Column } from '../components/ui/DataTable'
import Modal from '../components/ui/Modal'
import TabPanel from '../components/ui/TabPanel'
import { showToast } from '../components/ui/toast-service'
import { strategyComponentsAPI, compositeStrategiesAPI, compositeBacktestAPI } from '../lib/api'
import type {
  ComponentLayer,
  ExecutionMode,
  StrategyComponentListItem,
  CompositeStrategyListItem,
  CompositeStrategyDetail,
  ComponentBinding,
  CompositeBacktestListItem,
  CompositeBacktestResult,
  CompositeBacktestStatus,
} from '../types'

type FormComponent = {
  name: string
  layer: ComponentLayer
  sub_type: string
  description: string
  code: string
  config: string
  parameters: string
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

const emptyComponentForm: FormComponent = {
  name: '', layer: 'universe', sub_type: '', description: '', code: '', config: '', parameters: '',
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
  const [layerFilter, setLayerFilter] = useState<ComponentLayer | ''>('')

  // Component modals
  const [compModal, setCompModal] = useState(false)
  const [editCompId, setEditCompId] = useState<number | null>(null)
  const [compForm, setCompForm] = useState<FormComponent>({ ...emptyComponentForm })
  const [deleteCompId, setDeleteCompId] = useState<number | null>(null)
  const [deleteCompName, setDeleteCompName] = useState('')

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
    { key: 'backtests', label: t('backtest.title'), icon: <BarChart3 size={16} /> },
  ]

  // ── Components queries & mutations ─────────────────────

  const { data: components = [], isLoading: loadingComps } = useQuery<StrategyComponentListItem[]>({
    queryKey: ['strategy-components', layerFilter],
    queryFn: () => strategyComponentsAPI.list(layerFilter ? { layer: layerFilter } : undefined).then((r) => {
      const d = r.data
      return Array.isArray(d) ? d : d?.data ?? []
    }),
  })

  const createCompMutation = useMutation({
    mutationFn: () => {
      const payload: Record<string, unknown> = {
        name: compForm.name,
        layer: compForm.layer,
        sub_type: compForm.sub_type,
      }
      if (compForm.description) payload.description = compForm.description
      if (compForm.code) payload.code = compForm.code
      const cfg = tryParseJson(compForm.config)
      if (cfg) payload.config = cfg
      const params = tryParseJson(compForm.parameters)
      if (params) payload.parameters = params
      return strategyComponentsAPI.create(payload as Parameters<typeof strategyComponentsAPI.create>[0])
    },
    onSuccess: () => {
      showToast(tc('operationSuccess'), 'success')
      setCompModal(false)
      setCompForm({ ...emptyComponentForm })
      queryClient.invalidateQueries({ queryKey: ['strategy-components'] })
    },
    onError: () => showToast(t('components.saveFailed'), 'error'),
  })

  const updateCompMutation = useMutation({
    mutationFn: () => {
      const payload: Record<string, unknown> = {}
      if (compForm.name) payload.name = compForm.name
      if (compForm.sub_type) payload.sub_type = compForm.sub_type
      if (compForm.description !== undefined) payload.description = compForm.description || null
      if (compForm.code !== undefined) payload.code = compForm.code || null
      const cfg = tryParseJson(compForm.config)
      if (cfg) payload.config = cfg
      const params = tryParseJson(compForm.parameters)
      if (params) payload.parameters = params
      return strategyComponentsAPI.update(editCompId!, payload)
    },
    onSuccess: () => {
      showToast(tc('operationSuccess'), 'success')
      setCompModal(false)
      setEditCompId(null)
      setCompForm({ ...emptyComponentForm })
      queryClient.invalidateQueries({ queryKey: ['strategy-components'] })
    },
    onError: () => showToast(t('components.saveFailed'), 'error'),
  })

  const deleteCompMutation = useMutation({
    mutationFn: (id: number) => strategyComponentsAPI.delete(id),
    onSuccess: () => {
      showToast(tc('operationSuccess'), 'success')
      setDeleteCompId(null)
      queryClient.invalidateQueries({ queryKey: ['strategy-components'] })
    },
    onError: () => showToast(t('components.deleteFailed'), 'error'),
  })

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

  const openEditComponent = (comp: StrategyComponentListItem) => {
    strategyComponentsAPI.get(comp.id).then((r) => {
      const c = r.data
      setEditCompId(c.id)
      setCompForm({
        name: c.name,
        layer: c.layer,
        sub_type: c.sub_type,
        description: c.description || '',
        code: c.code || '',
        config: c.config ? JSON.stringify(c.config, null, 2) : '',
        parameters: c.parameters ? JSON.stringify(c.parameters, null, 2) : '',
      })
      setCompModal(true)
    })
  }

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

  const componentCols: Column<StrategyComponentListItem>[] = [
    { key: 'name', label: t('components.name'), sortable: true },
    {
      key: 'layer', label: t('components.layer'), sortable: true,
      render: (c) => <Badge variant={LAYER_VARIANTS[c.layer]}>{t(`layers.${c.layer}`)}</Badge>,
    },
    { key: 'sub_type', label: t('components.subType'), sortable: true },
    { key: 'description', label: t('components.description'), render: (c) => <span className="text-xs text-muted-foreground truncate max-w-[200px] inline-block">{c.description || '-'}</span> },
    { key: 'version', label: t('components.version') },
    { key: 'updated_at', label: tc('actions'), render: (c) => new Date(c.updated_at).toLocaleDateString() },
    {
      key: 'id', label: '', width: '120px',
      render: (c) => (
        <div className="flex gap-2">
          <button onClick={(e) => { e.stopPropagation(); openEditComponent(c) }} className="text-xs text-primary hover:underline">{tc('edit')}</button>
          <button onClick={(e) => { e.stopPropagation(); setDeleteCompId(c.id); setDeleteCompName(c.name) }} className="text-xs text-red-500 hover:underline">{tc('delete')}</button>
        </div>
      ),
    },
  ]

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
          {activeTab === 'components' && (
            <button onClick={() => { setEditCompId(null); setCompForm({ ...emptyComponentForm }); setCompModal(true) }} className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md bg-primary text-white hover:opacity-90">
              <Plus size={16} />{t('components.newComponent')}
            </button>
          )}
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
        {/* ── Components Tab ──────────────────────────────── */}
        {activeTab === 'components' && (
          <div className="space-y-4">
            {/* Layer filter */}
            <div className="flex gap-2">
              {(['', 'universe', 'trading', 'risk'] as const).map((layer) => (
                <button
                  key={layer || 'all'}
                  onClick={() => setLayerFilter(layer as ComponentLayer | '')}
                  className={`px-3 py-1 text-xs rounded-full border transition-colors ${
                    layerFilter === layer
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {layer ? t(`layers.${layer}`) : t('layers.all')}
                </button>
              ))}
            </div>
            <DataTable
              columns={componentCols}
              data={components}
              emptyText={loadingComps ? tc('loading') : t('components.noComponents')}
            />
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

      {/* ── Component Create/Edit Modal ───────────────────── */}
      <Modal
        open={compModal}
        onClose={() => { setCompModal(false); setEditCompId(null) }}
        title={editCompId ? t('components.editComponent') : t('components.newComponent')}
        size="lg"
        footer={
          <>
            <button onClick={() => { setCompModal(false); setEditCompId(null) }} className="px-4 py-2 text-sm rounded-md border border-border hover:bg-muted">{tc('cancel')}</button>
            <button
              onClick={() => editCompId ? updateCompMutation.mutate() : createCompMutation.mutate()}
              disabled={!compForm.name || !compForm.sub_type}
              className="px-4 py-2 text-sm rounded-md bg-primary text-white hover:opacity-90 disabled:opacity-50"
            >
              {editCompId ? tc('update') : tc('create')}
            </button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">{t('components.name')}</label>
              <input value={compForm.name} onChange={(e) => setCompForm({ ...compForm, name: e.target.value })} className="w-full px-3 py-2 text-sm rounded-md border border-border bg-background" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">{t('components.layer')}</label>
              <select value={compForm.layer} onChange={(e) => setCompForm({ ...compForm, layer: e.target.value as ComponentLayer })} disabled={!!editCompId} className="w-full px-3 py-2 text-sm rounded-md border border-border bg-background">
                <option value="universe">{t('layers.universe')}</option>
                <option value="trading">{t('layers.trading')}</option>
                <option value="risk">{t('layers.risk')}</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">{t('components.subType')}</label>
            <input value={compForm.sub_type} onChange={(e) => setCompForm({ ...compForm, sub_type: e.target.value })} placeholder="e.g. sector_filter, momentum_alpha, max_drawdown" className="w-full px-3 py-2 text-sm rounded-md border border-border bg-background" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">{t('components.description')}</label>
            <textarea value={compForm.description} onChange={(e) => setCompForm({ ...compForm, description: e.target.value })} rows={2} className="w-full px-3 py-2 text-sm rounded-md border border-border bg-background resize-none" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">{t('components.code')}</label>
            <textarea value={compForm.code} onChange={(e) => setCompForm({ ...compForm, code: e.target.value })} rows={6} className="w-full px-3 py-2 text-sm rounded-md border border-border bg-background font-mono resize-none" placeholder="# Python code for this component" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">{t('components.config')} (JSON)</label>
              <textarea value={compForm.config} onChange={(e) => setCompForm({ ...compForm, config: e.target.value })} rows={3} className="w-full px-3 py-2 text-sm rounded-md border border-border bg-background font-mono resize-none" placeholder="{}" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">{t('components.parameters')} (JSON)</label>
              <textarea value={compForm.parameters} onChange={(e) => setCompForm({ ...compForm, parameters: e.target.value })} rows={3} className="w-full px-3 py-2 text-sm rounded-md border border-border bg-background font-mono resize-none" placeholder="{}" />
            </div>
          </div>
        </div>
      </Modal>

      {/* ── Component Delete Confirm ──────────────────────── */}
      <Modal
        open={!!deleteCompId}
        onClose={() => setDeleteCompId(null)}
        title={t('components.deleteComponent')}
        footer={
          <>
            <button onClick={() => setDeleteCompId(null)} className="px-4 py-2 text-sm rounded-md border border-border hover:bg-muted">{tc('cancel')}</button>
            <button onClick={() => deleteCompMutation.mutate(deleteCompId!)} className="px-4 py-2 text-sm rounded-md bg-red-600 text-white hover:opacity-90">{tc('confirm')}</button>
          </>
        }
      >
        <p className="text-sm">{t('components.deleteConfirm', { name: deleteCompName })}</p>
      </Modal>

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
    </div>
  )
}
