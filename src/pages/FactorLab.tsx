import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  GitCompare,
  Library,
  LineChart as LineChartIcon,
  Pickaxe,
  Plus,
  Trash2,
  TrendingUp,
} from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import Badge from '../components/ui/Badge'
import DataTable, { type Column } from '../components/ui/DataTable'
import FilterBar from '../components/ui/FilterBar'
import Modal from '../components/ui/Modal'
import TabPanel from '../components/ui/TabPanel'
import { showToast } from '../components/ui/toast-service'
import { factorAPI, strategiesAPI } from '../lib/api'

interface Factor {
  id: number
  name: string
  category: string
  expression: string
  description?: string
  status: string
  ic_mean?: number
  ic_ir?: number
  turnover?: number
  created_at?: string
}

interface Evaluation {
  id: number
  factor_id: number
  start_date: string
  end_date: string
  ic_mean: number
  ic_std?: number
  ic_ir: number
  turnover: number
  long_ret: number
  short_ret: number
  long_short_ret: number
  created_at: string
}

interface MiningResult {
  factor_name: string
  factor_set: string
  ic_mean: number
  ic_std: number
  ic_ir: number
  turnover: number
  long_ret: number
  short_ret: number
  long_short_ret: number
}

interface CombineFactor {
  factor_id?: number
  factor_name: string
  expression: string
  weight: number
  direction: number
  factor_set: string
}

export default function FactorLab() {
  const { t } = useTranslation('social')
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState('library')
  const [newFactorModal, setNewFactorModal] = useState(false)
  const [search, setSearch] = useState('')

  // Form state for create modal
  const [formName, setFormName] = useState('')
  const [formCategory, setFormCategory] = useState('custom')
  const [formExpression, setFormExpression] = useState('')

  // ICIR tab state
  const [selectedFactorId, setSelectedFactorId] = useState<number | null>(null)
  const [evalStartDate, setEvalStartDate] = useState('2023-01-01')
  const [evalEndDate, setEvalEndDate] = useState('2024-12-31')

  // Mining tab state
  const [miningStart, setMiningStart] = useState('2023-01-01')
  const [miningEnd, setMiningEnd] = useState('2024-12-31')
  const [miningInstruments, setMiningInstruments] = useState('csi300')
  const [miningResults, setMiningResults] = useState<MiningResult[]>([])

  // Combine tab state
  const [combineFactors, setCombineFactors] = useState<CombineFactor[]>([])
  const [combineStrategyName, setCombineStrategyName] = useState('')
  const [combineClassName, setCombineClassName] = useState('')
  const [generatedCode, setGeneratedCode] = useState('')

  const tabs = [
    { key: 'library', label: t('factorLab.tabs.library'), icon: <Library size={16} /> },
    { key: 'icir', label: t('factorLab.tabs.icir'), icon: <LineChartIcon size={16} /> },
    { key: 'mining', label: t('factorLab.tabs.mining'), icon: <Pickaxe size={16} /> },
    { key: 'combine', label: t('factorLab.tabs.combine'), icon: <GitCompare size={16} /> },
    { key: 'backtest', label: t('factorLab.tabs.backtest'), icon: <TrendingUp size={16} /> },
  ]

  // ── Queries ──

  const { data: factors = [] } = useQuery<Factor[]>({
    queryKey: ['factors'],
    queryFn: () =>
      factorAPI.list().then((r) => {
        const d = r.data
        return Array.isArray(d) ? d : d?.data ?? []
      }),
  })

  const { data: evaluations = [] } = useQuery<Evaluation[]>({
    queryKey: ['evaluations', selectedFactorId],
    queryFn: () =>
      selectedFactorId
        ? factorAPI.listEvaluations(selectedFactorId).then((r) => r.data ?? [])
        : Promise.resolve([]),
    enabled: !!selectedFactorId,
  })

  // ── Mutations ──

  const createMutation = useMutation({
    mutationFn: (data: { name: string; category: string; expression: string }) => factorAPI.create(data),
    onSuccess: () => {
      showToast(t('factorLab.created'), 'success')
      setNewFactorModal(false)
      setFormName('')
      setFormExpression('')
      queryClient.invalidateQueries({ queryKey: ['factors'] })
    },
    onError: () => showToast(t('factorLab.createFailed'), 'error'),
  })

  const evalMutation = useMutation({
    mutationFn: (data: { factorId: number; start_date: string; end_date: string }) =>
      factorAPI.runEvaluation(data.factorId, { start_date: data.start_date, end_date: data.end_date }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['evaluations', selectedFactorId] })
    },
    onError: () => showToast('Evaluation failed', 'error'),
  })

  const miningMutation = useMutation({
    mutationFn: (data: { start_date: string; end_date: string; instruments: string }) =>
      factorAPI.runMining(data),
    onSuccess: (res) => {
      const results = res.data?.results ?? []
      setMiningResults(results)
      showToast(t('factorLab.mining.resultCount', { count: results.length }), 'success')
    },
    onError: () => showToast('Mining failed', 'error'),
  })

  const generateCodeMutation = useMutation({
    mutationFn: (data: Parameters<typeof strategiesAPI.generateMultiFactorCode>[0]) =>
      strategiesAPI.generateMultiFactorCode(data),
    onSuccess: (res) => {
      setGeneratedCode(res.data?.code ?? '')
    },
    onError: () => showToast('Code generation failed', 'error'),
  })

  const createStrategyMutation = useMutation({
    mutationFn: (data: Parameters<typeof strategiesAPI.createMultiFactor>[0]) =>
      strategiesAPI.createMultiFactor(data),
    onSuccess: () => {
      showToast('Multi-factor strategy created', 'success')
      setCombineFactors([])
      setCombineStrategyName('')
      setCombineClassName('')
      setGeneratedCode('')
    },
    onError: () => showToast('Strategy creation failed', 'error'),
  })

  // ── Helpers ──

  const filtered = factors.filter(
    (factor) => !search || factor.name?.includes(search) || factor.category?.includes(search)
  )

  const selectedFactor = factors.find((f) => f.id === selectedFactorId)

  const addFactorToCombine = (factor: Factor) => {
    if (combineFactors.some((cf) => cf.factor_id === factor.id)) return
    setCombineFactors((prev) => [
      ...prev,
      {
        factor_id: factor.id,
        factor_name: factor.name,
        expression: factor.expression || '',
        weight: 1.0,
        direction: 1,
        factor_set: 'custom',
      },
    ])
  }

  const removeFromCombine = (idx: number) => {
    setCombineFactors((prev) => prev.filter((_, i) => i !== idx))
  }

  // ── Column definitions ──

  const factorCols: Column<Factor>[] = [
    {
      key: 'name',
      label: t('factorLab.columns.name'),
      render: (factor) => (
        <span
          className="font-medium cursor-pointer text-primary hover:underline"
          onClick={() => {
            setSelectedFactorId(factor.id)
            setActiveTab('icir')
          }}
        >
          {factor.name}
        </span>
      ),
    },
    {
      key: 'category',
      label: t('factorLab.columns.category'),
      render: (factor) => <Badge variant="primary">{factor.category || '-'}</Badge>,
    },
    {
      key: 'expression',
      label: t('factorLab.columns.expression'),
      render: (factor) => (
        <span className="font-mono text-xs text-muted-foreground truncate max-w-[200px] inline-block">
          {factor.expression || '-'}
        </span>
      ),
    },
    {
      key: 'status',
      label: t('factorLab.columns.status'),
      render: (factor) => (
        <Badge variant={factor.status === 'validated' ? 'success' : 'warning'}>
          {factor.status === 'validated' ? t('factorLab.status.active') : t('factorLab.status.testing')}
        </Badge>
      ),
    },
    {
      key: 'actions' as keyof Factor,
      label: '',
      render: (factor) => (
        <button
          className="text-xs px-2 py-1 rounded bg-primary/10 text-primary hover:bg-primary/20"
          onClick={() => addFactorToCombine(factor)}
        >
          + {t('factorLab.tabs.combine')}
        </button>
      ),
    },
  ]

  const evalCols: Column<Evaluation>[] = [
    { key: 'start_date', label: t('factorLab.evaluation.startDate') },
    { key: 'end_date', label: t('factorLab.evaluation.endDate') },
    {
      key: 'ic_mean',
      label: t('factorLab.columns.ic'),
      render: (e) => (
        <span className={e.ic_mean >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-500'}>
          {e.ic_mean?.toFixed(4) ?? '-'}
        </span>
      ),
    },
    {
      key: 'ic_ir',
      label: t('factorLab.columns.icir'),
      render: (e) => (
        <span className={e.ic_ir >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-500'}>
          {e.ic_ir?.toFixed(3) ?? '-'}
        </span>
      ),
    },
    {
      key: 'long_short_ret',
      label: t('factorLab.columns.longShortRet'),
      render: (e) => (
        <span className={e.long_short_ret >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-500'}>
          {e.long_short_ret != null ? `${(e.long_short_ret * 100).toFixed(2)}%` : '-'}
        </span>
      ),
    },
    {
      key: 'turnover',
      label: t('factorLab.columns.turnover'),
      render: (e) => (e.turnover != null ? `${(e.turnover * 100).toFixed(1)}%` : '-'),
    },
    { key: 'created_at', label: 'Date', render: (e) => e.created_at?.slice(0, 10) ?? '-' },
  ]

  const miningCols: Column<MiningResult>[] = [
    { key: 'factor_name', label: t('factorLab.columns.name') },
    { key: 'factor_set', label: t('factorLab.columns.factorSet') },
    {
      key: 'ic_mean',
      label: t('factorLab.columns.ic'),
      render: (r) => (
        <span className={r.ic_mean >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-500'}>
          {r.ic_mean?.toFixed(4)}
        </span>
      ),
    },
    {
      key: 'ic_ir',
      label: t('factorLab.columns.icir'),
      render: (r) => r.ic_ir?.toFixed(3),
    },
    {
      key: 'long_short_ret',
      label: t('factorLab.columns.longShortRet'),
      render: (r) =>
        r.long_short_ret != null ? `${(r.long_short_ret * 100).toFixed(2)}%` : '-',
    },
    {
      key: 'turnover',
      label: t('factorLab.columns.turnover'),
      render: (r) => (r.turnover != null ? `${(r.turnover * 100).toFixed(1)}%` : '-'),
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t('factorLab.title')}</h1>
          <p className="text-sm text-muted-foreground">{t('factorLab.subtitle')}</p>
        </div>
        <button
          onClick={() => setNewFactorModal(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md bg-primary text-white hover:opacity-90"
        >
          <Plus size={16} />
          {t('factorLab.newFactor')}
        </button>
      </div>

      <TabPanel tabs={tabs} activeTab={activeTab} onChange={setActiveTab}>
        {/* ── Library Tab ── */}
        {activeTab === 'library' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <FilterBar
                searchValue={search}
                onSearchChange={setSearch}
                searchPlaceholder={t('factorLab.search')}
              />
              <div className="text-sm text-muted-foreground">
                {t('factorLab.total', { count: filtered.length })}
              </div>
            </div>
            <DataTable columns={factorCols} data={filtered} emptyText={t('factorLab.empty.library')} />
          </div>
        )}

        {/* ── ICIR Tab ── */}
        {activeTab === 'icir' && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">{t('factorLab.evaluation.title')}</h3>

            {/* Factor selector */}
            <div className="flex items-end gap-3 flex-wrap">
              <div>
                <label className="block text-xs font-medium mb-1">{t('factorLab.columns.name')}</label>
                <select
                  value={selectedFactorId ?? ''}
                  onChange={(e) => setSelectedFactorId(e.target.value ? Number(e.target.value) : null)}
                  className="px-3 py-2 text-sm rounded-md border border-border bg-background min-w-[180px]"
                >
                  <option value="">--</option>
                  {factors.map((f) => (
                    <option key={f.id} value={f.id}>{f.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">{t('factorLab.evaluation.startDate')}</label>
                <input type="date" value={evalStartDate} onChange={(e) => setEvalStartDate(e.target.value)}
                  className="px-3 py-2 text-sm rounded-md border border-border bg-background" />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">{t('factorLab.evaluation.endDate')}</label>
                <input type="date" value={evalEndDate} onChange={(e) => setEvalEndDate(e.target.value)}
                  className="px-3 py-2 text-sm rounded-md border border-border bg-background" />
              </div>
              <button
                disabled={!selectedFactorId || evalMutation.isPending}
                onClick={() => selectedFactorId && evalMutation.mutate({ factorId: selectedFactorId, start_date: evalStartDate, end_date: evalEndDate })}
                className="px-4 py-2 text-sm rounded-md bg-primary text-white hover:opacity-90 disabled:opacity-50"
              >
                {evalMutation.isPending ? t('factorLab.evaluation.running') : t('factorLab.evaluation.run')}
              </button>
            </div>

            {selectedFactor && (
              <div className="p-3 rounded-md bg-muted/50 text-sm">
                <span className="font-medium">{selectedFactor.name}</span>
                <span className="ml-3 font-mono text-xs text-muted-foreground">{selectedFactor.expression}</span>
              </div>
            )}

            {selectedFactorId ? (
              <DataTable columns={evalCols} data={evaluations} emptyText={t('factorLab.evaluation.noEvaluations')} />
            ) : (
              <p className="text-center text-muted-foreground py-8">{t('factorLab.empty.icir')}</p>
            )}
          </div>
        )}

        {/* ── Mining Tab ── */}
        {activeTab === 'mining' && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">{t('factorLab.mining.title')}</h3>
            <p className="text-sm text-muted-foreground">{t('factorLab.mining.description')}</p>

            <div className="flex items-end gap-3 flex-wrap">
              <div>
                <label className="block text-xs font-medium mb-1">{t('factorLab.mining.instruments')}</label>
                <input value={miningInstruments} onChange={(e) => setMiningInstruments(e.target.value)}
                  className="px-3 py-2 text-sm rounded-md border border-border bg-background w-32" />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">{t('factorLab.mining.startDate')}</label>
                <input type="date" value={miningStart} onChange={(e) => setMiningStart(e.target.value)}
                  className="px-3 py-2 text-sm rounded-md border border-border bg-background" />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">{t('factorLab.mining.endDate')}</label>
                <input type="date" value={miningEnd} onChange={(e) => setMiningEnd(e.target.value)}
                  className="px-3 py-2 text-sm rounded-md border border-border bg-background" />
              </div>
              <button
                disabled={miningMutation.isPending}
                onClick={() => miningMutation.mutate({ start_date: miningStart, end_date: miningEnd, instruments: miningInstruments })}
                className="px-4 py-2 text-sm rounded-md bg-primary text-white hover:opacity-90 disabled:opacity-50"
              >
                {miningMutation.isPending ? t('factorLab.mining.running') : t('factorLab.mining.run')}
              </button>
            </div>

            {miningResults.length > 0 ? (
              <>
                <div className="text-sm text-muted-foreground">
                  {t('factorLab.mining.resultCount', { count: miningResults.length })}
                </div>
                <DataTable columns={miningCols} data={miningResults} emptyText="" />
              </>
            ) : (
              <p className="text-center text-muted-foreground py-8">{t('factorLab.empty.mining')}</p>
            )}
          </div>
        )}

        {/* ── Combine Tab ── */}
        {activeTab === 'combine' && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">{t('factorLab.combine.title')}</h3>
            <p className="text-sm text-muted-foreground">{t('factorLab.combine.description')}</p>

            {combineFactors.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">{t('factorLab.combine.noFactors')}</p>
            ) : (
              <div className="space-y-2">
                {combineFactors.map((cf, idx) => (
                  <div key={idx} className="flex items-center gap-3 p-2 rounded-md bg-muted/30 border border-border">
                    <span className="font-medium text-sm w-40 truncate">{cf.factor_name}</span>
                    <div className="flex items-center gap-1">
                      <label className="text-xs text-muted-foreground">{t('factorLab.combine.weight')}</label>
                      <input type="number" step="0.1" value={cf.weight}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value) || 0
                          setCombineFactors((prev) => prev.map((f, i) => i === idx ? { ...f, weight: val } : f))
                        }}
                        className="w-20 px-2 py-1 text-sm rounded border border-border bg-background" />
                    </div>
                    <div className="flex items-center gap-1">
                      <label className="text-xs text-muted-foreground">{t('factorLab.combine.direction')}</label>
                      <select value={cf.direction}
                        onChange={(e) => {
                          const val = parseInt(e.target.value)
                          setCombineFactors((prev) => prev.map((f, i) => i === idx ? { ...f, direction: val } : f))
                        }}
                        className="px-2 py-1 text-sm rounded border border-border bg-background">
                        <option value={1}>{t('factorLab.combine.long')}</option>
                        <option value={-1}>{t('factorLab.combine.short')}</option>
                      </select>
                    </div>
                    <button onClick={() => removeFromCombine(idx)} className="ml-auto text-red-500 hover:text-red-700">
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {combineFactors.length > 0 && (
              <div className="flex items-end gap-3 flex-wrap pt-2">
                <div>
                  <label className="block text-xs font-medium mb-1">{t('factorLab.combine.strategyName')}</label>
                  <input value={combineStrategyName} onChange={(e) => setCombineStrategyName(e.target.value)}
                    placeholder="My Multi-Factor Strategy"
                    className="px-3 py-2 text-sm rounded-md border border-border bg-background w-56" />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">{t('factorLab.combine.className')}</label>
                  <input value={combineClassName} onChange={(e) => setCombineClassName(e.target.value)}
                    placeholder="MultiFactorStrategy"
                    className="px-3 py-2 text-sm rounded-md border border-border bg-background w-48" />
                </div>
                <button
                  disabled={!combineClassName || generateCodeMutation.isPending}
                  onClick={() =>
                    generateCodeMutation.mutate({
                      name: combineStrategyName || combineClassName,
                      class_name: combineClassName,
                      factors: combineFactors,
                    })
                  }
                  className="px-4 py-2 text-sm rounded-md border border-primary text-primary hover:bg-primary/10 disabled:opacity-50"
                >
                  {t('factorLab.combine.generateCode')}
                </button>
                <button
                  disabled={!combineClassName || !combineStrategyName || createStrategyMutation.isPending}
                  onClick={() =>
                    createStrategyMutation.mutate({
                      name: combineStrategyName,
                      class_name: combineClassName,
                      factors: combineFactors,
                    })
                  }
                  className="px-4 py-2 text-sm rounded-md bg-primary text-white hover:opacity-90 disabled:opacity-50"
                >
                  {t('factorLab.combine.createStrategy')}
                </button>
              </div>
            )}

            {generatedCode && (
              <div className="mt-4">
                <h4 className="text-sm font-medium mb-2">Generated Code</h4>
                <pre className="p-4 rounded-md bg-muted overflow-auto text-xs max-h-[400px] border border-border">
                  <code>{generatedCode}</code>
                </pre>
              </div>
            )}
          </div>
        )}

        {/* ── Backtest Tab ── */}
        {activeTab === 'backtest' && (
          <p className="text-center text-muted-foreground py-8">{t('factorLab.empty.backtest')}</p>
        )}
      </TabPanel>

      {/* ── Create Factor Modal ── */}
      <Modal
        open={newFactorModal}
        onClose={() => setNewFactorModal(false)}
        title={t('factorLab.modal.title')}
        footer={
          <>
            <button
              onClick={() => setNewFactorModal(false)}
              className="px-4 py-2 text-sm rounded-md border border-border hover:bg-muted"
            >
              {t('factorLab.modal.cancel')}
            </button>
            <button
              disabled={!formName.trim() || createMutation.isPending}
              onClick={() =>
                createMutation.mutate({
                  name: formName,
                  category: formCategory,
                  expression: formExpression,
                })
              }
              className="px-4 py-2 text-sm rounded-md bg-primary text-white hover:opacity-90 disabled:opacity-50"
            >
              {t('factorLab.modal.submit')}
            </button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">{t('factorLab.modal.name')}</label>
            <input
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-md border border-border bg-background"
              placeholder={t('factorLab.modal.namePlaceholder')}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">{t('factorLab.modal.category')}</label>
              <select
                value={formCategory}
                onChange={(e) => setFormCategory(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-md border border-border bg-background"
              >
                <option value="technical">{t('factorLab.modal.technical')}</option>
                <option value="fundamental">{t('factorLab.modal.fundamental')}</option>
                <option value="style">{t('factorLab.modal.style')}</option>
                <option value="custom">{t('factorLab.modal.customCategory')}</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">{t('factorLab.modal.frequency')}</label>
              <select className="w-full px-3 py-2 text-sm rounded-md border border-border bg-background">
                <option>{t('factorLab.modal.daily')}</option>
                <option>{t('factorLab.modal.weekly')}</option>
                <option>{t('factorLab.modal.monthly')}</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">{t('factorLab.modal.formula')}</label>
            <textarea
              value={formExpression}
              onChange={(e) => setFormExpression(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-md border border-border bg-background min-h-[120px] font-mono"
              placeholder="e.g. close / delay(close, 20) - 1"
            />
          </div>
        </div>
      </Modal>
    </div>
  )
}
