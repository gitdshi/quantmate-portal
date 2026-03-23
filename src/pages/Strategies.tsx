import Editor from '@monaco-editor/react'
import {
  AlertCircle,
  CheckCircle2,
  Copy,
  Eye,
  FileCode2,
  Globe,
  Info,
  Maximize2,
  MessageSquare,
  Minimize2,
  PencilLine,
  Plus,
  RotateCcw,
  Save,
  Search,
  Star,
  Trash2,
  Upload,
  X,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { useBeforeUnload, useNavigate } from 'react-router-dom'

import Badge, { type BadgeVariant } from '../components/ui/Badge'
import TabPanel from '../components/ui/TabPanel'
import { strategiesAPI, strategyCodeAPI, templateAPI } from '../lib/api'
import type { Strategy } from '../types'

type MainTabKey = 'workspace' | 'templates'
type DetailTabKey = 'code' | 'profile' | 'parameters' | 'history'
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

type TemplateScope = 'marketplace' | 'mine'

type TemplateApiItem = {
  id: number
  author_id?: number
  name: string
  category?: string | null
  description?: string | null
  code?: string | null
  params_schema?: unknown
  default_params?: unknown
  version?: string | null
  visibility?: string | null
  downloads?: number | null
  created_at?: string | null
  updated_at?: string | null
}

type TemplateCard = {
  id: number
  key: string
  source: TemplateScope
  name: string
  category: StrategyCategoryKey
  description: string
  code: string | null
  defaultParameters: Record<string, unknown>
  visibility: string
  downloads: number
  updatedAt?: string | null
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
  onCancel?: () => void
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

type TemplateComment = {
  id: number
  user_id?: number | null
  content: string
  created_at?: string | null
}

type TemplateReview = {
  id: number
  user_id?: number | null
  rating: number
  review?: string | null
  created_at?: string | null
}

type TemplateRatingsPayload = {
  summary?: {
    avg_rating?: number
    count?: number
  }
  reviews?: TemplateReview[]
}

type TemplateEditorState = {
  mode: 'create' | 'edit'
  templateId?: number
  name: string
  description: string
  category: StrategyCategoryKey
  visibility: 'private' | 'team' | 'public'
  code: string
  defaultParamsText: string
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

const DEFAULT_CREATE_FORM: CreateFormState = {
  name: '',
  description: '',
  category: 'cta',
  templateKey: 'blank',
}

const UNSAVED_DRAFT_ID = -1

function templateKey(scope: TemplateScope, id: number) {
  return `${scope}-${id}`
}

function toBackendTemplateCategory(category: StrategyCategoryKey): string {
  if (category === 'alpha') return 'multi_factor'
  if (category === 'statArb') return 'arbitrage'
  if (category === 'ai') return 'ml'
  if (category === 'grid') return 'grid'
  if (category === 'custom') return 'custom'
  return 'trend'
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

function safeParseTemplateObject(value: unknown): Record<string, unknown> {
  if (!value) return { ...DEFAULT_PARAMETERS }
  if (typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>
  }
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value)
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>
      }
    } catch {
      return { ...DEFAULT_PARAMETERS }
    }
  }
  return { ...DEFAULT_PARAMETERS }
}

function mapTemplateCategory(category: string | null | undefined): StrategyCategoryKey {
  const normalized = String(category || '').trim().toLowerCase()
  if (!normalized) return 'cta'
  if (['alpha', 'multi_factor', 'factor', 'multifactor'].includes(normalized)) return 'alpha'
  if (['statarb', 'stat_arb', 'arbitrage', 'pair', 'mean_revert', 'meanreversion'].includes(normalized)) return 'statArb'
  if (['grid'].includes(normalized)) return 'grid'
  if (['ai', 'ml', 'machine_learning'].includes(normalized)) return 'ai'
  if (['custom'].includes(normalized)) return 'custom'
  return 'cta'
}

function mapTemplateCard(item: TemplateApiItem, source: TemplateScope): TemplateCard {
  return {
    id: item.id,
    key: templateKey(source, item.id),
    source,
    name: item.name,
    category: mapTemplateCategory(item.category),
    description: item.description || '',
    code: item.code || null,
    defaultParameters: safeParseTemplateObject(item.default_params),
    visibility: item.visibility || (source === 'marketplace' ? 'public' : 'private'),
    downloads: Number(item.downloads || 0),
    updatedAt: item.updated_at,
  }
}

function replacePrimaryClassName(code: string, className: string) {
  return code.replace(/class\s+([A-Za-z_]\w*)\s*([(:])/m, `class ${className}$2`)
}

function normalizeParametersForCompare(text: string) {
  const parsed = safeParseObject(text)
  return parsed ? JSON.stringify(parsed) : text.trim()
}

function hasDraftChanges(current: DraftStrategy, baseline: DraftStrategy) {
  return (
    current.name.trim() !== baseline.name.trim() ||
    current.class_name.trim() !== baseline.class_name.trim() ||
    current.description.trim() !== baseline.description.trim() ||
    normalizeCode(current.code) !== normalizeCode(baseline.code) ||
    normalizeParametersForCompare(current.parametersText) !== normalizeParametersForCompare(baseline.parametersText)
  )
}

function hasCodeChanges(current: DraftStrategy, baseline: DraftStrategy) {
  return normalizeCode(current.code) !== normalizeCode(baseline.code)
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
  const [draftBaseline, setDraftBaseline] = useState<DraftStrategy | null>(null)
  const [history, setHistory] = useState<HistoryEntry[]>([])
  const [templateScope, setTemplateScope] = useState<TemplateScope>('marketplace')
  const [templateCatalog, setTemplateCatalog] = useState<Record<TemplateScope, TemplateCard[]>>({
    marketplace: [],
    mine: [],
  })
  const [loadingTemplates, setLoadingTemplates] = useState(false)
  const [selectedTemplateLoading, setSelectedTemplateLoading] = useState(false)
  const [templateEditor, setTemplateEditor] = useState<TemplateEditorState | null>(null)
  const [templateActionLoading, setTemplateActionLoading] = useState(false)
  const [templateComments, setTemplateComments] = useState<TemplateComment[]>([])
  const [templateRatings, setTemplateRatings] = useState<{ avgRating: number; count: number }>({
    avgRating: 0,
    count: 0,
  })
  const [templateReviews, setTemplateReviews] = useState<TemplateReview[]>([])
  const [loadingTemplateFeedback, setLoadingTemplateFeedback] = useState(false)
  const [commentDraft, setCommentDraft] = useState('')
  const [ratingValue, setRatingValue] = useState<number | null>(null)
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
  const [codeFullscreen, setCodeFullscreen] = useState(false)

  const importInputRef = useRef<HTMLInputElement | null>(null)
  const templates = templateCatalog[templateScope]
  const allTemplates = useMemo(() => {
    const byId = new Map<number, TemplateCard>()
    for (const item of templateCatalog.marketplace) {
      byId.set(item.id, item)
    }
    for (const item of templateCatalog.mine) {
      byId.set(item.id, item)
    }
    return Array.from(byId.values())
  }, [templateCatalog.marketplace, templateCatalog.mine])

  const unsavedDraftItem = useMemo<StrategyListItem | null>(() => {
    if (!draft || draft.id) return null
    const now = new Date().toISOString()
    return {
      id: UNSAVED_DRAFT_ID,
      name: draft.name.trim() || t('page.list.unsavedDraftName'),
      class_name: draft.class_name || sanitizeIdentifier(draft.name || 'MyStrategy'),
      description: draft.description || '',
      version: 0,
      is_active: false,
      created_at: now,
      updated_at: now,
    }
  }, [draft, t])

  useEffect(() => {
    if (!toast) return
    const timer = window.setTimeout(() => setToast(null), 3500)
    return () => window.clearTimeout(timer)
  }, [toast])

  useEffect(() => {
    if (!codeFullscreen) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setCodeFullscreen(false)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [codeFullscreen])

  useEffect(() => {
    if (detailTab === 'code' || !codeFullscreen) return
    setCodeFullscreen(false)
  }, [detailTab, codeFullscreen])

  useEffect(() => {
    if (draft || !codeFullscreen) return
    setCodeFullscreen(false)
  }, [draft, codeFullscreen])

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
      { key: 'profile', label: t('page.detail.tabs.profile') },
      { key: 'parameters', label: t('page.detail.tabs.parameters') },
      { key: 'history', label: t('page.detail.tabs.history') },
    ],
    [t]
  )

  const strategyItems = useMemo(
    () => (unsavedDraftItem ? [unsavedDraftItem, ...strategies] : strategies),
    [strategies, unsavedDraftItem]
  )

  const filteredStrategies = useMemo(() => {
    const query = search.trim().toLowerCase()
    return strategyItems.filter((strategy) => {
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
  }, [search, statusFilter, strategyItems, typeFilter])

  const selectedSummary = useMemo(
    () => strategyItems.find((item) => item.id === selectedId) || null,
    [selectedId, strategyItems]
  )

  const selectedTemplate = useMemo(
    () => templates.find((item) => item.key === selectedTemplateKey) || null,
    [selectedTemplateKey, templates]
  )

  const selectedTemplateInMine = useMemo(
    () =>
      selectedTemplate
        ? templateCatalog.mine.find((item) => item.id === selectedTemplate.id) || null
        : null,
    [selectedTemplate, templateCatalog.mine]
  )

  const parsedParameters = useMemo(
    () => safeParseObject(draft?.parametersText || JSON.stringify(DEFAULT_PARAMETERS, null, 2)),
    [draft?.parametersText]
  )

  const parameterRows = useMemo(
    () => (parsedParameters ? Object.entries(parsedParameters) : []),
    [parsedParameters]
  )

  const hasUnsavedChanges = useMemo(() => {
    if (!draft) return false
    if (!draft.id) return true
    if (!draftBaseline) return true
    return hasDraftChanges(draft, draftBaseline)
  }, [draft, draftBaseline])

  const hasCodeUnsavedChanges = useMemo(() => {
    if (!draft) return false
    if (!draft.id) return true
    if (!draftBaseline) return true
    return hasCodeChanges(draft, draftBaseline)
  }, [draft, draftBaseline])

  const discardWorkspaceChanges = useCallback(() => {
    if (!draft) return
    if (!draft.id) {
      setSelectedId(null)
      setDraft(null)
      setDraftBaseline(null)
      setHistory([])
      return
    }
    if (draftBaseline) {
      setDraft({ ...draftBaseline })
    } else {
      setDraft(null)
    }
  }, [draft, draftBaseline])

  const confirmUnsavedThen = useCallback(
    (action: () => void, options?: { discardWorkspaceChanges?: boolean }) => {
      if (!hasUnsavedChanges || saving) {
        action()
        return
      }
      setConfirmState({
        title: t('page.unsaved.title'),
        message: t('page.unsaved.message'),
        confirmLabel: t('page.unsaved.discard'),
        onConfirm: () => {
          setConfirmState(null)
          setCodeFullscreen(false)
          if (options?.discardWorkspaceChanges) {
            discardWorkspaceChanges()
          }
          action()
        },
      })
    },
    [discardWorkspaceChanges, hasUnsavedChanges, saving, t]
  )

  useBeforeUnload(
    useCallback(
      (event) => {
        if (!hasUnsavedChanges || saving) return
        event.preventDefault()
        event.returnValue = ''
      },
      [hasUnsavedChanges, saving]
    )
  )

  useEffect(() => {
    const onDocumentClick = (event: MouseEvent) => {
      if (!hasUnsavedChanges || saving || confirmState) return
      if (event.defaultPrevented || event.button !== 0) return
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return

      const target = event.target
      if (!(target instanceof Element)) return
      const anchor = target.closest('a[href]')
      if (!(anchor instanceof HTMLAnchorElement)) return
      if (anchor.target && anchor.target !== '_self') return
      if (anchor.hasAttribute('download')) return

      const rawHref = anchor.getAttribute('href')
      if (!rawHref || rawHref.startsWith('#') || rawHref.startsWith('javascript:')) return

      let url: URL
      try {
        url = new URL(anchor.href, window.location.href)
      } catch {
        return
      }
      if (url.origin !== window.location.origin) return

      const nextPath = `${url.pathname}${url.search}${url.hash}`
      const currentPath = `${window.location.pathname}${window.location.search}${window.location.hash}`
      if (nextPath === currentPath) return

      event.preventDefault()
      setConfirmState({
        title: t('page.unsaved.title'),
        message: t('page.unsaved.message'),
        confirmLabel: t('page.unsaved.discard'),
        onConfirm: () => {
          setConfirmState(null)
          setCodeFullscreen(false)
          navigate(nextPath)
        },
      })
    }

    document.addEventListener('click', onDocumentClick, true)
    return () => document.removeEventListener('click', onDocumentClick, true)
  }, [confirmState, hasUnsavedChanges, navigate, saving, t])

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
      const nextDraft = draftFromStrategy(detail)
      setSelectedId(strategyId)
      setDraft(nextDraft)
      setDraftBaseline(nextDraft)
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
        setDraftBaseline(null)
        setHistory([])
      }
    } catch (error: unknown) {
      const requestError = error as { response?: { data?: { detail?: string } } }
      showToast(requestError.response?.data?.detail || t('page.toasts.loadListFailed'), 'error')
    } finally {
      setLoadingList(false)
    }
  }

  const refreshBuiltinStrategies = async () => {
    try {
      const response = await strategiesAPI.listBuiltin()
      const builtinItems = unwrapArray<BuiltinStrategyApiItem>(response.data)
      const serverNameSet = new Set(
        builtinItems.map((item) => (item.class_name || item.name || '').toLowerCase()).filter(Boolean)
      )
      setAvailableBuiltinNames(serverNameSet)
    } catch {
      setAvailableBuiltinNames(new Set())
    }
  }

  const refreshTemplates = async (scope: TemplateScope) => {
    setLoadingTemplates(true)
    try {
      const response =
        scope === 'mine'
          ? await templateAPI.listMine({ page: 1, page_size: 100 })
          : await templateAPI.listMarketplace({ page: 1, page_size: 100 })
      const items = unwrapArray<TemplateApiItem>(response.data).map((item) => mapTemplateCard(item, scope))
      setTemplateCatalog((current) => ({
        ...current,
        [scope]: items,
      }))
    } catch (error: unknown) {
      const requestError = error as { response?: { data?: { detail?: string } } }
      showToast(requestError.response?.data?.detail || t('page.toasts.loadTemplatesFailed'), 'error')
      setTemplateCatalog((current) => ({
        ...current,
        [scope]: [],
      }))
    } finally {
      setLoadingTemplates(false)
    }
  }

  useEffect(() => {
    void refreshStrategies()
    void refreshBuiltinStrategies()
    void refreshTemplates('marketplace')
    void refreshTemplates('mine')
  }, [])

  useEffect(() => {
    setSelectedTemplateKey((current) => {
      if (current && templates.some((item) => item.key === current)) {
        return current
      }
      return templates[0]?.key || null
    })
  }, [templates])

  const loadTemplateFeedback = async (templateId: number) => {
    setLoadingTemplateFeedback(true)
    try {
      const [ratingsResponse, commentsResponse] = await Promise.all([
        templateAPI.getRatings(templateId),
        templateAPI.listComments(templateId),
      ])
      const ratingsPayload = ratingsResponse.data as TemplateRatingsPayload
      const summary = ratingsPayload.summary || {}
      setTemplateRatings({
        avgRating: Number(summary.avg_rating || 0),
        count: Number(summary.count || 0),
      })
      setTemplateReviews(Array.isArray(ratingsPayload.reviews) ? ratingsPayload.reviews : [])
      setTemplateComments(unwrapArray<TemplateComment>(commentsResponse.data))
    } catch {
      setTemplateRatings({ avgRating: 0, count: 0 })
      setTemplateReviews([])
      setTemplateComments([])
    } finally {
      setLoadingTemplateFeedback(false)
    }
  }

  useEffect(() => {
    if (!selectedTemplate) {
      setTemplateRatings({ avgRating: 0, count: 0 })
      setTemplateReviews([])
      setTemplateComments([])
      setCommentDraft('')
      setRatingValue(null)
      return
    }
    setCommentDraft('')
    setRatingValue(null)
    void loadTemplateFeedback(selectedTemplate.id)
  }, [selectedTemplate?.id])

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
    if (!hasUnsavedChanges) return

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

  const ensureTemplateReady = async (template: TemplateCard) => {
    if (template.code) return template
    const response = await templateAPI.get(template.id)
    const detail = mapTemplateCard(response.data as TemplateApiItem, template.source)
    setTemplateCatalog((current) => ({
      ...current,
      [template.source]: current[template.source].map((item) => (item.id === template.id ? detail : item)),
    }))
    return detail
  }

  const createDraftFromTemplate = async (
    template: TemplateCard | null,
    overrides?: Partial<CreateFormState>
  ) => {
    const name = overrides?.name?.trim() || t('page.modals.defaultName')
    let selectedTemplate = template
    if (selectedTemplate) {
      try {
        setSelectedTemplateLoading(true)
        selectedTemplate = await ensureTemplateReady(selectedTemplate)
      } catch (error: unknown) {
        const requestError = error as { response?: { data?: { detail?: string } } }
        showToast(requestError.response?.data?.detail || t('page.toasts.loadTemplateDetailFailed'), 'error')
        return
      } finally {
        setSelectedTemplateLoading(false)
      }
    }
    const description =
      overrides?.description?.trim() ||
      (selectedTemplate?.description?.trim() || t('page.modals.blankDescription'))
    const className = sanitizeIdentifier(name)
    const code = selectedTemplate?.code
      ? replacePrimaryClassName(selectedTemplate.code, className)
      : buildSkeletonCode(className, name, description)

    setSelectedId(UNSAVED_DRAFT_ID)
    setDraftBaseline(null)
    setDraft({
      id: undefined,
      name,
      class_name: className,
      description,
      code,
      parametersText: JSON.stringify(selectedTemplate?.defaultParameters || DEFAULT_PARAMETERS, null, 2),
    })
    setMainTab('workspace')
    setDetailTab('code')
    setSelectedTemplateKey(selectedTemplate?.key || null)
    setCreateModalOpen(false)
    showToast(t('page.toasts.draftCreated'), 'success')
  }

  const openTemplateEditorForCreate = () => {
    const initialParams = safeParseObject(draft?.parametersText || '')
    setTemplateEditor({
      mode: 'create',
      name: draft?.name || t('page.modals.defaultName'),
      description: draft?.description || '',
      category: inferCategory(
        draft || { name: draft?.name || 'Strategy', class_name: draft?.class_name || '', description: draft?.description || '' }
      ),
      visibility: 'private',
      code: draft?.code || buildSkeletonCode('MyStrategy', 'MyStrategy', t('page.modals.blankDescription')),
      defaultParamsText: JSON.stringify(initialParams || DEFAULT_PARAMETERS, null, 2),
    })
  }

  const openTemplateEditorForEdit = async (template: TemplateCard) => {
    try {
      setTemplateActionLoading(true)
      const readyTemplate = await ensureTemplateReady(template)
      setTemplateEditor({
        mode: 'edit',
        templateId: readyTemplate.id,
        name: readyTemplate.name,
        description: readyTemplate.description,
        category: readyTemplate.category,
        visibility: (readyTemplate.visibility as 'private' | 'team' | 'public') || 'private',
        code: readyTemplate.code || '',
        defaultParamsText: JSON.stringify(readyTemplate.defaultParameters || DEFAULT_PARAMETERS, null, 2),
      })
    } catch (error: unknown) {
      const requestError = error as { response?: { data?: { detail?: string } } }
      showToast(requestError.response?.data?.detail || t('page.toasts.loadTemplateDetailFailed'), 'error')
    } finally {
      setTemplateActionLoading(false)
    }
  }

  const submitTemplateEditor = async () => {
    if (!templateEditor) return
    const params = safeParseObject(templateEditor.defaultParamsText)
    if (!params) {
      showToast(t('page.toasts.parametersInvalid'), 'error')
      return
    }
    if (!templateEditor.name.trim()) {
      showToast(t('nameRequired'), 'error')
      return
    }
    if (!templateEditor.code.trim()) {
      showToast(t('page.toasts.codeRequiredForTemplate'), 'error')
      return
    }
    try {
      setTemplateActionLoading(true)
      const payload = {
        name: templateEditor.name.trim(),
        description: templateEditor.description.trim(),
        category: toBackendTemplateCategory(templateEditor.category),
        code: normalizeCode(templateEditor.code),
        default_params: params,
        visibility: templateEditor.visibility,
      }
      if (templateEditor.mode === 'create') {
        const response = await templateAPI.create(payload)
        const created = mapTemplateCard(response.data as TemplateApiItem, 'mine')
        setTemplateScope('mine')
        await refreshTemplates('mine')
        if (created.visibility === 'public') {
          await refreshTemplates('marketplace')
        }
        setSelectedTemplateKey(templateKey('mine', created.id))
        showToast(t('page.toasts.templateCreated'), 'success')
      } else if (templateEditor.templateId) {
        await templateAPI.update(templateEditor.templateId, payload)
        await refreshTemplates('mine')
        await refreshTemplates('marketplace')
        setTemplateScope('mine')
        setSelectedTemplateKey(templateKey('mine', templateEditor.templateId))
        showToast(t('page.toasts.templateUpdated'), 'success')
      }
      setTemplateEditor(null)
    } catch (error: unknown) {
      const requestError = error as { response?: { data?: { detail?: string } } }
      showToast(requestError.response?.data?.detail || t('page.toasts.templateSaveFailed'), 'error')
    } finally {
      setTemplateActionLoading(false)
    }
  }

  const toggleTemplateVisibility = async (template: TemplateCard) => {
    const nextVisibility = template.visibility === 'public' ? 'private' : 'public'
    try {
      setTemplateActionLoading(true)
      await templateAPI.update(template.id, { visibility: nextVisibility })
      await refreshTemplates('mine')
      await refreshTemplates('marketplace')
      showToast(
        nextVisibility === 'public' ? t('page.toasts.templatePublished') : t('page.toasts.templateUnpublished'),
        'success'
      )
    } catch (error: unknown) {
      const requestError = error as { response?: { data?: { detail?: string } } }
      showToast(requestError.response?.data?.detail || t('page.toasts.templateSaveFailed'), 'error')
    } finally {
      setTemplateActionLoading(false)
    }
  }

  const cloneTemplateToMine = async (template: TemplateCard) => {
    try {
      setTemplateActionLoading(true)
      const response = await templateAPI.clone(template.id)
      const cloned = mapTemplateCard(response.data as TemplateApiItem, 'mine')
      await refreshTemplates('mine')
      await refreshTemplates('marketplace')
      setTemplateScope('mine')
      setSelectedTemplateKey(templateKey('mine', cloned.id))
      showToast(t('page.toasts.templateCloned'), 'success')
    } catch (error: unknown) {
      const requestError = error as { response?: { data?: { detail?: string } } }
      showToast(requestError.response?.data?.detail || t('page.toasts.templateSaveFailed'), 'error')
    } finally {
      setTemplateActionLoading(false)
    }
  }

  const requestDeleteTemplate = (template: TemplateCard) => {
    setConfirmState({
      title: t('page.templates.deleteTitle'),
      message: t('page.templates.deleteMessage', { name: template.name }),
      confirmLabel: t('page.actions.delete'),
      onConfirm: () => {
        void (async () => {
          try {
            setTemplateActionLoading(true)
            await templateAPI.delete(template.id)
            setConfirmState(null)
            await refreshTemplates('mine')
            await refreshTemplates('marketplace')
            setSelectedTemplateKey(null)
            showToast(t('page.toasts.templateDeleted'), 'success')
          } catch (error: unknown) {
            const requestError = error as { response?: { data?: { detail?: string } } }
            showToast(requestError.response?.data?.detail || t('page.toasts.templateSaveFailed'), 'error')
          } finally {
            setTemplateActionLoading(false)
          }
        })()
      },
    })
  }

  const submitTemplateFeedback = async () => {
    if (!selectedTemplate) return
    const comment = commentDraft.trim()
    const canRate = selectedTemplate.source === 'marketplace'
    const hasRating = canRate && ratingValue !== null
    if (!comment && !hasRating) {
      showToast(t('page.templates.feedbackRequired'), 'error')
      return
    }
    try {
      setTemplateActionLoading(true)
      if (hasRating) {
        await templateAPI.rate(selectedTemplate.id, { rating: ratingValue as number })
      }
      if (comment) {
        await templateAPI.addComment(selectedTemplate.id, { content: comment })
      }
      setCommentDraft('')
      setRatingValue(null)
      await loadTemplateFeedback(selectedTemplate.id)
      showToast(comment ? t('page.toasts.templateCommentAdded') : t('page.toasts.templateRated'), 'success')
    } catch (error: unknown) {
      const requestError = error as { response?: { data?: { detail?: string } } }
      showToast(requestError.response?.data?.detail || t('page.toasts.templateSaveFailed'), 'error')
    } finally {
      setTemplateActionLoading(false)
    }
  }

  const handleCreateDraft = () => {
    const template =
      createForm.templateKey === 'blank'
        ? null
        : allTemplates.find((item) => item.key === createForm.templateKey) || null
    void createDraftFromTemplate(template, createForm)
  }

  const handleDuplicate = () => {
    if (!draft) return
    const nextName = `${draft.name}_copy`
    setSelectedId(UNSAVED_DRAFT_ID)
    setDraftBaseline(null)
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

      setSelectedId(UNSAVED_DRAFT_ID)
      setDraftBaseline(null)
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

  const handleMainTabChange = (key: string) => {
    const nextTab = key as MainTabKey
    if (nextTab === mainTab) return
    confirmUnsavedThen(
      () => setMainTab(nextTab),
      { discardWorkspaceChanges: nextTab === 'templates' }
    )
  }

  const handleStrategyCardClick = (strategy: StrategyListItem) => {
    if (strategy.id === selectedId) return
    confirmUnsavedThen(() => {
      if (strategy.id === UNSAVED_DRAFT_ID) {
        setSelectedId(UNSAVED_DRAFT_ID)
        setDetailTab('code')
        return
      }
      void selectStrategy(strategy.id)
    })
  }

  const handleTemplateScopeChange = (scope: TemplateScope) => {
    if (scope === templateScope) return
    setTemplateScope(scope)
    if (templateCatalog[scope].length === 0) {
      void refreshTemplates(scope)
    }
  }

  const handleTemplatePreview = async (template: TemplateCard) => {
    setSelectedTemplateKey(template.key)
    if (template.code) return
    try {
      setSelectedTemplateLoading(true)
      await ensureTemplateReady(template)
    } catch (error: unknown) {
      const requestError = error as { response?: { data?: { detail?: string } } }
      showToast(requestError.response?.data?.detail || t('page.toasts.loadTemplateDetailFailed'), 'error')
    } finally {
      setSelectedTemplateLoading(false)
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

      <TabPanel tabs={mainTabs} activeTab={mainTab} onChange={handleMainTabChange}>
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
                      const isUnsavedDraft = strategy.id === UNSAVED_DRAFT_ID
                      return (
                        <button key={strategy.id} type="button" data-testid={`strategy-card-${strategy.id}`} onClick={() => handleStrategyCardClick(strategy)} className={`w-full rounded-xl border px-4 py-4 text-left transition-colors ${isSelected ? 'border-primary bg-primary/5 shadow-sm' : 'border-border bg-background hover:border-primary/40 hover:bg-muted/40'}`}>
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <div className="flex items-center gap-2">
                                <div className="font-semibold text-foreground">{strategy.name}</div>
                                {isUnsavedDraft && <Badge variant="warning">{t('page.list.unsavedBadge')}</Badge>}
                              </div>
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
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          className={buttonPrimaryClass}
                          onClick={() => void saveDraft()}
                          disabled={saving || !hasUnsavedChanges}
                          data-testid="save-strategy-button"
                        >
                          <Save size={14} />
                          {saving ? t('form.saving') : t('page.actions.save')}
                        </button>
                        <button
                          type="button"
                          className={buttonSecondaryClass}
                          onClick={openTemplateEditorForCreate}
                          disabled={templateActionLoading}
                          data-testid="save-as-template-button"
                        >
                          <Plus size={14} />
                          {t('page.templates.saveCurrent')}
                        </button>
                        <button type="button" className={buttonGhostClass} onClick={handleDuplicate}>
                          <Copy size={14} />
                          {t('page.actions.duplicate')}
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
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <div className="flex flex-wrap items-center gap-2">
                              {validation.ok === true ? <Badge variant="success">{validation.message}</Badge> : validation.ok === false ? <Badge variant="destructive">{validation.message}</Badge> : <Badge variant="muted">{validation.message}</Badge>}
                              {hasCodeUnsavedChanges && <Badge variant="warning">{t('page.detail.code.unsavedChanges')}</Badge>}
                            </div>
                            <div className="flex flex-wrap gap-2">
                              <button type="button" className={buttonGhostClass} onClick={() => updateDraft((current) => ({ ...current, code: normalizeCode(current.code) }))}>{t('page.actions.format')}</button>
                              <button type="button" className={buttonGhostClass} onClick={() => void validateCode(draft.code)}>{t('page.actions.validate')}</button>
                              <button type="button" className={buttonGhostClass} onClick={() => setCodeFullscreen((current) => !current)}>
                                {codeFullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
                                {codeFullscreen ? t('editor.exitFullscreen') : t('editor.fullscreen')}
                              </button>
                            </div>
                          </div>

                          <div
                            className={
                              codeFullscreen
                                ? 'fixed inset-0 z-[80] bg-black/70 p-4 md:p-6'
                                : ''
                            }
                          >
                            <div
                              className={
                                codeFullscreen
                                  ? 'mx-auto flex h-full w-full max-w-[1600px] flex-col rounded-2xl border border-border bg-card shadow-2xl'
                                  : ''
                              }
                            >
                              {codeFullscreen && (
                                <div className="flex items-center justify-between border-b border-border px-4 py-3">
                                  <div className="text-sm font-medium text-foreground">{t('form.code')}</div>
                                  <div className="flex flex-wrap gap-2">
                                    <button type="button" className={buttonGhostClass} onClick={() => updateDraft((current) => ({ ...current, code: normalizeCode(current.code) }))}>
                                      {t('page.actions.format')}
                                    </button>
                                    <button type="button" className={buttonGhostClass} onClick={() => void validateCode(draft.code)}>
                                      {t('page.actions.validate')}
                                    </button>
                                    <button type="button" className={buttonGhostClass} onClick={() => setCodeFullscreen(false)}>
                                      <Minimize2 size={14} />
                                      {t('editor.exitFullscreen')}
                                    </button>
                                  </div>
                                </div>
                              )}

                              <div className={codeFullscreen ? 'flex-1 p-4' : ''}>
                                <label className="mb-1 block text-sm font-medium">{t('form.code')}</label>
                                <div
                                  className={`overflow-hidden rounded-lg border border-border ${codeFullscreen ? 'h-[calc(100vh-170px)]' : 'h-[420px]'}`}
                                  data-testid="strategy-code-editor"
                                >
                                  <Editor
                                    language="python"
                                    theme="vs-dark"
                                    value={draft.code}
                                    onChange={(value) => updateDraft((current) => ({ ...current, code: value || '' }))}
                                    height="100%"
                                    options={{
                                      automaticLayout: true,
                                      minimap: { enabled: !codeFullscreen },
                                      fontSize: 13,
                                      fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                                      scrollBeyondLastLine: false,
                                      tabSize: 4,
                                      insertSpaces: true,
                                    }}
                                  />
                                </div>
                              </div>
                            </div>
                          </div>

                          <div className="text-xs text-muted-foreground">{loadingDetail ? t('page.detail.loading') : t('page.detail.code.lastModified', { value: formatDateTime(selectedSummary?.updated_at, currentLanguage) })}</div>
                        </div>
                      )}

                      {detailTab === 'profile' && (
                        <div className="space-y-4" data-testid="strategy-profile-panel">
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
          <div className="grid gap-4 xl:grid-cols-2">
            <section className={`${shellCardClass} p-5`}>
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-card-foreground">{t('page.templates.title')}</h2>
                  <p className="mt-1 text-sm text-muted-foreground">{t('page.templates.subtitle')}</p>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    className={templateScope === 'marketplace' ? buttonPrimaryClass : buttonSecondaryClass}
                    onClick={() => handleTemplateScopeChange('marketplace')}
                  >
                    {t('page.templates.scopeMarketplace')}
                  </button>
                  <button
                    type="button"
                    className={templateScope === 'mine' ? buttonPrimaryClass : buttonSecondaryClass}
                    onClick={() => handleTemplateScopeChange('mine')}
                  >
                    {t('page.templates.scopeMine')}
                  </button>
                </div>
              </div>

              {loadingTemplates && templates.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
                  {t('page.table.loading')}
                </div>
              ) : templates.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
                  {t('page.templates.empty')}
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2" data-testid="strategy-templates-grid">
                  {templates.map((template) => (
                    <article key={template.key} className="min-w-0 rounded-2xl border border-border bg-background p-4" data-testid={`template-card-${template.key}`}>
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-base font-semibold text-foreground">{template.name}</div>
                          <div className="mt-1 line-clamp-2 break-words text-sm text-muted-foreground">{template.description || t('page.templates.fallbackDescription')}</div>
                        </div>
                        <Badge variant={getCategoryVariant(template.category)}>{translateCategory(template.category)}</Badge>
                      </div>
                      <div className="mt-4 flex flex-wrap gap-2">
                        <Badge variant={template.source === 'marketplace' ? 'success' : 'muted'}>
                          {template.source === 'marketplace' ? t('page.templates.sourceMarketplace') : t('page.templates.sourceMine')}
                        </Badge>
                        <Badge variant="muted">{template.visibility}</Badge>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-x-2 gap-y-1 text-xs text-muted-foreground">
                        <span>{t('page.templates.downloads', { count: template.downloads })}</span>
                        <span>|</span>
                        <span>{formatDateTime(template.updatedAt, currentLanguage)}</span>
                      </div>
                      <div className="mt-4 flex flex-wrap gap-2">
                        <button type="button" className={buttonGhostClass} onClick={() => void handleTemplatePreview(template)}>
                          <Eye size={14} />
                          {t('page.actions.preview')}
                        </button>
                        <button
                          type="button"
                          className={buttonPrimaryClass}
                          onClick={() => void createDraftFromTemplate(template)}
                          disabled={selectedTemplateLoading}
                        >
                          {t('page.actions.useTemplate')}
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>

            <aside className={`${shellCardClass} p-5`} data-testid="template-preview-panel">
              {selectedTemplate ? (
                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-semibold text-card-foreground">{selectedTemplate.name}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">{selectedTemplate.description || t('page.templates.fallbackDescription')}</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Badge variant={selectedTemplate.source === 'marketplace' ? 'success' : 'muted'}>
                        {selectedTemplate.source === 'marketplace' ? t('page.templates.sourceMarketplace') : t('page.templates.sourceMine')}
                      </Badge>
                      <Badge variant="muted">{selectedTemplate.visibility}</Badge>
                    </div>
                  </div>
                  {selectedTemplateLoading ? (
                    <div className="rounded-xl border border-dashed border-border px-4 py-6 text-sm text-muted-foreground">
                      {t('page.table.loading')}
                    </div>
                  ) : selectedTemplate.code ? (
                    <pre className="max-h-[440px] overflow-auto rounded-xl border border-border bg-muted/20 p-4 text-xs leading-6 text-foreground">{selectedTemplate.code}</pre>
                  ) : (
                    <div className="rounded-xl border border-dashed border-border px-4 py-6 text-sm text-muted-foreground">
                      {t('page.templates.loadCodeHint')}
                    </div>
                  )}
                  <div className="flex flex-wrap gap-2">
                    {!selectedTemplate.code && (
                      <button type="button" className={buttonSecondaryClass} onClick={() => void handleTemplatePreview(selectedTemplate)} disabled={selectedTemplateLoading}>
                        {t('page.templates.loadCode')}
                      </button>
                    )}
                    <button type="button" className={`${buttonPrimaryClass} flex-1`} onClick={() => void createDraftFromTemplate(selectedTemplate)} disabled={selectedTemplateLoading}>
                      {t('page.actions.useTemplate')}
                    </button>
                    {selectedTemplate.source === 'marketplace' && (
                      <button type="button" className={buttonSecondaryClass} onClick={() => void cloneTemplateToMine(selectedTemplate)} disabled={templateActionLoading}>
                        <Copy size={14} />
                        {t('page.templates.cloneToMine')}
                      </button>
                    )}
                    {selectedTemplateInMine && (
                      <>
                        <button type="button" className={buttonSecondaryClass} onClick={() => void openTemplateEditorForEdit(selectedTemplateInMine)} disabled={templateActionLoading}>
                          <PencilLine size={14} />
                          {t('page.actions.edit')}
                        </button>
                        <button type="button" className={buttonSecondaryClass} onClick={() => void toggleTemplateVisibility(selectedTemplateInMine)} disabled={templateActionLoading}>
                          <Globe size={14} />
                          {selectedTemplateInMine.visibility === 'public' ? t('page.templates.unpublish') : t('page.templates.publish')}
                        </button>
                        <button type="button" className={buttonSecondaryClass} onClick={() => requestDeleteTemplate(selectedTemplateInMine)} disabled={templateActionLoading}>
                          <Trash2 size={14} />
                          {t('page.actions.delete')}
                        </button>
                      </>
                    )}
                  </div>

                  <div className="rounded-xl border border-border bg-background p-4">
                    <div className="mb-3 flex items-center justify-between">
                      <div className="text-sm font-medium text-card-foreground">{t('page.templates.ratingTitle')}</div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Star size={14} className="text-yellow-500" />
                        <span>{templateRatings.avgRating.toFixed(2)} / 5</span>
                        <span>({templateRatings.count})</span>
                      </div>
                    </div>
                    {templateReviews.length > 0 && (
                      <div className="space-y-2">
                        {templateReviews.slice(0, 3).map((review) => (
                          <div key={review.id} className="rounded-lg border border-border/70 bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
                            <div className="font-medium text-foreground">{`* ${review.rating}`}</div>
                            <div>{review.review || '-'}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="rounded-xl border border-border bg-background p-4">
                    <div className="mb-3 flex items-center justify-between">
                      <div className="text-sm font-medium text-card-foreground">{t('page.templates.commentsTitle')}</div>
                      <MessageSquare size={14} className="text-muted-foreground" />
                    </div>
                    {selectedTemplate.source === 'marketplace' ? (
                      <div className="mb-3">
                        <label className="mb-1 block text-xs font-medium text-muted-foreground">{t('page.templates.ratingOptional')}</label>
                        <select
                          className={inputClass}
                          value={ratingValue === null ? '' : String(ratingValue)}
                          onChange={(event) => {
                            const value = event.target.value
                            setRatingValue(value ? Number(value) : null)
                          }}
                        >
                          <option value="">{t('page.templates.noRating')}</option>
                          {[5, 4, 3, 2, 1].map((value) => (
                            <option key={value} value={value}>
                              {value}
                            </option>
                          ))}
                        </select>
                      </div>
                    ) : (
                      <div className="mb-3 text-xs text-muted-foreground">{t('page.templates.mineNoRatingHint')}</div>
                    )}
                    {templateComments.length > 0 ? (
                      <div className="mb-3 space-y-2">
                        {templateComments.slice(0, 4).map((comment) => (
                          <div key={comment.id} className="rounded-lg border border-border/70 bg-muted/20 px-3 py-2 text-xs">
                            <div className="text-foreground">{comment.content}</div>
                            <div className="mt-1 text-muted-foreground">{formatDateTime(comment.created_at, currentLanguage)}</div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="mb-3 text-xs text-muted-foreground">{t('page.templates.noComments')}</div>
                    )}
                    <textarea
                      className={`${inputClass} min-h-[80px] resize-y`}
                      value={commentDraft}
                      onChange={(event) => setCommentDraft(event.target.value)}
                      placeholder={t('page.templates.commentPlaceholder')}
                    />
                    <button
                      type="button"
                      className={`${buttonPrimaryClass} mt-2`}
                      onClick={() => void submitTemplateFeedback()}
                      disabled={templateActionLoading || loadingTemplateFeedback || (!commentDraft.trim() && !(selectedTemplate.source === 'marketplace' && ratingValue !== null))}
                    >
                      {t('page.templates.submitFeedback')}
                    </button>
                  </div>
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
                    {allTemplates.map((template) => (
                      <option key={template.key} value={template.key}>
                        {template.name} ({template.source === 'marketplace' ? t('page.templates.sourceMarketplace') : t('page.templates.sourceMine')})
                      </option>
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

      {templateEditor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 px-4">
          <div className="max-h-[90vh] w-full max-w-3xl overflow-auto rounded-2xl border border-border bg-card p-6 shadow-xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-lg font-semibold text-card-foreground">
                  {templateEditor.mode === 'create' ? t('page.templates.createTitle') : t('page.templates.editTitle')}
                </h3>
                <p className="mt-1 text-sm text-muted-foreground">{t('page.templates.editorSubtitle')}</p>
              </div>
              <button type="button" className={buttonGhostClass} onClick={() => setTemplateEditor(null)}>
                <X size={16} />
              </button>
            </div>

            <div className="mt-5 space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium">{t('page.modals.name')}</label>
                  <input className={inputClass} value={templateEditor.name} onChange={(event) => setTemplateEditor((current) => (current ? { ...current, name: event.target.value } : current))} />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">{t('page.modals.type')}</label>
                  <select className={inputClass} value={templateEditor.category} onChange={(event) => setTemplateEditor((current) => (current ? { ...current, category: event.target.value as StrategyCategoryKey } : current))}>
                    <option value="cta">{t('page.types.cta')}</option>
                    <option value="alpha">{t('page.types.alpha')}</option>
                    <option value="statArb">{t('page.types.statArb')}</option>
                    <option value="grid">{t('page.types.grid')}</option>
                    <option value="ai">{t('page.types.ai')}</option>
                    <option value="custom">{t('page.types.custom')}</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">{t('page.modals.description')}</label>
                <textarea className={`${inputClass} min-h-[88px] resize-y`} value={templateEditor.description} onChange={(event) => setTemplateEditor((current) => (current ? { ...current, description: event.target.value } : current))} />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">{t('page.templates.visibility')}</label>
                <select className={inputClass} value={templateEditor.visibility} onChange={(event) => setTemplateEditor((current) => (current ? { ...current, visibility: event.target.value as 'private' | 'team' | 'public' } : current))}>
                  <option value="private">{t('page.templates.visibilityPrivate')}</option>
                  <option value="team">{t('page.templates.visibilityTeam')}</option>
                  <option value="public">{t('page.templates.visibilityPublic')}</option>
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">{t('form.code')}</label>
                <textarea className={`${inputClass} min-h-[260px] resize-y font-mono text-xs leading-6`} value={templateEditor.code} onChange={(event) => setTemplateEditor((current) => (current ? { ...current, code: event.target.value } : current))} />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">{t('page.detail.parameters.jsonLabel')}</label>
                <textarea className={`${inputClass} min-h-[140px] resize-y font-mono text-xs leading-6`} value={templateEditor.defaultParamsText} onChange={(event) => setTemplateEditor((current) => (current ? { ...current, defaultParamsText: event.target.value } : current))} />
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button type="button" className={buttonSecondaryClass} onClick={() => setTemplateEditor(null)}>{t('page.actions.cancel')}</button>
              <button type="button" className={buttonPrimaryClass} onClick={() => void submitTemplateEditor()} disabled={templateActionLoading}>
                {templateActionLoading ? t('form.saving') : t('page.actions.save')}
              </button>
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
              <button
                type="button"
                className={buttonSecondaryClass}
                onClick={() => {
                  const onCancel = confirmState.onCancel
                  setConfirmState(null)
                  onCancel?.()
                }}
              >
                {t('page.actions.cancel')}
              </button>
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
