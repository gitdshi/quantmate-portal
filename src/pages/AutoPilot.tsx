import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Bot,
  ChevronRight,
  Database,
  Download,
  Loader2,
  Play,
  Square,
  TrendingUp,
} from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import Badge, { type BadgeVariant } from '../components/ui/Badge'
import DataTable, { type Column } from '../components/ui/DataTable'
import TabPanel from '../components/ui/TabPanel'
import { showToast } from '../components/ui/toast-service'
import { rdagentAPI } from '../lib/api'

interface MiningRun {
  run_id: string
  scenario: string
  status: string
  current_iteration: number
  total_iterations: number
  created_at: string
  completed_at?: string
}

interface Iteration {
  id: number
  run_id: string
  iteration_number: number
  hypothesis?: string
  experiment_code?: string
  metrics?: Record<string, number>
  feedback?: string
  status: string
  created_at: string
}

interface DiscoveredFactor {
  id: number
  run_id: string
  factor_name: string
  expression: string
  description?: string
  ic_mean?: number
  icir?: number
  sharpe?: number
  status: string
  created_at: string
}

interface CatalogSummary {
  categories: Record<string, string[]>
  total_fields: number
  sources: string[]
}

function badgeVariantForStatus(status: string): BadgeVariant {
  switch (status) {
    case 'completed':
    case 'imported':
      return 'success'
    case 'failed':
      return 'destructive'
    case 'running':
      return 'primary'
    case 'cancelled':
      return 'muted'
    default:
      return 'warning'
  }
}

export default function AutoPilot() {
  const { t, i18n } = useTranslation(['social', 'common'])
  const queryClient = useQueryClient()
  const currentLanguage = i18n.resolvedLanguage ?? i18n.language

  const [activeTab, setActiveTab] = useState('runs')
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null)
  const [scenario, setScenario] = useState('fin_factor')
  const [maxIterations, setMaxIterations] = useState(10)
  const [llmModel, setLlmModel] = useState('gpt-4o-mini')
  const [universe, setUniverse] = useState('csi300')
  const [startDate, setStartDate] = useState('2018-01-01')
  const [endDate, setEndDate] = useState('2024-12-31')

  const tabs = [
    { key: 'runs', label: t('autoPilot.tabs.runs', { ns: 'social' }), icon: <Bot className="h-4 w-4" /> },
    { key: 'catalog', label: t('autoPilot.tabs.catalog', { ns: 'social' }), icon: <Database className="h-4 w-4" /> },
  ]

  const formatDateTime = (value?: string) => {
    if (!value) {
      return '--'
    }

    const date = new Date(value)
    if (Number.isNaN(date.getTime())) {
      return value
    }

    return new Intl.DateTimeFormat(currentLanguage.startsWith('zh') ? 'zh-CN' : 'en-US', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(date)
  }

  const formatStatus = (status: string) =>
    t(`autoPilot.status.${status}`, { ns: 'social', defaultValue: status })

  const { data: runsData = [], isLoading: runsLoading } = useQuery<MiningRun[]>({
    queryKey: ['rdagent-runs'],
    queryFn: async () => {
      const response = await rdagentAPI.listRuns({ limit: 50 })
      const payload = response.data as MiningRun[] | { items?: MiningRun[] }
      return Array.isArray(payload) ? payload : payload.items ?? []
    },
  })

  const { data: iterationsData = [], isLoading: iterationsLoading } = useQuery<Iteration[]>({
    queryKey: ['rdagent-iterations', selectedRunId],
    queryFn: async () => {
      const response = await rdagentAPI.getIterations(selectedRunId!)
      const payload = response.data as Iteration[] | { items?: Iteration[] }
      return Array.isArray(payload) ? payload : payload.items ?? []
    },
    enabled: !!selectedRunId,
  })

  const { data: discoveredData = [], isLoading: factorsLoading } = useQuery<DiscoveredFactor[]>({
    queryKey: ['rdagent-factors', selectedRunId],
    queryFn: async () => {
      const response = await rdagentAPI.getDiscoveredFactors(selectedRunId!)
      const payload = response.data as DiscoveredFactor[] | { items?: DiscoveredFactor[] }
      return Array.isArray(payload) ? payload : payload.items ?? []
    },
    enabled: !!selectedRunId,
  })

  const { data: catalogData, isLoading: catalogLoading } = useQuery<CatalogSummary>({
    queryKey: ['rdagent-catalog'],
    queryFn: async () => {
      const response = await rdagentAPI.getDataCatalog()
      return response.data as CatalogSummary
    },
    enabled: activeTab === 'catalog',
  })

  const startMining = useMutation({
    mutationFn: () =>
      rdagentAPI.startMining({
        scenario,
        max_iterations: maxIterations,
        llm_model: llmModel,
        universe,
        start_date: startDate,
        end_date: endDate,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['rdagent-runs'] })
      showToast(t('autoPilot.toasts.started', { ns: 'social' }), 'success')
    },
    onError: () => showToast(t('autoPilot.toasts.startFailed', { ns: 'social' }), 'error'),
  })

  const cancelRun = useMutation({
    mutationFn: (runId: string) => rdagentAPI.cancelRun(runId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['rdagent-runs'] })
      showToast(t('autoPilot.toasts.cancelled', { ns: 'social' }), 'success')
    },
    onError: () => showToast(t('autoPilot.toasts.cancelFailed', { ns: 'social' }), 'error'),
  })

  const importFactor = useMutation({
    mutationFn: ({ runId, factorId }: { runId: string; factorId: number }) =>
      rdagentAPI.importFactor(runId, factorId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['rdagent-factors', selectedRunId] })
      showToast(t('autoPilot.toasts.imported', { ns: 'social' }), 'success')
    },
    onError: () => showToast(t('autoPilot.toasts.importFailed', { ns: 'social' }), 'error'),
  })

  const runColumns: Column<MiningRun>[] = [
    {
      key: 'run_id',
      label: t('autoPilot.runs.columns.runId', { ns: 'social' }),
      render: (row) => (
        <button
          type="button"
          className="text-primary hover:underline text-xs font-mono"
          onClick={() => setSelectedRunId(row.run_id)}
        >
          {row.run_id.slice(0, 8)}...
        </button>
      ),
    },
    {
      key: 'scenario',
      label: t('autoPilot.runs.columns.scenario', { ns: 'social' }),
      render: (row) => t(`autoPilot.scenarios.${row.scenario}`, { ns: 'social', defaultValue: row.scenario }),
    },
    {
      key: 'status',
      label: t('autoPilot.runs.columns.status', { ns: 'social' }),
      render: (row) => <Badge variant={badgeVariantForStatus(row.status)}>{formatStatus(row.status)}</Badge>,
    },
    {
      key: 'current_iteration',
      label: t('autoPilot.runs.columns.progress', { ns: 'social' }),
      render: (row) => `${row.current_iteration}/${row.total_iterations}`,
    },
    {
      key: 'created_at',
      label: t('autoPilot.runs.columns.created', { ns: 'social' }),
      render: (row) => formatDateTime(row.created_at),
    },
    {
      key: 'actions',
      label: t('autoPilot.runs.columns.actions', { ns: 'social' }),
      render: (row) =>
        row.status === 'queued' || row.status === 'running' ? (
          <button
            type="button"
            className="inline-flex items-center rounded-md p-1 text-destructive hover:bg-destructive/10"
            aria-label={t('autoPilot.actions.cancelRun', { ns: 'social' })}
            onClick={() => cancelRun.mutate(row.run_id)}
          >
            <Square className="h-4 w-4" />
          </button>
        ) : null,
    },
  ]

  const factorColumns: Column<DiscoveredFactor>[] = [
    { key: 'factor_name', label: t('autoPilot.factors.columns.name', { ns: 'social' }) },
    { key: 'expression', label: t('autoPilot.factors.columns.expression', { ns: 'social' }) },
    {
      key: 'ic_mean',
      label: t('autoPilot.factors.columns.ic', { ns: 'social' }),
      render: (row) => row.ic_mean?.toFixed(4) ?? '-',
    },
    {
      key: 'icir',
      label: t('autoPilot.factors.columns.icir', { ns: 'social' }),
      render: (row) => row.icir?.toFixed(4) ?? '-',
    },
    {
      key: 'sharpe',
      label: t('autoPilot.factors.columns.sharpe', { ns: 'social' }),
      render: (row) => row.sharpe?.toFixed(4) ?? '-',
    },
    {
      key: 'status',
      label: t('autoPilot.factors.columns.status', { ns: 'social' }),
      render: (row) => <Badge variant={badgeVariantForStatus(row.status)}>{formatStatus(row.status)}</Badge>,
    },
    {
      key: 'actions',
      label: t('autoPilot.factors.columns.actions', { ns: 'social' }),
      render: (row) =>
        row.status !== 'imported' && selectedRunId ? (
          <button
            type="button"
            className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
            onClick={() => importFactor.mutate({ runId: selectedRunId, factorId: row.id })}
          >
            <Download className="h-3 w-3" />
            {t('autoPilot.actions.import', { ns: 'social' })}
          </button>
        ) : null,
    },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">{t('autoPilot.title', { ns: 'social' })}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t('autoPilot.subtitle', { ns: 'social' })}</p>
      </div>

      <TabPanel tabs={tabs} activeTab={activeTab} onChange={setActiveTab}>
        {activeTab === 'runs' && (
          <div className="space-y-6">
            <div className="rounded-lg border border-border bg-card p-6 space-y-4">
              <div>
                <h2 className="text-lg font-semibold flex items-center gap-2 text-card-foreground">
                  <Play className="h-5 w-5 text-primary" />
                  {t('autoPilot.start.title', { ns: 'social' })}
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">{t('autoPilot.start.description', { ns: 'social' })}</p>
              </div>

              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                <div>
                  <label className="mb-1 block text-sm font-medium">{t('autoPilot.fields.scenario', { ns: 'social' })}</label>
                  <select
                    value={scenario}
                    onChange={(event) => setScenario(event.target.value)}
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                  >
                    <option value="fin_factor">{t('autoPilot.scenarios.fin_factor', { ns: 'social' })}</option>
                    <option value="fin_model">{t('autoPilot.scenarios.fin_model', { ns: 'social' })}</option>
                    <option value="fin_quant">{t('autoPilot.scenarios.fin_quant', { ns: 'social' })}</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">{t('autoPilot.fields.maxIterations', { ns: 'social' })}</label>
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={maxIterations}
                    onChange={(event) => setMaxIterations(Number(event.target.value))}
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">{t('autoPilot.fields.llmModel', { ns: 'social' })}</label>
                  <select
                    value={llmModel}
                    onChange={(event) => setLlmModel(event.target.value)}
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                  >
                    <option value="gpt-4o-mini">GPT-4o Mini</option>
                    <option value="gpt-4o">GPT-4o</option>
                    <option value="gpt-4-turbo">GPT-4 Turbo</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">{t('autoPilot.fields.universe', { ns: 'social' })}</label>
                  <select
                    value={universe}
                    onChange={(event) => setUniverse(event.target.value)}
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                  >
                    <option value="csi300">{t('autoPilot.universes.csi300', { ns: 'social' })}</option>
                    <option value="csi500">{t('autoPilot.universes.csi500', { ns: 'social' })}</option>
                    <option value="csi1000">{t('autoPilot.universes.csi1000', { ns: 'social' })}</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">{t('autoPilot.fields.startDate', { ns: 'social' })}</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(event) => setStartDate(event.target.value)}
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">{t('autoPilot.fields.endDate', { ns: 'social' })}</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(event) => setEndDate(event.target.value)}
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={() => startMining.mutate()}
                disabled={startMining.isPending}
                className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
              >
                {startMining.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                {startMining.isPending
                  ? t('autoPilot.start.starting', { ns: 'social' })
                  : t('autoPilot.start.start', { ns: 'social' })}
              </button>
            </div>

            <div className="rounded-lg border border-border bg-card">
              <div className="border-b border-border px-5 py-4">
                <h2 className="text-lg font-semibold text-card-foreground">{t('autoPilot.runs.title', { ns: 'social' })}</h2>
              </div>
              {runsLoading ? (
                <div className="flex items-center gap-2 px-5 py-8 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {t('common:loading')}
                </div>
              ) : (
                <DataTable
                  columns={runColumns}
                  data={runsData}
                  keyField="run_id"
                  emptyText={t('autoPilot.runs.empty', { ns: 'social' })}
                />
              )}
            </div>

            {selectedRunId ? (
              <div className="space-y-4 rounded-lg border border-border bg-card p-5">
                <div>
                  <h3 className="text-lg font-semibold flex items-center gap-2 text-card-foreground">
                    <TrendingUp className="h-5 w-5 text-primary" />
                    {t('autoPilot.detail.title', { ns: 'social', id: `${selectedRunId.slice(0, 8)}...` })}
                  </h3>
                </div>

                <div className="space-y-3">
                  <h4 className="font-medium text-card-foreground">{t('autoPilot.detail.iterations', { ns: 'social' })}</h4>
                  {iterationsLoading ? (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      {t('common:loading')}
                    </div>
                  ) : iterationsData.length > 0 ? (
                    <div className="space-y-2">
                      {iterationsData.map((iteration) => (
                        <div key={iteration.id} className="rounded-lg border border-border p-3 text-sm">
                          <div className="mb-1 flex items-center gap-2">
                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">
                              {t('autoPilot.detail.iterationLabel', {
                                ns: 'social',
                                number: iteration.iteration_number,
                              })}
                            </span>
                            <Badge variant={badgeVariantForStatus(iteration.status)}>{formatStatus(iteration.status)}</Badge>
                          </div>
                          {iteration.hypothesis && (
                            <p className="ml-6 mb-1 text-muted-foreground">
                              <strong>{t('autoPilot.detail.hypothesis', { ns: 'social' })}:</strong> {iteration.hypothesis}
                            </p>
                          )}
                          {iteration.feedback && (
                            <p className="ml-6 text-xs text-muted-foreground">{iteration.feedback}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">{t('autoPilot.detail.noIterations', { ns: 'social' })}</p>
                  )}
                </div>

                <div className="space-y-3">
                  <h4 className="font-medium text-card-foreground">{t('autoPilot.factors.title', { ns: 'social' })}</h4>
                  {factorsLoading ? (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      {t('common:loading')}
                    </div>
                  ) : (
                    <DataTable
                      columns={factorColumns}
                      data={discoveredData}
                      keyField="id"
                      emptyText={t('autoPilot.factors.empty', { ns: 'social' })}
                    />
                  )}
                </div>
              </div>
            ) : (
              <div className="rounded-lg border border-dashed border-border bg-card/60 p-5 text-sm text-muted-foreground">
                {t('autoPilot.detail.empty', { ns: 'social' })}
              </div>
            )}
          </div>
        )}

        {activeTab === 'catalog' && (
          <div className="rounded-lg border border-border bg-card p-6">
            <h2 className="mb-4 text-lg font-semibold flex items-center gap-2 text-card-foreground">
              <Database className="h-5 w-5 text-primary" />
              {t('autoPilot.catalog.title', { ns: 'social' })}
            </h2>
            {catalogLoading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                {t('autoPilot.catalog.loading', { ns: 'social' })}
              </div>
            ) : catalogData ? (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  {t('autoPilot.catalog.summary', {
                    ns: 'social',
                    count: catalogData.total_fields,
                    sources: catalogData.sources.join(', '),
                  })}
                </p>
                <div className="grid gap-4 md:grid-cols-2">
                  {Object.entries(catalogData.categories)
                    .sort(([left], [right]) => left.localeCompare(right))
                    .map(([category, fields]) => (
                      <div key={category} className="rounded-lg border border-border bg-background/60 p-3">
                        <h3 className="mb-2 font-medium text-foreground capitalize">
                          {category}{' '}
                          <span className="text-sm font-normal text-muted-foreground">({fields.length})</span>
                        </h3>
                        <div className="flex flex-wrap gap-1.5">
                          {fields.map((field) => (
                            <span
                              key={field}
                              className="rounded border border-border bg-card px-2 py-0.5 text-xs font-mono text-muted-foreground"
                            >
                              {field}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">{t('autoPilot.catalog.empty', { ns: 'social' })}</p>
            )}
          </div>
        )}
      </TabPanel>
    </div>
  )
}
