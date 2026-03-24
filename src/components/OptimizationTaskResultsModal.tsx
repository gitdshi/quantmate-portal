import { useQuery } from '@tanstack/react-query'
import { BarChart3, Calendar, Loader2, SlidersHorizontal, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { optimizationAPI, strategiesAPI } from '../lib/api'
import OptimizationHeatmap from './OptimizationHeatmap'

type OptimizationTask = {
  id: number
  strategy_id: number
  status?: string
  search_method?: string
  objective_metric?: string
  best_params?: Record<string, unknown> | null
  best_metrics?: Record<string, unknown> | null
  total_iterations?: number | null
  created_at?: string
  completed_at?: string | null
}

type OptimizationResult = {
  id: number
  rank_order?: number | null
  params?: Record<string, number>
  metrics?: Record<string, number>
  created_at?: string
}

type StrategyLite = {
  id: number
  name: string
}

type OptimizationTaskResultsModalProps = {
  taskId: number
  onClose: () => void
}

function normalizeTask(value: unknown): OptimizationTask | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  return value as OptimizationTask
}

function normalizeResults(value: unknown): OptimizationResult[] {
  if (Array.isArray(value)) return value as OptimizationResult[]
  if (value && typeof value === 'object') {
    const payload = value as Record<string, unknown>
    if (Array.isArray(payload.results)) return payload.results as OptimizationResult[]
  }
  return []
}

function normalizeStrategies(value: unknown): StrategyLite[] {
  if (Array.isArray(value)) return value as StrategyLite[]
  if (value && typeof value === 'object') {
    const payload = value as Record<string, unknown>
    if (Array.isArray(payload.data)) return payload.data as StrategyLite[]
  }
  return []
}

function formatDateTime(value?: string | null): string {
  if (!value) return '--'
  const dt = new Date(value)
  if (Number.isNaN(dt.getTime())) return String(value)
  return dt.toLocaleString()
}

function formatNumber(value: unknown, digits = 4): string {
  const numeric = Number(value)
  if (!Number.isFinite(numeric)) return '--'
  return numeric.toFixed(digits)
}

function methodLabel(method?: string): string {
  if (!method) return '--'
  if (method === 'grid') return 'Grid Search'
  if (method === 'random') return 'Random Search'
  if (method === 'bayesian') return 'Bayesian Search'
  return method
}

function statusClass(status?: string): string {
  const normalized = String(status || 'pending').toLowerCase()
  if (normalized === 'completed' || normalized === 'finished') return 'bg-emerald-100 text-emerald-700'
  if (normalized === 'running' || normalized === 'started') return 'bg-blue-100 text-blue-700'
  if (normalized === 'failed') return 'bg-red-100 text-red-700'
  if (normalized === 'cancelled') return 'bg-slate-200 text-slate-700'
  return 'bg-amber-100 text-amber-700'
}

function metricValue(metrics: Record<string, number> | undefined, key: string): number {
  if (!metrics) return 0
  if (key === 'max_drawdown') {
    const maxDrawdown = metrics.max_drawdown
    if (Number.isFinite(maxDrawdown)) return Number(maxDrawdown)
    const maxDrawdownPercent = metrics.max_drawdown_percent
    if (Number.isFinite(maxDrawdownPercent)) return Number(maxDrawdownPercent)
    return 0
  }
  const value = metrics[key]
  if (!Number.isFinite(value)) return 0
  return Number(value)
}

export default function OptimizationTaskResultsModal({ taskId, onClose }: OptimizationTaskResultsModalProps) {
  const { t } = useTranslation(['strategies', 'common'])
  const [xParam, setXParam] = useState('')
  const [yParam, setYParam] = useState('')
  const [heatMetric, setHeatMetric] = useState<'total_return' | 'sharpe_ratio' | 'max_drawdown'>('sharpe_ratio')

  const { data: taskData, isLoading: taskLoading } = useQuery({
    queryKey: ['optimization-task-detail', taskId],
    queryFn: async () => (await optimizationAPI.getTask(taskId)).data,
    enabled: !!taskId,
  })

  const { data: resultsData, isLoading: resultsLoading } = useQuery({
    queryKey: ['optimization-task-results', taskId],
    queryFn: async () => (await optimizationAPI.getResults(taskId)).data,
    enabled: !!taskId,
    refetchInterval: 5000,
  })

  const { data: strategiesData } = useQuery({
    queryKey: ['strategies', 'optimization-results-map'],
    queryFn: async () => (await strategiesAPI.list()).data,
  })

  const task = useMemo(() => normalizeTask(taskData), [taskData])
  const strategies = useMemo(() => normalizeStrategies(strategiesData), [strategiesData])
  const results = useMemo(() => {
    const normalized = normalizeResults(resultsData)
    return [...normalized].sort((a, b) => {
      const left = Number.isFinite(a.rank_order) ? Number(a.rank_order) : Number.MAX_SAFE_INTEGER
      const right = Number.isFinite(b.rank_order) ? Number(b.rank_order) : Number.MAX_SAFE_INTEGER
      return left - right
    })
  }, [resultsData])

  const strategyName =
    !task?.strategy_id
      ? '--'
      : strategies.find((item) => item.id === task.strategy_id)?.name || `#${task.strategy_id}`

  const bestParams =
    task?.best_params && Object.keys(task.best_params).length > 0
      ? task.best_params
      : (results[0]?.params ?? null)

  const bestMetrics =
    task?.best_metrics && Object.keys(task.best_metrics).length > 0
      ? task.best_metrics
      : (results[0]?.metrics ?? null)

  const parameterKeys = useMemo(() => {
    const numericKeys = new Set<string>()
    for (const row of results) {
      const params = row.params || {}
      for (const [key, value] of Object.entries(params)) {
        if (Number.isFinite(Number(value))) {
          numericKeys.add(key)
        }
      }
    }
    return [...numericKeys]
  }, [results])

  const effectiveXParam = useMemo(() => {
    if (parameterKeys.length < 2) return ''
    if (parameterKeys.includes(xParam)) return xParam
    return parameterKeys[0]
  }, [parameterKeys, xParam])

  const effectiveYParam = useMemo(() => {
    if (parameterKeys.length < 2) return ''
    if (parameterKeys.includes(yParam) && yParam !== effectiveXParam) return yParam
    return parameterKeys.find((item) => item !== effectiveXParam) || parameterKeys[0]
  }, [effectiveXParam, parameterKeys, yParam])

  const heatmapResults = useMemo(
    () =>
      results.map((row) => ({
        parameters: row.params || {},
        total_return: metricValue(row.metrics, 'total_return'),
        sharpe_ratio: metricValue(row.metrics, 'sharpe_ratio'),
        max_drawdown: metricValue(row.metrics, 'max_drawdown'),
      })),
    [results]
  )

  const isLoading = taskLoading || resultsLoading
  const showHeatmap = parameterKeys.length >= 2 && effectiveXParam && effectiveYParam

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm" onClick={onClose}>
      <div
        className="flex max-h-[95vh] w-full max-w-6xl flex-col overflow-hidden rounded-lg border border-border bg-card shadow-lg"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border p-4">
          <div>
            <h2 className="text-xl font-semibold">{t('optimization.resultsTitle', { defaultValue: 'Optimization Results' })}</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {t('optimization.resultsSubtitle', {
                defaultValue: 'Task #{{id}} · {{strategy}}',
                id: taskId,
                strategy: strategyName,
              })}
            </p>
          </div>
          <button type="button" onClick={onClose} className="rounded-md p-2 transition-colors hover:bg-muted">
            <X className="h-5 w-5" />
          </button>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center gap-3 p-10 text-sm text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            {t('common:loading', { defaultValue: 'Loading...' })}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3 border-b border-border p-4 md:grid-cols-5">
              <div className="rounded-lg border border-border bg-muted/30 p-3">
                <div className="mb-1 flex items-center gap-1 text-xs text-muted-foreground">
                  <SlidersHorizontal className="h-3.5 w-3.5" />
                  {t('optimization.searchMethod', { defaultValue: 'Search Method' })}
                </div>
                <div className="text-sm font-medium text-foreground">{methodLabel(task?.search_method)}</div>
              </div>
              <div className="rounded-lg border border-border bg-muted/30 p-3">
                <div className="mb-1 flex items-center gap-1 text-xs text-muted-foreground">
                  <BarChart3 className="h-3.5 w-3.5" />
                  {t('optimization.objective', { defaultValue: 'Objective' })}
                </div>
                <div className="text-sm font-medium text-foreground">{task?.objective_metric || '--'}</div>
              </div>
              <div className="rounded-lg border border-border bg-muted/30 p-3">
                <div className="mb-1 text-xs text-muted-foreground">{t('common:status', { defaultValue: 'Status' })}</div>
                <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${statusClass(task?.status)}`}>
                  {task?.status || 'pending'}
                </span>
              </div>
              <div className="rounded-lg border border-border bg-muted/30 p-3">
                <div className="mb-1 flex items-center gap-1 text-xs text-muted-foreground">
                  <Calendar className="h-3.5 w-3.5" />
                  {t('optimization.createdAt', { defaultValue: 'Created At' })}
                </div>
                <div className="text-xs text-foreground">{formatDateTime(task?.created_at)}</div>
              </div>
              <div className="rounded-lg border border-border bg-muted/30 p-3">
                <div className="mb-1 text-xs text-muted-foreground">
                  {t('optimization.completedAt', { defaultValue: 'Completed At' })}
                </div>
                <div className="text-xs text-foreground">{formatDateTime(task?.completed_at)}</div>
              </div>
            </div>

            <div className="flex-1 space-y-4 overflow-y-auto p-4">
              <div className="grid gap-4 lg:grid-cols-2">
                <section className="rounded-lg border border-border bg-background p-4">
                  <h3 className="text-sm font-semibold text-foreground">
                    {t('optimization.bestParameters', { defaultValue: 'Best Parameters' })}
                  </h3>
                  <pre className="mt-3 max-h-52 overflow-auto rounded-md bg-muted/30 p-3 text-xs text-muted-foreground">
                    {JSON.stringify(bestParams || {}, null, 2)}
                  </pre>
                </section>

                <section className="rounded-lg border border-border bg-background p-4">
                  <h3 className="text-sm font-semibold text-foreground">
                    {t('optimization.bestMetrics', { defaultValue: 'Best Metrics' })}
                  </h3>
                  <pre className="mt-3 max-h-52 overflow-auto rounded-md bg-muted/30 p-3 text-xs text-muted-foreground">
                    {JSON.stringify(bestMetrics || {}, null, 2)}
                  </pre>
                </section>
              </div>

              {showHeatmap && (
                <section className="rounded-lg border border-border bg-background p-4">
                  <div className="mb-3 flex flex-wrap items-center gap-2">
                    <span className="text-sm font-semibold text-foreground">
                      {t('optimization.heatmap', { defaultValue: 'Parameter Heatmap' })}
                    </span>
                    <select
                      value={effectiveXParam}
                      onChange={(event) => setXParam(event.target.value)}
                      className="rounded-md border border-input bg-background px-2 py-1 text-xs"
                    >
                      {parameterKeys.map((item) => (
                        <option key={item} value={item}>
                          X: {item}
                        </option>
                      ))}
                    </select>
                    <select
                      value={effectiveYParam}
                      onChange={(event) => setYParam(event.target.value)}
                      className="rounded-md border border-input bg-background px-2 py-1 text-xs"
                    >
                      {parameterKeys.map((item) => (
                        <option key={item} value={item}>
                          Y: {item}
                        </option>
                      ))}
                    </select>
                    <select
                      value={heatMetric}
                      onChange={(event) => setHeatMetric(event.target.value as 'total_return' | 'sharpe_ratio' | 'max_drawdown')}
                      className="rounded-md border border-input bg-background px-2 py-1 text-xs"
                    >
                      <option value="sharpe_ratio">{t('optimization.sharpeRatio', { defaultValue: 'Sharpe Ratio' })}</option>
                      <option value="total_return">{t('optimization.totalReturn', { defaultValue: 'Total Return' })}</option>
                      <option value="max_drawdown">{t('optimization.maxDrawdown', { defaultValue: 'Max Drawdown' })}</option>
                    </select>
                  </div>
                  <OptimizationHeatmap
                    results={heatmapResults}
                    xParam={effectiveXParam}
                    yParam={effectiveYParam}
                    metric={heatMetric}
                  />
                </section>
              )}

              <section className="rounded-lg border border-border bg-background p-4">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-foreground">
                    {t('optimization.allResults', { defaultValue: 'All Results ({{count}})', count: results.length })}
                  </h3>
                </div>

                {results.length === 0 ? (
                  <div className="rounded-md border border-dashed border-border px-3 py-6 text-center text-sm text-muted-foreground">
                    {t('optimization.noResults', {
                      defaultValue: 'No optimization results yet. Wait for the task to finish and refresh.',
                    })}
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                      <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                        <tr>
                          <th className="px-3 py-2">#</th>
                          <th className="px-3 py-2">{t('optimization.params', { defaultValue: 'Params' })}</th>
                          <th className="px-3 py-2">{t('optimization.objective', { defaultValue: 'Objective' })}</th>
                          <th className="px-3 py-2">{t('optimization.sharpeRatio', { defaultValue: 'Sharpe Ratio' })}</th>
                          <th className="px-3 py-2">{t('optimization.totalReturn', { defaultValue: 'Total Return' })}</th>
                          <th className="px-3 py-2">{t('optimization.maxDrawdown', { defaultValue: 'Max Drawdown' })}</th>
                          <th className="px-3 py-2">{t('optimization.createdAt', { defaultValue: 'Created At' })}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {results.map((row, index) => {
                          const rank = Number.isFinite(row.rank_order) ? Number(row.rank_order) : index + 1
                          const objective = row.metrics?.[task?.objective_metric || ''] ?? row.metrics?.sharpe_ratio
                          return (
                            <tr key={row.id || `${rank}-${index}`} className="border-t border-border/70 align-top">
                              <td className="px-3 py-2 font-medium text-foreground">{rank}</td>
                              <td className="px-3 py-2 font-mono text-xs text-muted-foreground">
                                {JSON.stringify(row.params || {})}
                              </td>
                              <td className="px-3 py-2 text-muted-foreground">{formatNumber(objective)}</td>
                              <td className="px-3 py-2 text-muted-foreground">{formatNumber(row.metrics?.sharpe_ratio)}</td>
                              <td className="px-3 py-2 text-muted-foreground">{formatNumber(row.metrics?.total_return)}</td>
                              <td className="px-3 py-2 text-muted-foreground">
                                {formatNumber(row.metrics?.max_drawdown_percent ?? row.metrics?.max_drawdown)}
                              </td>
                              <td className="px-3 py-2 text-muted-foreground">{formatDateTime(row.created_at)}</td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            </div>
          </>
        )}

        <div className="flex items-center justify-end border-t border-border p-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
          >
            {t('common:close', { defaultValue: 'Close' })}
          </button>
        </div>
      </div>
    </div>
  )
}
