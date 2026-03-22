import {
  AlertCircle,
  CheckCircle2,
  Copy,
  Eye,
  FileCode2,
  Info,
  Plus,
  RotateCcw,
  Save,
  Search,
  Trash2,
  Upload,
  X,
} from 'lucide-react'
import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'

import Badge, { type BadgeVariant } from '../components/ui/Badge'
import TabPanel from '../components/ui/TabPanel'
import { strategiesAPI, strategyCodeAPI } from '../lib/api'
import type { Strategy } from '../types'

type MainTabKey = 'workspace' | 'templates'
type DetailTabKey = 'code' | 'parameters' | 'history'
type StrategyCategoryKey = 'cta' | 'alpha' | 'statArb' | 'grid' | 'ai' | 'custom'

type StrategyListItem = Pick<
  Strategy,
  'id' | 'name' | 'class_name' | 'description' | 'version' | 'is_active' | 'created_at' | 'updated_at'
>

type DraftStrategy = {
  id?: number
  name: string
  class_name: string
  description: string
  code: string
  parametersText: string
}

type HistoryEntry = {
  id: number
  created_at?: string
  version?: number | null
  code?: string | null
  parameters?: unknown
}

type BuiltinStrategyApiItem = {
  name: string
  class_name?: string | null
  description?: string | null
}

type StrategyTemplate = {
  key: string
  backendName: string
  category: StrategyCategoryKey
  nameKey: string
  descriptionKey: string
  code: string
  defaultParameters: Record<string, unknown>
}

type TemplateCard = StrategyTemplate & {
  availableOnServer: boolean
  serverDescription?: string | null
}

type ToastState = {
  message: string
  type: 'success' | 'error' | 'info'
}

type ConfirmState = {
  title: string
  message: string
  confirmLabel: string
  onConfirm: () => void
} | null

type HistoryPreviewState = {
  title: string
  code: string
  parameters: string
} | null

type CreateFormState = {
  name: string
  description: string
  category: StrategyCategoryKey
  templateKey: string
}

const DEFAULT_PARAMETERS: Record<string, unknown> = {
  short_window: 5,
  long_window: 20,
  initial_capital: 1000000,
  fee_rate: 0.0003,
}

function buildSkeletonCode(className: string, strategyName: string, description: string) {
  return `"""${description}"""

from __future__ import annotations

import pandas as pd


class ${className}:
    """${strategyName} strategy."""

    def __init__(self, short_window: int = 5, long_window: int = 20):
        self.short_window = short_window
        self.long_window = long_window
        self.name = "${strategyName}"

    def generate_signals(self, data: pd.DataFrame) -> pd.DataFrame:
        frame = data.copy()
        frame["ma_short"] = frame["close"].rolling(self.short_window).mean()
        frame["ma_long"] = frame["close"].rolling(self.long_window).mean()
        frame["signal"] = 0
        frame.loc[frame["ma_short"] > frame["ma_long"], "signal"] = 1
        frame.loc[frame["ma_short"] < frame["ma_long"], "signal"] = -1
        return frame

    def on_bar(self, bar: pd.DataFrame):
        signals = self.generate_signals(bar)
        latest = signals["signal"].iloc[-1]
        if latest > 0:
            return {"action": "BUY", "size": 100}
        if latest < 0:
            return {"action": "SELL", "size": 100}
        return None
`
}

const TEMPLATE_CATALOG: StrategyTemplate[] = [
  {
    key: 'dual-ma',
    backendName: 'DualMAStrategy',
    category: 'cta',
    nameKey: 'templates.dualMa.name',
    descriptionKey: 'templates.dualMa.description',
    code: buildSkeletonCode('DualMAStrategy', 'Dual MA Crossover', 'Dual moving average crossover strategy.'),
    defaultParameters: { short_window: 5, long_window: 20, initial_capital: 1000000, fee_rate: 0.0003 },
  },
  {
    key: 'rsi-reversal',
    backendName: 'RSIReversalStrategy',
    category: 'cta',
    nameKey: 'templates.rsi.name',
    descriptionKey: 'templates.rsi.description',
    code: buildSkeletonCode('RSIReversalStrategy', 'RSI Reversal', 'RSI mean-reversion strategy for oversold and overbought zones.'),
    defaultParameters: { rsi_window: 14, oversold: 30, overbought: 70, initial_capital: 1000000 },
  },
  {
    key: 'boll-breakout',
    backendName: 'BollingerBandStrategy',
    category: 'cta',
    nameKey: 'templates.bollinger.name',
    descriptionKey: 'templates.bollinger.description',
    code: buildSkeletonCode('BollingerBandStrategy', 'Bollinger Breakout', 'Volatility breakout strategy based on Bollinger Bands.'),
    defaultParameters: { window: 20, deviation: 2, initial_capital: 1000000 },
  },
  {
    key: 'alpha-multi-factor',
    backendName: 'MultiFactorAlphaStrategy',
    category: 'alpha',
    nameKey: 'templates.alpha.name',
    descriptionKey: 'templates.alpha.description',
    code: buildSkeletonCode('MultiFactorAlphaStrategy', 'Multi-Factor Alpha', 'Multi-factor stock selection strategy with configurable factor weights.'),
    defaultParameters: { rebalance_days: 5, top_n: 20, initial_capital: 1000000 },
  },
  {
    key: 'pair-trading',
    backendName: 'PairTradingStrategy',
    category: 'statArb',
    nameKey: 'templates.pair.name',
    descriptionKey: 'templates.pair.description',
    code: buildSkeletonCode('PairTradingStrategy', 'Pair Trading', 'Statistical arbitrage strategy for co-integrated pairs.'),
    defaultParameters: { lookback: 60, entry_zscore: 2, exit_zscore: 0.5, initial_capital: 1000000 },
  },
  {
    key: 'grid-trading',
    backendName: 'GridTradingStrategy',
    category: 'grid',
    nameKey: 'templates.grid.name',
    descriptionKey: 'templates.grid.description',
    code: buildSkeletonCode('GridTradingStrategy', 'Grid Trading', 'Range-bound grid trading strategy for oscillating markets.'),
    defaultParameters: { grid_levels: 10, grid_spacing: 0.02, order_size: 100, initial_capital: 1000000 },
  },
]

const DEFAULT_CREATE_FORM: CreateFormState = {
  name: '',
  description: '',
  category: 'cta',
  templateKey: 'blank',
}

function sanitizeIdentifier(value: string) {
  const cleaned = value.trim().replace(/[^\w]/g, '_')
  if (!cleaned) return 'MyStrategy'
  return /^\d/.test(cleaned) ? `Strategy_${cleaned}` : cleaned
}

function normalizeCode(code: string) {
  const normalized = code
    .split('\n')
    .map((line) => line.replace(/\s+$/g, ''))
    .join('\n')
    .trimEnd()
  return normalized ? `${normalized}\n` : ''
}

function safeParseObject(text: string): Record<string, unknown> | null {
  try {
    const parsed = text.trim() ? JSON.parse(text) : {}
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return null
    }
    return parsed as Record<string, unknown>
  } catch {
    return null
  }
}

function formatParameters(value: unknown): string {
  if (value == null) return JSON.stringify(DEFAULT_PARAMETERS, null, 2)
  if (typeof value === 'object') return JSON.stringify(value, null, 2)
  const text = String(value).trim()
  if (!text) return JSON.stringify(DEFAULT_PARAMETERS, null, 2)

  try {
    const parsed = JSON.parse(text)
    if (typeof parsed === 'string') {
      try {
        return JSON.stringify(JSON.parse(parsed), null, 2)
      } catch {
        return parsed
      }
    }
    return JSON.stringify(parsed, null, 2)
  } catch {
    return text
  }
}

function unwrapArray<T>(value: unknown): T[] {
  if (Array.isArray(value)) return value as T[]
  if (value && typeof value === 'object' && Array.isArray((value as { data?: unknown[] }).data)) {
    return (value as { data: T[] }).data
  }
  return []
}

function inferCategory(strategy: Pick<StrategyListItem, 'name' | 'class_name' | 'description'>): StrategyCategoryKey {
  const text = `${strategy.name} ${strategy.class_name || ''} ${strategy.description || ''}`.toLowerCase()
  if (text.includes('alpha') || text.includes('factor')) return 'alpha'
  if (text.includes('pair') || text.includes('arb')) return 'statArb'
  if (text.includes('grid')) return 'grid'
  if (text.includes('ai') || text.includes('ml')) return 'ai'
  if (text.includes('custom')) return 'custom'
  return 'cta'
}

function draftFromStrategy(strategy: Strategy): DraftStrategy {
  return {
    id: strategy.id,
    name: strategy.name,
    class_name: strategy.class_name || sanitizeIdentifier(strategy.name),
    description: strategy.description || '',
    code:
      strategy.code ||
      buildSkeletonCode(
        strategy.class_name || 'MyStrategy',
        strategy.name,
        strategy.description || 'Custom strategy.'
      ),
    parametersText: formatParameters(strategy.parameters),
  }
}

function formatDateTime(value: string | undefined | null, language: string) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat(language.startsWith('zh') ? 'zh-CN' : 'en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

function getToastIcon(type: ToastState['type']) {
  if (type === 'success') return <CheckCircle2 size={16} />
  if (type === 'error') return <AlertCircle size={16} />
  return <Info size={16} />
}

function getCategoryVariant(category: StrategyCategoryKey): BadgeVariant {
  if (category === 'alpha' || category === 'statArb') return 'warning'
  if (category === 'grid' || category === 'custom') return 'muted'
  if (category === 'ai') return 'success'
  return 'primary'
}

export default function Strategies() {
  const { t, i18n } = useTranslation('strategies')
  const navigate = useNavigate()
  const currentLanguage = i18n.resolvedLanguage ?? i18n.language

  const [mainTab, setMainTab] = useState<MainTabKey>('workspace')
  const [detailTab, setDetailTab] = useState<DetailTabKey>('code')
  const [strategies, setStrategies] = useState<StrategyListItem[]>([])
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [draft, setDraft] = useState<DraftStrategy | null>(null)
  const [history, setHistory] = useState<HistoryEntry[]>([])
  const [templates, setTemplates] = useState<TemplateCard[]>([])
  const [availableBuiltinNames, setAvailableBuiltinNames] = useState<Set<string>>(new Set())
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [loadingList, setLoadingList] = useState(false)
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [saving, setSaving] = useState(false)
  const [validation, setValidation] = useState<{ ok: boolean | null; message: string }>({
    ok: null,
    message: t('page.detail.code.validationPending'),
  })
  const [toast, setToast] = useState<ToastState | null>(null)
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [importModalOpen, setImportModalOpen] = useState(false)
  const [selectedTemplateKey, setSelectedTemplateKey] = useState<string | null>(null)
  const [historyPreview, setHistoryPreview] = useState<HistoryPreviewState>(null)
  const [confirmState, setConfirmState] = useState<ConfirmState>(null)
  const [createForm, setCreateForm] = useState<CreateFormState>(DEFAULT_CREATE_FORM)

  const importInputRef = useRef<HTMLInputElement | null>(null)
  const templateCatalogMap = useMemo(
    () => new Map(TEMPLATE_CATALOG.map((item) => [item.backendName.toLowerCase(), item])),
    []
  )

  useEffect(() => {
    if (!toast) return
    const timer = window.setTimeout(() => setToast(null), 3500)
    return () => window.clearTimeout(timer)
  }, [toast])

  useEffect(() => {
    setValidation((current) => {
      if (current.ok === null) return current
      return { ok: null, message: t('page.detail.code.validationPending') }
    })
  }, [draft?.code, draft?.parametersText, draft?.name, draft?.class_name, draft?.description, t])

  const showToast = (message: string, type: ToastState['type'] = 'info') => {
    setToast({ message, type })
  }

  const translateCategory = (category: StrategyCategoryKey) => t(`page.types.${category}`)

  const mainTabs = useMemo(
    () => [
      { key: 'workspace', label: t('page.tabs.workspace') },
      { key: 'templates', label: t('page.tabs.templates') },
    ],
    [t]
  )

  const detailTabs = useMemo(
    () => [
      { key: 'code', label: t('page.detail.tabs.code') },
      { key: 'parameters', label: t('page.detail.tabs.parameters') },
      { key: 'history', label: t('page.detail.tabs.history') },
    ],
    [t]
  )

  const filteredStrategies = useMemo(() => {
    const query = search.trim().toLowerCase()
    return strategies.filter((strategy) => {
      const category = inferCategory(strategy)
      const status = strategy.is_active ? 'active' : 'draft'
      const matchesQuery =
        !query ||
        strategy.name.toLowerCase().includes(query) ||
        (strategy.class_name || '').toLowerCase().includes(query) ||
        (strategy.description || '').toLowerCase().includes(query)
      const matchesType = typeFilter === 'all' || category === typeFilter
      const matchesStatus = statusFilter === 'all' || status === statusFilter
      return matchesQuery && matchesType && matchesStatus
    })
  }, [search, statusFilter, strategies, typeFilter])

  const selectedSummary = useMemo(
    () => strategies.find((item) => item.id === selectedId) || null,
    [selectedId, strategies]
  )

  const selectedTemplate = useMemo(
    () => templates.find((item) => item.key === selectedTemplateKey) || null,
    [selectedTemplateKey, templates]
  )

  const parsedParameters = useMemo(
    () => safeParseObject(draft?.parametersText || JSON.stringify(DEFAULT_PARAMETERS, null, 2)),
    [draft?.parametersText]
  )

  const parameterRows = useMemo(
    () => (parsedParameters ? Object.entries(parsedParameters) : []),
    [parsedParameters]
  )

  const updateDraft = (updater: (current: DraftStrategy) => DraftStrategy) => {
    setDraft((current) => (current ? updater(current) : current))
  }

  const loadHistory = async (strategyId: number) => {
    try {
      const response = await strategyCodeAPI.listCodeHistory(strategyId)
      setHistory(unwrapArray<HistoryEntry>(response.data))
    } catch {
      setHistory([])
    }
  }

  const selectStrategy = async (strategyId: number) => {
    setLoadingDetail(true)
    try {
      const response = await strategiesAPI.get(strategyId)
      const detail = response.data as Strategy
      setSelectedId(strategyId)
      setDraft(draftFromStrategy(detail))
      await loadHistory(strategyId)
      setValidation({ ok: null, message: t('page.detail.code.validationPending') })
    } catch (error: unknown) {
      const requestError = error as { response?: { data?: { detail?: string } } }
      showToast(requestError.response?.data?.detail || t('page.toasts.loadDetailFailed'), 'error')
    } finally {
      setLoadingDetail(false)
    }
  }

  const refreshStrategies = async (preferredId?: number, preserveDraft = false) => {
    setLoadingList(true)
    try {
      const response = await strategiesAPI.list()
      const items = unwrapArray<StrategyListItem>(response.data)
      setStrategies(items)

      if (preserveDraft && draft && !draft.id) return

      const targetId =
        preferredId ??
        (selectedId && items.some((item) => item.id === selectedId) ? selectedId : null) ??
        items[0]?.id ??
        null

      if (targetId) {
        await selectStrategy(targetId)
      } else {
        setSelectedId(null)
        setDraft(null)
        setHistory([])
      }
    } catch (error: unknown) {
      const requestError = error as { response?: { data?: { detail?: string } } }
      showToast(requestError.response?.data?.detail || t('page.toasts.loadListFailed'), 'error')
    } finally {
      setLoadingList(false)
    }
  }

  const refreshTemplates = async () => {
    try {
      const response = await strategiesAPI.listBuiltin()
      const builtinItems = unwrapArray<BuiltinStrategyApiItem>(response.data)
      const serverNameSet = new Set(
        builtinItems.map((item) => (item.class_name || item.name || '').toLowerCase()).filter(Boolean)
      )
      setAvailableBuiltinNames(serverNameSet)

      const mergedTemplates = TEMPLATE_CATALOG.map((item) => {
        const apiItem = builtinItems.find(
          (builtin) =>
            (builtin.class_name || builtin.name || '').toLowerCase() === item.backendName.toLowerCase() ||
            (builtin.name || '').toLowerCase() === item.backendName.toLowerCase()
        )
        return {
          ...item,
          availableOnServer: Boolean(apiItem),
          serverDescription: apiItem?.description || null,
        }
      })

      const extraTemplates = builtinItems
        .filter((item) => !templateCatalogMap.has((item.class_name || item.name || '').toLowerCase()))
        .map<TemplateCard>((item) => {
          const className = item.class_name || sanitizeIdentifier(item.name)
          return {
            key: item.name.toLowerCase(),
            backendName: className,
            category: inferCategory({
              name: item.name,
              class_name: className,
              description: item.description || '',
            }),
            nameKey: '',
            descriptionKey: '',
            code: buildSkeletonCode(className, item.name, item.description || 'Built-in strategy.'),
            defaultParameters: DEFAULT_PARAMETERS,
            availableOnServer: true,
            serverDescription: item.description || null,
          }
        })

      setTemplates([...mergedTemplates, ...extraTemplates])
    } catch {
      setAvailableBuiltinNames(new Set())
      setTemplates(
        TEMPLATE_CATALOG.map((item) => ({
          ...item,
          availableOnServer: false,
          serverDescription: null,
        }))
      )
    }
  }

  useEffect(() => {
    void refreshStrategies()
    void refreshTemplates()
  }, [])

  const validateCode = async (content: string) => {
    try {
      try {
        const response = await strategyCodeAPI.lintPyright({ content })
        const diagnostics = (response.data as { diagnostics?: Array<{ severity?: string }> }).diagnostics || []
        const hasError = diagnostics.some(
          (item) => String(item.severity || '').toLowerCase() === 'error'
        )
        if (hasError) {
          const message = t('page.toasts.validationFailed')
          setValidation({ ok: false, message })
          showToast(message, 'error')
          return false
        }
      } catch {
        await strategyCodeAPI.parse({ content })
      }

      const message = t('page.toasts.validationPassed')
      setValidation({ ok: true, message })
      showToast(message, 'success')
      return true
    } catch (error: unknown) {
      const requestError = error as { response?: { data?: { detail?: string } } }
      const message = requestError.response?.data?.detail || t('page.toasts.validationFailed')
      setValidation({ ok: false, message })
      showToast(message, 'error')
      return false
    }
  }

  const saveDraft = async () => {
    if (!draft) return

    const parameters = safeParseObject(draft.parametersText)
    if (!parameters) {
      showToast(t('page.toasts.parametersInvalid'), 'error')
      return
    }

    if (!draft.name.trim()) {
      showToast(t('nameRequired'), 'error')
      return
    }

    const ok = await validateCode(draft.code)
    if (!ok) return

    try {
      setSaving(true)
      const payload = {
        name: draft.name.trim(),
        class_name: draft.class_name.trim() || sanitizeIdentifier(draft.name),
        description: draft.description.trim(),
        code: normalizeCode(draft.code),
        parameters,
      }

      let strategyId = draft.id
      if (strategyId) {
        await strategiesAPI.update(strategyId, payload)
      } else {
        const response = await strategiesAPI.create(payload)
        strategyId = (response.data as Strategy).id
      }

      showToast(t('page.toasts.saved'), 'success')
      await refreshStrategies(strategyId)
    } catch (error: unknown) {
      const requestError = error as { response?: { data?: { detail?: string } } }
      showToast(requestError.response?.data?.detail || t('page.toasts.saveFailed'), 'error')
    } finally {
      setSaving(false)
    }
  }

  const createDraftFromTemplate = (
    template: TemplateCard | null,
    overrides?: Partial<CreateFormState>
  ) => {
    const name = overrides?.name?.trim() || t('page.modals.defaultName')
    const description =
      overrides?.description?.trim() ||
      (template ? t(template.descriptionKey) : t('page.modals.blankDescription'))
    const className = sanitizeIdentifier(name)
    const code = template
      ? template.code.replace(new RegExp(template.backendName, 'g'), className)
      : buildSkeletonCode(className, name, description)

    setSelectedId(null)
    setDraft({
      id: undefined,
      name,
      class_name: className,
      description,
      code,
      parametersText: JSON.stringify(template?.defaultParameters || DEFAULT_PARAMETERS, null, 2),
    })
    setMainTab('workspace')
    setDetailTab('code')
    setSelectedTemplateKey(template?.key || null)
    setCreateModalOpen(false)
    showToast(t('page.toasts.draftCreated'), 'success')
  }

  const handleCreateDraft = () => {
    const template =
      createForm.templateKey === 'blank'
        ? null
        : templates.find((item) => item.key === createForm.templateKey) || null
    createDraftFromTemplate(template, createForm)
  }

  const handleDuplicate = () => {
    if (!draft) return
    const nextName = `${draft.name}_copy`
    setSelectedId(null)
    setDraft({
      ...draft,
      id: undefined,
      name: nextName,
      class_name: sanitizeIdentifier(nextName),
    })
    setDetailTab('code')
    showToast(t('page.toasts.duplicated', { name: draft.name }), 'success')
  }

  const handleDelete = () => {
    if (!draft?.id) return
    setConfirmState({
      title: t('deleteStrategy'),
      message: t('deleteConfirm', { name: draft.name }),
      confirmLabel: t('page.actions.delete'),
      onConfirm: () => {
        void (async () => {
          try {
            await strategiesAPI.delete(draft.id as number)
            setConfirmState(null)
            showToast(t('deleted'), 'success')
            await refreshStrategies()
          } catch (error: unknown) {
            const requestError = error as { response?: { data?: { detail?: string } } }
            showToast(requestError.response?.data?.detail || t('deleteFailed'), 'error')
          }
        })()
      },
    })
  }

  const previewHistory = async (entry: HistoryEntry) => {
    if (!draft?.id) return
    try {
      const response = await strategyCodeAPI.getCodeHistory(draft.id, entry.id)
      const payload = response.data as { version?: number; code?: string; parameters?: unknown }
      const title = payload.version ? t('history.versionNumber', { id: payload.version }) : `#${entry.id}`
      setHistoryPreview({
        title,
        code: payload.code || entry.code || '',
        parameters: formatParameters(payload.parameters ?? entry.parameters),
      })
    } catch {
      showToast(t('history.loadFailed'), 'error')
    }
  }

  const restoreHistory = (entry: HistoryEntry) => {
    if (!draft?.id) return
    const label = entry.version ? `v${entry.version}` : `#${entry.id}`
    setConfirmState({
      title: t('page.actions.rollback'),
      message: t('history.restoreConfirm', { version: label, name: draft.name }),
      confirmLabel: t('page.actions.rollback'),
      onConfirm: () => {
        void (async () => {
          try {
            await strategyCodeAPI.restoreCodeHistory(draft.id as number, entry.id)
            setConfirmState(null)
            showToast(t('history.restored'), 'success')
            await refreshStrategies(draft.id)
          } catch {
            showToast(t('history.restoreFailed'), 'error')
          }
        })()
      },
    })
  }

  const importStrategyFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    try {
      const content = await file.text()
      const response = await strategyCodeAPI.parse({ content })
      const parsed = response.data as {
        classes?: Array<{ name?: string; defaults?: Record<string, unknown> }>
      }
      const firstClass = parsed.classes?.[0]
      const name = file.name.replace(/\.py$/i, '')

      setSelectedId(null)
      setDraft({
        id: undefined,
        name,
        class_name: firstClass?.name || sanitizeIdentifier(name),
        description: '',
        code: content,
        parametersText: JSON.stringify(firstClass?.defaults || DEFAULT_PARAMETERS, null, 2),
      })
      setMainTab('workspace')
      setDetailTab('code')
      setImportModalOpen(false)
      showToast(t('page.toasts.imported'), 'success')
    } catch (error: unknown) {
      const requestError = error as { response?: { data?: { detail?: string } } }
      showToast(requestError.response?.data?.detail || t('page.toasts.importFailed'), 'error')
    } finally {
      if (importInputRef.current) {
        importInputRef.current.value = ''
      }
    }
  }

  const listCountLabel = t('page.list.count', { count: filteredStrategies.length })
  const shellCardClass = 'rounded-2xl border border-border bg-card shadow-sm'
  const inputClass = 'w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring'
  const buttonSecondaryClass = 'inline-flex items-center justify-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-sm font-medium transition-colors hover:bg-muted'
  const buttonPrimaryClass = 'inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60'
  const buttonGhostClass = 'inline-flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground'

  return (
    <div className="space-y-6" data-testid="strategies-page">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold text-foreground">{t('page.title')}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t('page.subtitle')}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" className={buttonSecondaryClass} onClick={() => setImportModalOpen(true)}>
            <Upload size={16} />
            {t('page.actions.import')}
          </button>
          <button type="button" className={buttonPrimaryClass} onClick={() => setCreateModalOpen(true)} data-testid="create-strategy-button">
            <Plus size={16} />
            {t('page.actions.new')}
          </button>
        </div>
      </div>

      <TabPanel tabs={mainTabs} activeTab={mainTab} onChange={(key) => setMainTab(key as MainTabKey)}>
        {mainTab === 'workspace' && (
          <div className="space-y-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-center">
              <div className="relative md:flex-1">
                <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input className={`${inputClass} pl-9`} value={search} onChange={(event) => setSearch(event.target.value)} placeholder={t('page.searchPlaceholder')} aria-label={t('page.searchPlaceholder')} />
              </div>
              <select className={`${inputClass} md:w-48`} value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)}>
                <option value="all">{t('page.filters.allType')}</option>
                <option value="cta">{t('page.types.cta')}</option>
                <option value="alpha">{t('page.types.alpha')}</option>
                <option value="statArb">{t('page.types.statArb')}</option>
                <option value="grid">{t('page.types.grid')}</option>
                <option value="ai">{t('page.types.ai')}</option>
                <option value="custom">{t('page.types.custom')}</option>
              </select>
              <select className={`${inputClass} md:w-44`} value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
                <option value="all">{t('page.filters.allStatus')}</option>
                <option value="active">{t('page.status.active')}</option>
                <option value="draft">{t('page.status.draft')}</option>
              </select>
            </div>

            <div className="grid gap-4 xl:grid-cols-[360px_minmax(0,1fr)]">
              <section className={`${shellCardClass} p-5`}>
                <div className="mb-4 flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-semibold text-card-foreground">{t('page.list.title')}</h2>
                    <p className="mt-1 text-sm text-muted-foreground">{t('page.list.subtitle')}</p>
                  </div>
                  <Badge variant="muted">{listCountLabel}</Badge>
                </div>

                <div className="space-y-3" data-testid="strategies-list">
                  {loadingList ? (
                    <div className="rounded-xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">{t('page.table.loading')}</div>
                  ) : filteredStrategies.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-border px-4 py-8 text-center">
                      <div className="text-sm font-medium text-foreground">{t('page.list.emptyTitle')}</div>
                      <div className="mt-1 text-sm text-muted-foreground">{t('page.list.emptyDescription')}</div>
                    </div>
                  ) : (
                    filteredStrategies.map((strategy) => {
                      const category = inferCategory(strategy)
                      const isSelected = strategy.id === selectedId
                      return (
                        <button key={strategy.id} type="button" data-testid={`strategy-card-${strategy.id}`} onClick={() => void selectStrategy(strategy.id)} className={`w-full rounded-xl border px-4 py-4 text-left transition-colors ${isSelected ? 'border-primary bg-primary/5 shadow-sm' : 'border-border bg-background hover:border-primary/40 hover:bg-muted/40'}`}>
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <div className="font-semibold text-foreground">{strategy.name}</div>
                              <div className="mt-1 text-sm text-muted-foreground">{strategy.description || t('page.list.noDescription')}</div>
                            </div>
                            <Badge variant={strategy.is_active ? 'success' : 'muted'}>{strategy.is_active ? t('page.status.active') : t('page.status.draft')}</Badge>
                          </div>
                          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                            <Badge variant={getCategoryVariant(category)}>{translateCategory(category)}</Badge>
                            <span>{t('page.list.version', { version: strategy.version || 1 })}</span>
                            <span>{formatDateTime(strategy.updated_at, currentLanguage)}</span>
                          </div>
                        </button>
                      )
                    })
                  )}
                </div>
              </section>

              <section className={`${shellCardClass} p-5`} data-testid="strategy-detail">
                {!draft ? (
                  <div className="flex min-h-[520px] flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-muted/20 px-6 text-center">
                    <FileCode2 size={28} className="text-muted-foreground" />
                    <div className="mt-4 text-lg font-semibold text-foreground">{t('page.detail.emptyTitle')}</div>
                    <p className="mt-2 max-w-lg text-sm text-muted-foreground">{t('page.detail.emptyDescription')}</p>
                  </div>
                ) : (
                  <div className="space-y-5">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h2 className="text-xl font-semibold text-card-foreground">{draft.name}</h2>
                          <Badge variant={getCategoryVariant(inferCategory(draft))}>{translateCategory(inferCategory(draft))}</Badge>
                          <Badge variant={selectedSummary?.is_active ? 'success' : 'muted'}>{selectedSummary?.is_active ? t('page.status.active') : t('page.status.draft')}</Badge>
                        </div>
                        <p className="mt-2 text-sm text-muted-foreground">{draft.description || t('page.list.noDescription')}</p>
                        <div className="mt-3 flex flex-wrap gap-4 text-xs text-muted-foreground">
                          <span>{t('page.detail.metaClass', { className: draft.class_name })}</span>
                          <span>{t('page.detail.metaVersion', { version: selectedSummary?.version || 1 })}</span>
                          <span>{t('page.detail.metaSource', { source: availableBuiltinNames.has((selectedSummary?.class_name || draft.class_name).toLowerCase()) ? t('page.table.builtin') : t('page.table.custom') })}</span>
                          <span>{t('page.detail.metaUpdated', { value: formatDateTime(selectedSummary?.updated_at, currentLanguage) })}</span>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <button type="button" className={buttonGhostClass} onClick={handleDuplicate}>
                          <Copy size={14} />
                          {t('page.actions.duplicate')}
                        </button>
                        <button type="button" className={buttonGhostClass} onClick={() => navigate('/backtest')}>
                          {t('page.actions.backtest')}
                        </button>
                        {draft.id && (
                          <button type="button" className={buttonGhostClass} onClick={handleDelete}>
                            <Trash2 size={14} />
                            {t('page.actions.delete')}
                          </button>
                        )}
                      </div>
                    </div>

                    <TabPanel tabs={detailTabs} activeTab={detailTab} onChange={(key) => setDetailTab(key as DetailTabKey)}>
                      {detailTab === 'code' && (
                        <div className="space-y-4" data-testid="strategy-code-panel">
                          <div className="grid gap-4 md:grid-cols-2">
                            <div>
                              <label className="mb-1 block text-sm font-medium">{t('form.name')}</label>
                              <input className={inputClass} value={draft.name} onChange={(event) => updateDraft((current) => ({ ...current, name: event.target.value }))} data-testid="strategy-name-input" />
                            </div>
                            <div>
                              <label className="mb-1 block text-sm font-medium">{t('form.className')}</label>
                              <input className={inputClass} value={draft.class_name} onChange={(event) => updateDraft((current) => ({ ...current, class_name: sanitizeIdentifier(event.target.value) }))} data-testid="strategy-class-input" />
                            </div>
                          </div>

                          <div>
                            <label className="mb-1 block text-sm font-medium">{t('form.description')}</label>
                            <textarea className={`${inputClass} min-h-[88px] resize-y`} value={draft.description} onChange={(event) => updateDraft((current) => ({ ...current, description: event.target.value }))} data-testid="strategy-description-input" />
                          </div>

                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <div>
                              {validation.ok === true ? <Badge variant="success">{validation.message}</Badge> : validation.ok === false ? <Badge variant="destructive">{validation.message}</Badge> : <Badge variant="muted">{validation.message}</Badge>}
                            </div>
                            <div className="flex flex-wrap gap-2">
                              <button type="button" className={buttonGhostClass} onClick={() => updateDraft((current) => ({ ...current, code: normalizeCode(current.code) }))}>{t('page.actions.format')}</button>
                              <button type="button" className={buttonGhostClass} onClick={() => void validateCode(draft.code)}>{t('page.actions.validate')}</button>
                              <button type="button" className={buttonPrimaryClass} onClick={() => void saveDraft()} disabled={saving} data-testid="save-strategy-button">
                                <Save size={14} />
                                {saving ? t('form.saving') : t('page.actions.save')}
                              </button>
                            </div>
                          </div>

                          <div>
                            <label className="mb-1 block text-sm font-medium">{t('form.code')}</label>
                            <textarea className={`${inputClass} min-h-[360px] resize-y font-mono text-xs leading-6`} value={draft.code} onChange={(event) => updateDraft((current) => ({ ...current, code: event.target.value }))} data-testid="strategy-code-editor" />
                          </div>

                          <div className="text-xs text-muted-foreground">{loadingDetail ? t('page.detail.loading') : t('page.detail.code.lastModified', { value: formatDateTime(selectedSummary?.updated_at, currentLanguage) })}</div>
                        </div>
                      )}

                      {detailTab === 'parameters' && (
                        <div className="space-y-4" data-testid="strategy-parameters-panel">
                          <div>
                            <h3 className="text-base font-semibold text-card-foreground">{t('page.detail.parameters.title')}</h3>
                            <p className="mt-1 text-sm text-muted-foreground">{t('page.detail.parameters.subtitle')}</p>
                          </div>

                          {!parsedParameters ? (
                            <div className="rounded-xl border border-dashed border-destructive/40 bg-destructive/5 px-4 py-4 text-sm text-destructive">{t('page.toasts.parametersInvalid')}</div>
                          ) : parameterRows.length === 0 ? (
                            <div className="rounded-xl border border-dashed border-border px-4 py-6 text-sm text-muted-foreground">{t('page.detail.parameters.empty')}</div>
                          ) : (
                            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                              {parameterRows.map(([key, value]) => (
                                <div key={key} className="rounded-xl border border-border bg-background p-4">
                                  <div className="text-xs uppercase tracking-wide text-muted-foreground">{key}</div>
                                  {typeof value === 'number' ? (
                                    <input type="number" className={`${inputClass} mt-3`} value={value} onChange={(event) => {
                                      const next = safeParseObject(draft.parametersText) || {}
                                      next[key] = Number(event.target.value)
                                      updateDraft((current) => ({ ...current, parametersText: JSON.stringify(next, null, 2) }))
                                    }} />
                                  ) : (
                                    <div className="mt-3 rounded-lg bg-muted/40 px-3 py-2 text-sm text-foreground">{String(value)}</div>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}

                          <div>
                            <label className="mb-1 block text-sm font-medium">{t('page.detail.parameters.jsonLabel')}</label>
                            <textarea className={`${inputClass} min-h-[240px] resize-y font-mono text-xs leading-6`} value={draft.parametersText} onChange={(event) => updateDraft((current) => ({ ...current, parametersText: event.target.value }))} data-testid="strategy-parameters-json" />
                          </div>
                        </div>
                      )}

                      {detailTab === 'history' && (
                        <div className="space-y-4" data-testid="strategy-history-panel">
                          <div>
                            <h3 className="text-base font-semibold text-card-foreground">{t('page.history.title')}</h3>
                            <p className="mt-1 text-sm text-muted-foreground">{t('page.history.subtitle')}</p>
                          </div>

                          {history.length === 0 ? (
                            <div className="rounded-xl border border-dashed border-border px-4 py-6 text-sm text-muted-foreground">{t('page.history.empty')}</div>
                          ) : (
                            <div className="overflow-x-auto rounded-xl border border-border">
                              <table className="min-w-full text-sm">
                                <thead className="bg-muted/40 text-left text-muted-foreground">
                                  <tr>
                                    <th className="px-4 py-3">{t('page.history.columns.version')}</th>
                                    <th className="px-4 py-3">{t('page.history.columns.time')}</th>
                                    <th className="px-4 py-3">{t('page.history.columns.author')}</th>
                                    <th className="px-4 py-3">{t('page.history.columns.note')}</th>
                                    <th className="px-4 py-3">{t('page.history.columns.actions')}</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {history.map((entry, index) => (
                                    <tr key={entry.id} className="border-t border-border/70">
                                      <td className="px-4 py-3">v{entry.version || index + 1}</td>
                                      <td className="px-4 py-3 text-muted-foreground">{formatDateTime(entry.created_at, currentLanguage)}</td>
                                      <td className="px-4 py-3 text-muted-foreground">{t('page.history.defaultAuthor')}</td>
                                      <td className="px-4 py-3 text-muted-foreground">{index === 0 ? t('page.history.notes.latest') : index === 1 ? t('page.history.notes.mid') : t('page.history.notes.initial')}</td>
                                      <td className="px-4 py-3">
                                        <div className="flex flex-wrap gap-2">
                                          <button type="button" className={buttonGhostClass} onClick={() => void previewHistory(entry)}>
                                            <Eye size={14} />
                                            {t('page.actions.view')}
                                          </button>
                                          <button type="button" className={buttonGhostClass} onClick={() => restoreHistory(entry)}>
                                            <RotateCcw size={14} />
                                            {t('page.actions.rollback')}
                                          </button>
                                        </div>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </div>
                      )}
                    </TabPanel>
                  </div>
                )}
              </section>
            </div>
          </div>
        )}

        {mainTab === 'templates' && (
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
            <section className={`${shellCardClass} p-5`}>
              <div className="mb-4">
                <h2 className="text-lg font-semibold text-card-foreground">{t('page.templates.title')}</h2>
                <p className="mt-1 text-sm text-muted-foreground">{t('page.templates.subtitle')}</p>
              </div>

              <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3" data-testid="strategy-templates-grid">
                {templates.map((template) => (
                  <article key={template.key} className="rounded-2xl border border-border bg-background p-4" data-testid={`template-card-${template.key}`}>
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="text-base font-semibold text-foreground">{template.nameKey ? t(template.nameKey) : template.backendName}</div>
                        <div className="mt-1 text-sm text-muted-foreground">{template.serverDescription || (template.descriptionKey ? t(template.descriptionKey) : t('page.templates.fallbackDescription'))}</div>
                      </div>
                      <Badge variant={getCategoryVariant(template.category)}>{translateCategory(template.category)}</Badge>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <Badge variant={template.availableOnServer ? 'success' : 'muted'}>{template.availableOnServer ? t('page.templates.availableOnServer') : t('page.templates.localStarter')}</Badge>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <button type="button" className={buttonGhostClass} onClick={() => setSelectedTemplateKey(template.key)}>
                        <Eye size={14} />
                        {t('page.actions.preview')}
                      </button>
                      <button type="button" className={buttonPrimaryClass} onClick={() => createDraftFromTemplate(template)}>
                        {t('page.actions.useTemplate')}
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            </section>

            <aside className={`${shellCardClass} p-5`} data-testid="template-preview-panel">
              {selectedTemplate ? (
                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-semibold text-card-foreground">{selectedTemplate.nameKey ? t(selectedTemplate.nameKey) : selectedTemplate.backendName}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">{selectedTemplate.serverDescription || (selectedTemplate.descriptionKey ? t(selectedTemplate.descriptionKey) : t('page.templates.fallbackDescription'))}</p>
                  </div>
                  <pre className="max-h-[440px] overflow-auto rounded-xl border border-border bg-muted/20 p-4 text-xs leading-6 text-foreground">{selectedTemplate.code}</pre>
                  <button type="button" className={`${buttonPrimaryClass} w-full`} onClick={() => createDraftFromTemplate(selectedTemplate)}>{t('page.actions.useTemplate')}</button>
                </div>
              ) : (
                <div className="flex min-h-[320px] flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-muted/20 px-6 text-center">
                  <Eye size={24} className="text-muted-foreground" />
                  <div className="mt-4 text-base font-semibold text-foreground">{t('page.templates.previewTitle')}</div>
                  <p className="mt-2 text-sm text-muted-foreground">{t('page.templates.previewDescription')}</p>
                </div>
              )}
            </aside>
          </div>
        )}
      </TabPanel>

      {createModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 px-4">
          <div className="w-full max-w-xl rounded-2xl border border-border bg-card p-6 shadow-xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-lg font-semibold text-card-foreground">{t('page.modals.createTitle')}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{t('page.modals.createSubtitle')}</p>
              </div>
              <button type="button" className={buttonGhostClass} onClick={() => setCreateModalOpen(false)}>
                <X size={16} />
              </button>
            </div>

            <div className="mt-5 space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium">{t('page.modals.name')}</label>
                <input className={inputClass} value={createForm.name} onChange={(event) => setCreateForm((current) => ({ ...current, name: event.target.value }))} placeholder={t('page.modals.namePlaceholder')} />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">{t('page.modals.description')}</label>
                <textarea className={`${inputClass} min-h-[88px] resize-y`} value={createForm.description} onChange={(event) => setCreateForm((current) => ({ ...current, description: event.target.value }))} placeholder={t('page.modals.descriptionPlaceholder')} />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium">{t('page.modals.type')}</label>
                  <select className={inputClass} value={createForm.category} onChange={(event) => setCreateForm((current) => ({ ...current, category: event.target.value as StrategyCategoryKey }))}>
                    <option value="cta">{t('page.types.cta')}</option>
                    <option value="alpha">{t('page.types.alpha')}</option>
                    <option value="statArb">{t('page.types.statArb')}</option>
                    <option value="grid">{t('page.types.grid')}</option>
                    <option value="ai">{t('page.types.ai')}</option>
                    <option value="custom">{t('page.types.custom')}</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">{t('page.modals.template')}</label>
                  <select className={inputClass} value={createForm.templateKey} onChange={(event) => setCreateForm((current) => ({ ...current, templateKey: event.target.value }))}>
                    <option value="blank">{t('page.modals.blankTemplate')}</option>
                    {templates.map((template) => (
                      <option key={template.key} value={template.key}>{template.nameKey ? t(template.nameKey) : template.backendName}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button type="button" className={buttonSecondaryClass} onClick={() => setCreateModalOpen(false)}>{t('page.actions.cancel')}</button>
              <button type="button" className={buttonPrimaryClass} onClick={handleCreateDraft} data-testid="create-strategy-confirm">{t('page.actions.create')}</button>
            </div>
          </div>
        </div>
      )}

      {importModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 px-4">
          <div className="w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-lg font-semibold text-card-foreground">{t('page.modals.importTitle')}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{t('page.modals.importSubtitle')}</p>
              </div>
              <button type="button" className={buttonGhostClass} onClick={() => setImportModalOpen(false)}>
                <X size={16} />
              </button>
            </div>

            <button type="button" className="mt-5 flex w-full flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border bg-muted/15 px-6 py-10 text-center transition-colors hover:border-primary/40 hover:bg-muted/30" onClick={() => importInputRef.current?.click()}>
              <Upload size={24} className="text-muted-foreground" />
              <div className="mt-3 text-base font-semibold text-foreground">{t('page.modals.importHint')}</div>
              <div className="mt-1 text-sm text-muted-foreground">{t('page.modals.importSupport')}</div>
            </button>

            <input ref={importInputRef} type="file" accept=".py" className="hidden" onChange={(event) => void importStrategyFile(event)} />

            <div className="mt-6 flex justify-end gap-2">
              <button type="button" className={buttonSecondaryClass} onClick={() => setImportModalOpen(false)}>{t('page.actions.cancel')}</button>
              <button type="button" className={buttonPrimaryClass} onClick={() => importInputRef.current?.click()}>{t('page.actions.selectFile')}</button>
            </div>
          </div>
        </div>
      )}

      {historyPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 px-4">
          <div className="max-h-[88vh] w-full max-w-4xl overflow-auto rounded-2xl border border-border bg-card p-6 shadow-xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-lg font-semibold text-card-foreground">{historyPreview.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{t('page.history.previewSubtitle')}</p>
              </div>
              <button type="button" className={buttonGhostClass} onClick={() => setHistoryPreview(null)}>
                <X size={16} />
              </button>
            </div>

            <div className="mt-5 grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
              <pre className="overflow-auto rounded-xl border border-border bg-muted/20 p-4 text-xs leading-6 text-foreground">{historyPreview.code}</pre>
              <div>
                <div className="mb-2 text-sm font-medium text-foreground">{t('page.detail.parameters.jsonLabel')}</div>
                <pre className="overflow-auto rounded-xl border border-border bg-muted/20 p-4 text-xs leading-6 text-foreground">{historyPreview.parameters}</pre>
              </div>
            </div>
          </div>
        </div>
      )}

      {confirmState && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 px-4">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-card-foreground">{confirmState.title}</h3>
            <p className="mt-2 text-sm text-muted-foreground">{confirmState.message}</p>
            <div className="mt-6 flex justify-end gap-2">
              <button type="button" className={buttonSecondaryClass} onClick={() => setConfirmState(null)}>{t('page.actions.cancel')}</button>
              <button type="button" className={buttonPrimaryClass} onClick={confirmState.onConfirm}>{confirmState.confirmLabel}</button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-5 right-5 z-[60] flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-3 shadow-lg">
          <span className={toast.type === 'error' ? 'text-destructive' : toast.type === 'success' ? 'text-emerald-600' : 'text-primary'}>{getToastIcon(toast.type)}</span>
          <span className="text-sm text-foreground">{toast.message}</span>
          <button type="button" className="text-muted-foreground" onClick={() => setToast(null)}>
            <X size={14} />
          </button>
        </div>
      )}
    </div>
  )
}
