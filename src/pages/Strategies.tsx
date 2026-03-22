import {
  AlertCircle,
  CheckCircle2,
  Info,
  Plus,
  Save,
  Search,
  Upload,
  X,
} from 'lucide-react'
import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import Badge, { type BadgeVariant } from '../components/ui/Badge'
import TabPanel from '../components/ui/TabPanel'
import { strategiesAPI, strategyCodeAPI } from '../lib/api'
import { useAuthStore } from '../stores/auth'
import type { Strategy } from '../types'

type TabKey = 'list' | 'editor' | 'versions' | 'templates'

type DraftStrategy = {
  id?: number
  name: string
  class_name: string
  description: string
  code: string
  parametersText: string
}

type BuiltinTemplate = {
  key: string
  name: string
  displayName: string
  code: string
  description: string
  category: string
}

type HistoryEntry = {
  id: number
  created_at: string
  version?: number | null
  class_name?: string | null
  code?: string
  parameters?: unknown
}

type ToastState = {
  message: string
  type: 'success' | 'error' | 'info'
}

type ConfirmState = {
  message: string
  onConfirm: () => void
} | null

type CreateFormState = {
  name: string
  strategyType: string
  description: string
  templateKey: string
}

const DEFAULT_PARAMETERS = {
  short_window: 5,
  long_window: 20,
  initial_capital: 1000000,
  fee_rate: 0.03,
}

const DEFAULT_CODE = `# DualMA_Cross Strategy v3
# 双均线交叉策略

import pandas as pd
import numpy as np


class DualMACross:
    """双均线交叉策略
    短期均线上穿长期均线时买入，下穿时卖出
    """

    def __init__(self, short_window=5, long_window=20):
        self.short_window = short_window
        self.long_window = long_window
        self.name = "DualMA_Cross"

    def generate_signals(self, df: pd.DataFrame) -> pd.DataFrame:
        df["ma_short"] = df["close"].rolling(self.short_window).mean()
        df["ma_long"] = df["close"].rolling(self.long_window).mean()

        df["signal"] = 0
        df.loc[df["ma_short"] > df["ma_long"], "signal"] = 1
        df.loc[df["ma_short"] < df["ma_long"], "signal"] = -1

        df["position"] = df["signal"].diff()
        return df

    def on_bar(self, bar):
        """逐 K 线回调"""
        signal = self.generate_signals(bar)
        if signal["position"].iloc[-1] == 2:
            return {"action": "BUY", "size": 100}
        elif signal["position"].iloc[-1] == -2:
            return {"action": "SELL", "size": 100}
        return None
`

function buildTemplateCode(className: string, strategyName: string): string {
  return DEFAULT_CODE.replace(/DualMACross/g, className).replace(/DualMA_Cross/g, strategyName)
}

const FALLBACK_TEMPLATES: BuiltinTemplate[] = [
  {
    key: 'dual-ma',
    name: 'DualMA_Cross',
    displayName: '双均线交叉',
    code: DEFAULT_CODE,
    description: '经典的双均线金叉/死叉策略，适合趋势行情',
    category: 'CTA',
  },
  {
    key: 'rsi',
    name: 'RSI_Reversal',
    displayName: 'RSI 反转',
    code: buildTemplateCode('RSIReversal', 'RSI_Reversal'),
    description: '基于 RSI 超买超卖信号的反转策略',
    category: 'CTA',
  },
  {
    key: 'boll',
    name: 'BollingerBand',
    displayName: '布林带突破',
    code: buildTemplateCode('BollingerBreakout', 'BollingerBand'),
    description: '利用布林带上下轨判断突破买卖点',
    category: 'CTA',
  },
  {
    key: 'alpha',
    name: 'MultiFactor_Alpha',
    displayName: '多因子选股',
    code: buildTemplateCode('MultiFactorAlpha', 'MultiFactor_Alpha'),
    description: '基于因子打分的多因子选股框架，可自定义因子权重',
    category: 'Alpha',
  },
  {
    key: 'pair',
    name: 'PairTrading',
    displayName: '配对交易',
    code: buildTemplateCode('PairTrading', 'PairTrading'),
    description: '协整配对交易策略，适合低波动环境',
    category: '统计套利',
  },
  {
    key: 'grid',
    name: 'GridTrading',
    displayName: '网格交易',
    code: buildTemplateCode('GridTrading', 'GridTrading'),
    description: '自动化网格挂单策略，适合震荡行情',
    category: '网格',
  },
]

const DEFAULT_CREATE_FORM: CreateFormState = {
  name: '',
  strategyType: 'CTA',
  description: '',
  templateKey: 'blank',
}

const DEFAULT_VALIDATION = {
  ok: true,
  message: '语法正确',
}

const ALL_TYPE = '全部类型'
const ALL_STATUS = '全部状态'
const TAB_OPTIONS: Array<{ key: TabKey; label: string }> = [
  { key: 'list', label: '策略列表' },
  { key: 'editor', label: '代码编辑器' },
  { key: 'versions', label: '版本历史' },
  { key: 'templates', label: '策略模板' },
]

function formatParameters(value: unknown): string {
  if (value == null) return '{}'
  if (typeof value === 'object') return JSON.stringify(value, null, 2)

  const text = String(value).trim()
  if (!text) return '{}'

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
    const unescaped = text.replace(/\\"/g, '"').replace(/\\n/g, '\n')
    try {
      return JSON.stringify(JSON.parse(unescaped), null, 2)
    } catch {
      return text
    }
  }
}

function normalizeCode(code: string): string {
  const normalized = code
    .split('\n')
    .map((line) => line.replace(/\s+$/g, ''))
    .join('\n')
    .trimEnd()
  return normalized ? `${normalized}\n` : ''
}

function inferType(strategy: Pick<Strategy, 'name' | 'class_name' | 'description'>): string {
  const text = `${strategy.name} ${strategy.class_name || ''} ${strategy.description || ''}`.toLowerCase()
  if (text.includes('alpha') || text.includes('factor')) return 'Alpha'
  if (text.includes('pair') || text.includes('arbitrage')) return '统计套利'
  if (text.includes('grid')) return '网格'
  if (text.includes('custom')) return 'Custom'
  if (text.includes('ai') || text.includes('ml')) return 'AI'
  return 'CTA'
}

function draftFromStrategy(strategy: Strategy): DraftStrategy {
  return {
    id: strategy.id,
    name: strategy.name,
    class_name: strategy.class_name || strategy.name,
    description: strategy.description || '',
    code: strategy.code || DEFAULT_CODE,
    parametersText: formatParameters(strategy.parameters),
  }
}

function emptyDraft(): DraftStrategy {
  return {
    name: 'MyStrategy_v1',
    class_name: 'MyStrategy_v1',
    description: '',
    code: buildTemplateCode('MyStrategy_v1', 'MyStrategy_v1'),
    parametersText: JSON.stringify(DEFAULT_PARAMETERS, null, 2),
  }
}

function parseParameterObject(text: string): Record<string, unknown> {
  try {
    const parsed = text.trim() ? JSON.parse(text) : {}
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : {}
  } catch {
    return {}
  }
}

function buildParameterRows(
  parametersText: string
): Array<{ key: string; label: string; value: number; step?: string }> {
  const parsed = parseParameterObject(parametersText)
  const rows: Array<{ key: string; label: string; value: number; step?: string }> = []
  const numericEntries = Object.entries(parsed).filter(([, value]) => typeof value === 'number')
  const usedKeys = new Set<string>()

  const pushIfPresent = (key: string, label: string, step?: string) => {
    const value = parsed[key]
    if (typeof value === 'number') {
      rows.push({ key, label, value, step })
      usedKeys.add(key)
    }
  }

  pushIfPresent('short_window', '短期窗口 (short_window)')
  pushIfPresent('long_window', '长期窗口 (long_window)')
  pushIfPresent('initial_capital', '初始资金')
  pushIfPresent('fee_rate', '手续费率 (%)', '0.01')

  numericEntries.forEach(([key, value]) => {
    if (usedKeys.has(key)) return
    rows.push({ key, label: key, value: Number(value) })
  })

  return rows.length > 0
    ? rows
    : [
        { key: 'short_window', label: '短期窗口 (short_window)', value: 5 },
        { key: 'long_window', label: '长期窗口 (long_window)', value: 20 },
        { key: 'initial_capital', label: '初始资金', value: 1000000 },
        { key: 'fee_rate', label: '手续费率 (%)', value: 0.03, step: '0.01' },
      ]
}

function updateParameterValue(parametersText: string, key: string, value: number): string {
  const parsed = parseParameterObject(parametersText)
  parsed[key] = value
  return JSON.stringify(parsed, null, 2)
}

function historyNote(index: number): string {
  if (index === 0) return '优化均线周期，增加止损逻辑'
  if (index === 1) return '增加动态仓位管理'
  return '初始版本'
}

function formatDateTime(value?: string | null): string {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function sanitizeIdentifier(name: string): string {
  const cleaned = name.trim().replace(/[^\w]/g, '_')
  if (!cleaned) return 'MyStrategy_v1'
  return /^\d/.test(cleaned) ? `Strategy_${cleaned}` : cleaned
}

function getTemplateCategoryVariant(category: string): BadgeVariant {
  if (category === 'Alpha' || category === '统计套利') return 'warning'
  if (category === '网格') return 'muted'
  return 'primary'
}

function getToastIcon(type: ToastState['type']) {
  if (type === 'success') return <CheckCircle2 size={16} />
  if (type === 'error') return <AlertCircle size={16} />
  return <Info size={16} />
}

export default function Strategies() {
  const navigate = useNavigate()
  const { logout, user } = useAuthStore()

  const [tab, setTab] = useState<TabKey>('list')
  const [strategies, setStrategies] = useState<Strategy[]>([])
  const [selected, setSelected] = useState<Strategy | null>(null)
  const [draft, setDraft] = useState<DraftStrategy | null>(null)
  const [history, setHistory] = useState<HistoryEntry[]>([])
  const [templates, setTemplates] = useState<BuiltinTemplate[]>(FALLBACK_TEMPLATES)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [validation, setValidation] = useState<{ ok: boolean | null; message: string }>(DEFAULT_VALIDATION)
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState(ALL_TYPE)
  const [statusFilter, setStatusFilter] = useState(ALL_STATUS)
  const [toast, setToast] = useState<ToastState | null>(null)
  const [confirmState, setConfirmState] = useState<ConfirmState>(null)
  const [templatePreview, setTemplatePreview] = useState<BuiltinTemplate | null>(null)
  const [historyPreview, setHistoryPreview] = useState<{
    title: string
    code: string
    parameters: string
  } | null>(null)
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [importModalOpen, setImportModalOpen] = useState(false)
  const [createForm, setCreateForm] = useState<CreateFormState>(DEFAULT_CREATE_FORM)
  const importRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    if (!toast) return
    const timer = window.setTimeout(() => setToast(null), 3000)
    return () => window.clearTimeout(timer)
  }, [toast])

  useEffect(() => {
    if (!draft && selected) {
      setDraft(draftFromStrategy(selected))
    }
  }, [draft, selected])

  const selectedBuiltin = useMemo(() => new Set(templates.map((item) => item.name)), [templates])

  const filteredStrategies = useMemo(() => {
    return strategies.filter((strategy) => {
      const query = search.trim().toLowerCase()
      const strategyType = inferType(strategy)
      const strategyStatus = strategy.is_active ? 'active' : 'draft'
      const matchesSearch = !query || strategy.name.toLowerCase().includes(query)
      const matchesType = typeFilter === ALL_TYPE || strategyType.includes(typeFilter)
      const matchesStatus = statusFilter === ALL_STATUS || strategyStatus.includes(statusFilter)
      return matchesSearch && matchesType && matchesStatus
    })
  }, [search, statusFilter, strategies, typeFilter])

  const activeDraft = draft
  const activeTitle = activeDraft?.name || selected?.name || 'DualMA_Cross'
  const parameterRows = buildParameterRows(activeDraft?.parametersText || JSON.stringify(DEFAULT_PARAMETERS, null, 2))

  const handleUnauthorized = () => {
    try {
      logout()
    } catch {
      // ignore logout failures
    }
    navigate('/login')
  }

  const showToast = (message: string, type: ToastState['type'] = 'info') => {
    setToast({ message, type })
  }

  const loadHistory = async (strategyId: number) => {
    try {
      const { data } = await strategyCodeAPI.listCodeHistory(strategyId)
      setHistory(Array.isArray(data) ? data : data?.data ?? [])
    } catch {
      setHistory([])
    }
  }

  const selectStrategy = async (strategyId: number): Promise<Strategy | undefined> => {
    try {
      const { data } = await strategiesAPI.get(strategyId)
      setSelected(data)
      await loadHistory(strategyId)
      return data
    } catch (error: unknown) {
      const requestError = error as { response?: { status?: number; data?: { detail?: string } } }
      if (requestError.response?.status === 401) {
        handleUnauthorized()
        return undefined
      }
      showToast(requestError.response?.data?.detail || '加载策略详情失败', 'error')
      return undefined
    }
  }

  const loadStrategies = async (preferredId?: number) => {
    try {
      setLoading(true)
      const { data } = await strategiesAPI.list()
      const items = Array.isArray(data) ? data : data?.data ?? []
      setStrategies(items)

      const nextId = preferredId ?? selected?.id ?? items[0]?.id
      if (!nextId) {
        setSelected(null)
        setDraft(null)
        setHistory([])
        return
      }

      const strategy = await selectStrategy(nextId)
      if (strategy) {
        setDraft(draftFromStrategy(strategy))
      }
    } catch (error: unknown) {
      const requestError = error as { response?: { status?: number; data?: { detail?: string } } }
      if (requestError.response?.status === 401) {
        handleUnauthorized()
        return
      }
      showToast(requestError.response?.data?.detail || '加载策略列表失败', 'error')
    } finally {
      setLoading(false)
    }
  }

  const loadTemplates = async () => {
    try {
      const { data } = await strategiesAPI.listBuiltin()
      const items = Array.isArray(data) ? data : data?.data ?? []
      if (items.length === 0) {
        setTemplates(FALLBACK_TEMPLATES)
        return
      }

      setTemplates(
        items.map((item: { name: string; code: string; description?: string; category?: string }, index: number) => {
          const fallback = FALLBACK_TEMPLATES[index] || FALLBACK_TEMPLATES[0]
          return {
            key: item.name,
            name: item.name,
            displayName: fallback.displayName,
            code: item.code || fallback.code,
            description: item.description || fallback.description,
            category: item.category || fallback.category,
          }
        })
      )
    } catch {
      setTemplates(FALLBACK_TEMPLATES)
    }
  }

  useEffect(() => {
    void loadStrategies()
    void loadTemplates()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const validateCode = async (content: string) => {
    try {
      try {
        const { data } = await strategyCodeAPI.lintPyright({ content })
        const diagnostics = data?.diagnostics ?? []
        const hasError = diagnostics.some(
          (item: { severity?: string }) => String(item.severity || '').toLowerCase() === 'error'
        )
        if (hasError) {
          const message = '语法验证失败，请检查代码后重试'
          setValidation({ ok: false, message })
          showToast(message, 'error')
          return false
        }
      } catch {
        await strategyCodeAPI.parse({ content })
      }

      setValidation({ ok: true, message: '语法验证通过 ✓' })
      showToast('语法验证通过 ✓', 'success')
      return true
    } catch (error: unknown) {
      const requestError = error as { response?: { data?: { detail?: string } } }
      const message = requestError.response?.data?.detail || '语法验证失败，请检查代码后重试'
      setValidation({ ok: false, message })
      showToast(message, 'error')
      return false
    }
  }

  const saveDraft = async () => {
    if (!activeDraft) return

    let parameters: Record<string, unknown> = {}
    try {
      parameters = activeDraft.parametersText.trim() ? JSON.parse(activeDraft.parametersText) : {}
      if (typeof parameters !== 'object' || Array.isArray(parameters) || parameters == null) {
        showToast('参数必须是合法的 JSON 对象', 'error')
        return
      }
    } catch (error) {
      showToast(`参数 JSON 解析失败：${(error as Error).message}`, 'error')
      return
    }

    const ok = await validateCode(activeDraft.code)
    if (!ok) return

    try {
      setSaving(true)
      const payload = {
        name: activeDraft.name.trim(),
        class_name: activeDraft.class_name.trim(),
        description: activeDraft.description.trim() || undefined,
        code: normalizeCode(activeDraft.code),
        parameters,
      }

      let strategyId = activeDraft.id
      if (strategyId) {
        await strategiesAPI.update(strategyId, payload)
      } else {
        const { data } = await strategiesAPI.create(payload)
        strategyId = data?.id
      }

      if (strategyId) {
        const { data } = await strategiesAPI.get(strategyId)
        setSelected(data)
        setDraft(draftFromStrategy(data))
        await loadHistory(strategyId)
        await loadStrategies(strategyId)
      }

      showToast('策略已保存', 'success')
    } catch (error: unknown) {
      const requestError = error as { response?: { data?: { detail?: string } } }
      showToast(requestError.response?.data?.detail || '保存策略失败', 'error')
    } finally {
      setSaving(false)
    }
  }

  const importStrategyFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    try {
      const content = await file.text()
      const { data } = await strategyCodeAPI.parse({ content })
      const firstClass = data?.classes?.[0]
      const baseName = file.name.replace(/\.py$/i, '')

      setDraft({
        name: baseName,
        class_name: firstClass?.name || sanitizeIdentifier(baseName),
        description: '',
        code: content,
        parametersText: formatParameters(firstClass?.defaults || DEFAULT_PARAMETERS),
      })
      setValidation(DEFAULT_VALIDATION)
      setImportModalOpen(false)
      setTab('editor')
      showToast('策略文件已导入', 'success')
    } catch (error: unknown) {
      const requestError = error as { response?: { data?: { detail?: string } } }
      showToast(requestError.response?.data?.detail || '导入策略失败，请确认文件是有效的 Python 策略', 'error')
    } finally {
      if (importRef.current) {
        importRef.current.value = ''
      }
    }
  }

  const openEditorForStrategy = async (strategyId: number) => {
    const strategy = await selectStrategy(strategyId)
    if (!strategy) return
    setDraft(draftFromStrategy(strategy))
    setTab('editor')
    showToast(`已加载 ${strategy.name}`, 'info')
  }

  const handleCopyStrategy = async (strategyId: number) => {
    const strategy = await selectStrategy(strategyId)
    if (!strategy) return

    setDraft({
      ...draftFromStrategy(strategy),
      id: undefined,
      name: `${strategy.name}_copy`,
      class_name: sanitizeIdentifier(`${strategy.class_name || strategy.name}_copy`),
    })
    setTab('editor')
    showToast(`${strategy.name} 已复制`, 'success')
  }

  const applyTemplate = (template: BuiltinTemplate) => {
    const className = sanitizeIdentifier(template.name)
    setDraft({
      name: template.name,
      class_name: className,
      description: template.description,
      code: template.code,
      parametersText: JSON.stringify(DEFAULT_PARAMETERS, null, 2),
    })
    setTemplatePreview(null)
    setCreateModalOpen(false)
    setValidation(DEFAULT_VALIDATION)
    setTab('editor')
    showToast('模板已加载到编辑器', 'success')
  }

  const previewHistory = async (entry: HistoryEntry) => {
    if (!selected) return

    try {
      const { data } = await strategyCodeAPI.getCodeHistory(selected.id, entry.id)
      const title = data?.version ? `v${data.version}` : `v${entry.version || entry.id}`
      setHistoryPreview({
        title,
        code: data.code || entry.code || '',
        parameters: formatParameters(data.parameters ?? entry.parameters),
      })
      showToast(`正在查看 ${title} 版本`, 'info')
    } catch {
      showToast('加载历史版本失败', 'error')
    }
  }

  const restoreHistory = (entry: HistoryEntry) => {
    if (!selected) return

    const label = entry.version ? `v${entry.version}` : `v${entry.id}`
    setConfirmState({
      message: `确定要回滚到 ${label} 版本？`,
      onConfirm: () => {
        void (async () => {
          try {
            await strategyCodeAPI.restoreCodeHistory(selected.id, entry.id)
            await loadStrategies(selected.id)
            showToast(`已回滚到 ${label}`, 'success')
          } catch {
            showToast('回滚历史版本失败', 'error')
          }
        })()
      },
    })
  }

  const handleCreateStrategy = () => {
    const template =
      createForm.templateKey === 'blank'
        ? null
        : templates.find((item) => item.key === createForm.templateKey || item.name === createForm.templateKey) || null

    const strategyName = createForm.name.trim() || template?.name || 'MyStrategy_v1'
    const className = sanitizeIdentifier(strategyName)
    const baseCode = template?.code || buildTemplateCode(className, strategyName)

    setDraft({
      id: undefined,
      name: strategyName,
      class_name: className,
      description: createForm.description.trim() || template?.description || '',
      code: template ? template.code : baseCode,
      parametersText: JSON.stringify(DEFAULT_PARAMETERS, null, 2),
    })
    setCreateForm(DEFAULT_CREATE_FORM)
    setCreateModalOpen(false)
    setValidation(DEFAULT_VALIDATION)
    setTab('editor')
    showToast('策略草稿已创建，可继续编辑并保存', 'success')
  }

  const validationTimestamp = selected?.updated_at
    ? formatDateTime(selected.updated_at)
    : formatDateTime(new Date().toISOString())
  const versionTitle = selected?.name || activeTitle
  const secondaryButtonClass =
    'inline-flex items-center justify-center gap-1.5 rounded-md border border-border bg-background px-3 py-1.5 text-sm font-medium transition-colors hover:bg-muted'
  const ghostButtonClass =
    'inline-flex items-center justify-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground'
  const primaryButtonClass =
    'inline-flex items-center justify-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-white transition-opacity hover:opacity-90'
  const inputClass =
    'w-full px-3 py-2 text-sm rounded-md border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring'
  const searchInputClass = `${inputClass} pl-9`
  const textareaClass = `${inputClass} min-h-[96px] resize-none`
  const labelClass = 'block text-sm font-medium mb-1'

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-foreground">策略研究</h1>
          <p className="text-sm text-muted-foreground">策略编辑、管理与版本控制</p>
        </div>
        <div className="flex gap-2">
          <button
            className={secondaryButtonClass}
            onClick={() => setImportModalOpen(true)}
          >
            导入策略
          </button>
          <button
            className={primaryButtonClass}
            onClick={() => setCreateModalOpen(true)}
          >
            <Plus size={16} />
            新建策略
          </button>
        </div>
      </div>

      <TabPanel tabs={TAB_OPTIONS} activeTab={tab} onChange={(key) => setTab(key as TabKey)}>
        {tab === 'list' && (
          <div className="space-y-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:flex-nowrap">
              <div className="relative min-w-0 md:flex-1">
                <Search
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                />
                <input
                  type="text"
                  className={searchInputClass}
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="🔍 搜索策略名称..."
                />
              </div>
              <select
                className={`${inputClass} w-full md:w-auto md:min-w-[160px]`}
                value={typeFilter}
                onChange={(event) => setTypeFilter(event.target.value)}
              >
                <option>{ALL_TYPE}</option>
                <option>CTA</option>
                <option>Custom</option>
                <option>AI</option>
              </select>
              <select
                className={`${inputClass} w-full md:w-auto md:min-w-[160px]`}
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
              >
                <option>{ALL_STATUS}</option>
                <option>active</option>
                <option>draft</option>
              </select>
            </div>

            <div className="overflow-hidden rounded-lg border border-border bg-card">
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-muted/40">
                    <tr className="border-b border-border">
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">名称</th>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">类型</th>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">描述</th>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">版本</th>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">来源</th>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">状态</th>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr>
                        <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                          正在加载策略列表...
                        </td>
                      </tr>
                    ) : filteredStrategies.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                          暂无匹配的策略
                        </td>
                      </tr>
                    ) : (
                      filteredStrategies.map((strategy) => (
                        <tr key={strategy.id} className="border-b border-border/60 last:border-b-0">
                          <td className="px-4 py-3 align-top">
                            <div className="font-semibold text-foreground">{strategy.name}</div>
                          </td>
                          <td className="px-4 py-3 align-top">
                            <Badge variant="primary">{inferType(strategy)}</Badge>
                          </td>
                          <td className="px-4 py-3 align-top text-muted-foreground">
                            {strategy.description || '—'}
                          </td>
                          <td className="px-4 py-3 align-top">v{strategy.version}</td>
                          <td className="px-4 py-3 align-top">
                            {selectedBuiltin.has(strategy.name) ? '内置' : '自建'}
                          </td>
                          <td className="px-4 py-3 align-top">
                            <Badge variant={strategy.is_active ? 'success' : 'muted'}>
                              {strategy.is_active ? 'active' : 'draft'}
                            </Badge>
                          </td>
                          <td className="px-4 py-3 align-top">
                            <div className="flex flex-wrap gap-1">
                              <button
                                className={ghostButtonClass}
                                onClick={() => void openEditorForStrategy(strategy.id)}
                              >
                                编辑
                              </button>
                              <button className={ghostButtonClass} onClick={() => navigate('/backtest')}>
                                回测
                              </button>
                              <button
                                className={ghostButtonClass}
                                onClick={() => void handleCopyStrategy(strategy.id)}
                              >
                                复制
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {tab === 'editor' && (
          <div className="space-y-4">
            <div className="rounded-lg border border-border bg-card p-5">
              <div className="mb-4 flex items-center justify-between gap-3 flex-wrap">
                <h3 className="font-semibold text-card-foreground">代码编辑器 — {activeTitle}</h3>
                <div className="flex gap-2 flex-wrap">
                  <button
                    className={ghostButtonClass}
                    onClick={() => {
                      setDraft((prev) => (prev ? { ...prev, code: normalizeCode(prev.code) } : prev))
                      showToast('代码已格式化', 'success')
                    }}
                  >
                    格式化
                  </button>
                  <button
                    className={ghostButtonClass}
                    onClick={() => activeDraft && void validateCode(activeDraft.code)}
                  >
                    验证语法
                  </button>
                  <button className={primaryButtonClass} onClick={() => void saveDraft()}>
                    <Save size={14} />
                    {saving ? '保存中...' : '保存'}
                  </button>
                </div>
              </div>

              <textarea
                className="w-full min-h-[400px] rounded-lg border border-input bg-muted/40 p-4 font-mono text-sm leading-relaxed text-foreground resize-y focus:border-primary focus:ring-primary"
                value={activeDraft?.code || DEFAULT_CODE}
                onChange={(event) =>
                  setDraft((prev) =>
                    prev
                      ? { ...prev, code: event.target.value }
                      : {
                          ...emptyDraft(),
                          code: event.target.value,
                        }
                  )
                }
                spellCheck={false}
              />

              <div className="mt-3 flex items-center gap-3 flex-wrap">
                <Badge variant={validation.ok === false ? 'warning' : 'success'}>
                  {validation.ok === false ? '语法待修复' : '语法正确'}
                </Badge>
                <span className="text-[13px] text-muted-foreground">
                  Python 3.11 · 最后修改 {validationTimestamp}
                </span>
              </div>
            </div>

            <div className="rounded-lg border border-border bg-card p-5">
              <div className="mb-4 flex items-center justify-between gap-3">
                <h3 className="font-semibold text-card-foreground">策略参数</h3>
                <span className="text-xs text-muted-foreground">自动从 JSON 参数提取数值字段</span>
              </div>
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                {parameterRows.map((row) => (
                  <div key={row.key}>
                    <label className={labelClass}>{row.label}</label>
                    <input
                      type="number"
                      className={inputClass}
                      value={row.value}
                      step={row.step}
                      onChange={(event) => {
                        const value = Number(event.target.value)
                        setDraft((prev) =>
                          prev
                            ? { ...prev, parametersText: updateParameterValue(prev.parametersText, row.key, value) }
                            : {
                                ...emptyDraft(),
                                parametersText: updateParameterValue(JSON.stringify(DEFAULT_PARAMETERS, null, 2), row.key, value),
                              }
                        )
                      }}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {tab === 'versions' && (
          <div className="rounded-lg border border-border bg-card p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h3 className="font-semibold text-card-foreground">版本历史 — {versionTitle}</h3>
            </div>
            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="min-w-full text-sm">
                <thead className="bg-muted/40">
                  <tr className="border-b border-border">
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">版本</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">时间</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">提交者</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">说明</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {history.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                        暂无版本历史
                      </td>
                    </tr>
                  ) : (
                    history.map((entry, index) => (
                      <tr key={entry.id} className="border-b border-border/60 last:border-b-0">
                        <td className="px-4 py-3">
                          <Badge variant={index === 0 ? 'primary' : 'muted'}>
                            v{entry.version || entry.id}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">{formatDateTime(entry.created_at)}</td>
                        <td className="px-4 py-3">{user?.username || 'demo_user'}</td>
                        <td className="px-4 py-3">{historyNote(index)}</td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-1">
                            <button
                              className={ghostButtonClass}
                              onClick={() => void previewHistory(entry)}
                            >
                              查看
                            </button>
                            <button className={ghostButtonClass} onClick={() => restoreHistory(entry)}>
                              回滚
                            </button>
                            {index > 0 && (
                              <button
                                className={ghostButtonClass}
                                onClick={() =>
                                  showToast(`显示 v${history[0]?.version || history[0]?.id} 与 v${entry.version || entry.id} 差异`, 'info')
                                }
                              >
                                Diff
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {tab === 'templates' && (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {templates.map((template) => (
              <div key={template.key} className="rounded-lg border border-border bg-card p-5">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <h3 className="font-semibold text-card-foreground">{template.displayName}</h3>
                  <Badge variant={getTemplateCategoryVariant(template.category)}>{template.category}</Badge>
                </div>
                <p className="my-2 text-[13px] text-muted-foreground">{template.description}</p>
                <div className="flex gap-2">
                  <button className={primaryButtonClass} onClick={() => applyTemplate(template)}>
                    使用模板
                  </button>
                  <button className={ghostButtonClass} onClick={() => setTemplatePreview(template)}>
                    预览
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </TabPanel>

      <input ref={importRef} type="file" accept=".py" className="hidden" onChange={importStrategyFile} />

      {createModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center" onClick={() => setCreateModalOpen(false)}>
            <div className="bg-card border border-border rounded-lg w-full max-w-[560px] max-h-[85vh] overflow-y-auto shadow-lg" onClick={(event) => event.stopPropagation()}>
              <div className="px-5 py-4 border-b border-border flex items-center justify-between">
                <h3 className="font-semibold">新建策略</h3>
                <button className="p-2 rounded hover:bg-muted" onClick={() => setCreateModalOpen(false)}>
                  <X size={16} />
                </button>
              </div>
              <div className="p-5">
                <div className="flex flex-col gap-4">
                  <div>
                    <label className={labelClass}>策略名称</label>
                    <input
                      className={inputClass}
                      value={createForm.name}
                      onChange={(event) => setCreateForm((prev) => ({ ...prev, name: event.target.value }))}
                      placeholder="例如: MyStrategy_v1"
                    />
                  </div>
                  <div>
                    <label className={labelClass}>策略类型</label>
                    <select
                      className={inputClass}
                      value={createForm.strategyType}
                      onChange={(event) => setCreateForm((prev) => ({ ...prev, strategyType: event.target.value }))}
                    >
                      <option>CTA</option>
                      <option>Alpha</option>
                      <option>套利</option>
                      <option>自定义</option>
                    </select>
                  </div>
                  <div>
                    <label className={labelClass}>描述</label>
                    <textarea
                      className={textareaClass}
                      rows={3}
                      value={createForm.description}
                      onChange={(event) => setCreateForm((prev) => ({ ...prev, description: event.target.value }))}
                      placeholder="策略简要说明..."
                    />
                  </div>
                  <div>
                    <label className={labelClass}>基于模板</label>
                    <select
                      className={inputClass}
                      value={createForm.templateKey}
                      onChange={(event) => setCreateForm((prev) => ({ ...prev, templateKey: event.target.value }))}
                    >
                      <option value="blank">空白策略</option>
                      {templates.map((template) => (
                        <option key={template.key} value={template.key}>
                          {template.displayName}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
              <div className="px-4 py-3 border-t border-border flex justify-end gap-2">
                <button className="px-3 py-1.5 text-sm rounded-md border border-border hover:bg-muted" onClick={() => setCreateModalOpen(false)}>
                  取消
                </button>
                <button className="px-3 py-1.5 text-sm rounded-md bg-primary text-white hover:opacity-90" onClick={handleCreateStrategy}>
                  创建
                </button>
              </div>
            </div>
          </div>
        )}

        {importModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center" onClick={() => setImportModalOpen(false)}>
            <div className="bg-card border border-border rounded-lg w-full max-w-[480px] max-h-[85vh] overflow-y-auto shadow-lg" onClick={(event) => event.stopPropagation()}>
              <div className="px-5 py-4 border-b border-border flex items-center justify-between">
                <h3 className="font-semibold">导入策略</h3>
                <button className="p-2 rounded hover:bg-muted" onClick={() => setImportModalOpen(false)}>
                  <X size={16} />
                </button>
              </div>
              <div className="p-5">
                <div className="border-2 border-dashed border-border rounded-lg p-10 text-center text-muted-foreground">
                  <p className="text-sm">将 .py 文件拖拽到此处，或点击上传</p>
                  <button className="px-3 py-1.5 text-sm rounded-md border border-border mt-3" onClick={() => importRef.current?.click()}>
                    <Upload size={16} />
                    选择文件
                  </button>
                </div>
                <p className="text-xs text-muted-foreground mt-2">支持 Python (.py) 格式，最大 500KB</p>
              </div>
              <div className="px-4 py-3 border-t border-border flex justify-end gap-2">
                <button className="px-3 py-1.5 text-sm rounded-md border border-border" onClick={() => setImportModalOpen(false)}>
                  取消
                </button>
                <button className="px-3 py-1.5 text-sm rounded-md bg-primary text-white hover:opacity-90" onClick={() => importRef.current?.click()}>
                  导入
                </button>
              </div>
            </div>
          </div>
        )}

        {templatePreview && (
          <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center" onClick={() => setTemplatePreview(null)}>
            <div className="bg-card border border-border rounded-lg w-full max-w-[900px] max-h-[85vh] overflow-y-auto shadow-lg" onClick={(event) => event.stopPropagation()}>
              <div className="px-5 py-4 border-b border-border flex items-center justify-between">
                <h3 className="font-semibold">{templatePreview.displayName}</h3>
                <button className="p-2 rounded hover:bg-muted" onClick={() => setTemplatePreview(null)}>
                  <X size={16} />
                </button>
              </div>
              <div className="p-5">
                <pre className="bg-muted p-4 rounded font-mono text-sm overflow-x-auto">{templatePreview.code}</pre>
              </div>
            </div>
          </div>
        )}

        {historyPreview && (
          <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center" onClick={() => setHistoryPreview(null)}>
            <div className="bg-card border border-border rounded-lg w-full max-w-[900px] max-h-[85vh] overflow-y-auto shadow-lg" onClick={(event) => event.stopPropagation()}>
              <div className="px-5 py-4 border-b border-border flex items-center justify-between">
                <h3 className="font-semibold">版本历史 — {historyPreview.title}</h3>
                <button className="p-2 rounded hover:bg-muted" onClick={() => setHistoryPreview(null)}>
                  <X size={16} />
                </button>
              </div>
              <div className="bg-muted border-t border-border p-4"><pre>{historyPreview.parameters}</pre></div>
              <div className="p-5"><pre className="bg-muted p-4 rounded font-mono text-sm overflow-x-auto">{historyPreview.code}</pre></div>
            </div>
          </div>
        )}

        {toast && (
          <div className="fixed top-5 right-5 z-50 flex flex-col gap-2 pointer-events-none">
            <div className="pointer-events-auto px-4 py-2 rounded shadow flex items-center gap-2 max-w-xs">
              <span>{getToastIcon(toast.type)}</span>
              <span>{toast.message}</span>
            </div>
          </div>
        )}

        {confirmState && (
          <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center" onClick={() => setConfirmState(null)}>
            <div className="bg-card border border-border rounded-lg w-full max-w-[420px] p-5 shadow-lg" onClick={(event) => event.stopPropagation()}>
              <h4 className="text-lg font-semibold">确认操作</h4>
              <p className="mt-2 text-sm">{confirmState.message}</p>
              <div className="mt-4 flex justify-end gap-2">
                <button className="px-2 py-1 text-sm rounded border border-border" onClick={() => setConfirmState(null)}>
                  取消
                </button>
                <button
                  className="px-2.5 py-1 text-sm rounded bg-primary text-white hover:opacity-90"
                  onClick={() => {
                    confirmState.onConfirm()
                    setConfirmState(null)
                  }}
                >
                  确认
                </button>
              </div>
            </div>
          </div>
        )}
    </div>
  )
}
