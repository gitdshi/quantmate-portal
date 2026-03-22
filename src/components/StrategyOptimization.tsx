
import { useMutation, useQuery } from '@tanstack/react-query'
import { BarChart3, Loader2, Play, Plus, RefreshCw, Target, Trash2, TrendingUp, X } from 'lucide-react'
import { useMemo, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { optimizationAPI, strategiesAPI } from '../lib/api'
import type { Strategy } from '../types'
import OptimizationHeatmap from './OptimizationHeatmap'

type SearchMethod = 'grid' | 'random' | 'bayesian'
type ObjectiveMetric = 'sharpe_ratio' | 'total_return' | 'calmar_ratio'

type ParameterRangeDraft = {
  min: string
  max: string
  step: string
}

type ParameterRangePayload = {
  min: number
  max: number
  step: number
}

type OptimizationTask = {
  id: number
  strategy_id: number
  status: string
  search_method?: SearchMethod
  param_space?: Record<string, ParameterRangePayload>
  param_ranges?: Record<string, ParameterRangePayload>
  objective_metric?: string
  objective?: string
  best_params?: Record<string, number>
  best_metrics?: Record<string, number>
  total_iterations?: number
  created_at?: string
  completed_at?: string | null
}

type OptimizationTaskResult = {
  id: number
  params: Record<string, number>
  metrics: Record<string, number>
  rank_order?: number | null
  rank_num?: number | null
}

type StrategyOptimizationProps = {
  selectedStrategy?: Strategy | null
}

const TERMINAL_STATUSES = new Set(['completed', 'failed', 'cancelled'])

const OBJECTIVE_OPTIONS: Array<{ value: ObjectiveMetric; label: string }> = [
  { value: 'sharpe_ratio', label: 'Sharpe Ratio' },
  { value: 'total_return', label: 'Total Return' },
  { value: 'calmar_ratio', label: 'Calmar Ratio' },
]

const SEARCH_METHOD_OPTIONS: Array<{ value: SearchMethod; label: string }> = [
  { value: 'grid', label: 'Grid Search' },
  { value: 'random', label: 'Random Search' },
  { value: 'bayesian', label: 'Bayesian Search' },
]

export default function StrategyOptimization({ selectedStrategy }: StrategyOptimizationProps) {
  const { t } = useTranslation(['strategies', 'common'])
  const [isOpen, setIsOpen] = useState(false)
  const [selectedStrategyId, setSelectedStrategyId] = useState('')
  const [objectiveMetric, setObjectiveMetric] = useState<ObjectiveMetric>('sharpe_ratio')
  const [searchMethod, setSearchMethod] = useState<SearchMethod>('grid')
  const [parameterRanges, setParameterRanges] = useState<Record<string, ParameterRangeDraft>>({})
  const [newParameterName, setNewParameterName] = useState('')
  const [activeTaskId, setActiveTaskId] = useState<number | null>(null)
  const [formError, setFormError] = useState<string | null>(null)

  const { data: strategiesResponse, isLoading: strategiesLoading, refetch: refetchStrategies } = useQuery({
    queryKey: ['strategies', 'optimization'],
    enabled: isOpen,
    queryFn: async () => (await strategiesAPI.list()).data,
  })

  const strategies = useMemo<Strategy[]>(
    () => (Array.isArray(strategiesResponse) ? strategiesResponse : strategiesResponse?.data ?? []),
    [strategiesResponse]
  )

  const currentStrategy = useMemo(() => {
    const found = strategies.find((item) => String(item.id) === selectedStrategyId)
    if (found) return found
    if (selectedStrategy && String(selectedStrategy.id) === selectedStrategyId) return selectedStrategy
    return null
  }, [selectedStrategy, selectedStrategyId, strategies])

  const optimizationMutation = useMutation({
    mutationFn: async (payload: {
      strategy_id: number
      search_method: SearchMethod
      param_space: Record<string, ParameterRangePayload>
      objective_metric: ObjectiveMetric
    }) => (await optimizationAPI.createTask(payload)).data,
    onSuccess: (data) => {
      setActiveTaskId(data.id)
      setFormError(null)
    },
    onError: (error: unknown) => {
      const requestError = error as { response?: { data?: { detail?: string } } }
      setFormError(requestError.response?.data?.detail || t('optimization.submitFailed', { defaultValue: 'Failed to start optimization task.' }))
    },
  })

  const {
    data: taskData,
    isFetching: taskFetching,
    refetch: refetchTask,
  } = useQuery({
    queryKey: ['optimization', 'task', activeTaskId],
    enabled: isOpen && !!activeTaskId,
    queryFn: async () => (await optimizationAPI.getTask(activeTaskId!)).data as OptimizationTask,
    refetchInterval: (query) => {
      const status = normalizeStatus((query.state.data as OptimizationTask | undefined)?.status)
      return TERMINAL_STATUSES.has(status) ? false : 3000
    },
  })

  const {
    data: resultsData,
    isFetching: resultsFetching,
    refetch: refetchResults,
  } = useQuery({
    queryKey: ['optimization', 'results', activeTaskId],
    enabled: isOpen && !!activeTaskId,
    queryFn: async () => {
      const response = await optimizationAPI.getResults(activeTaskId!)
      return response.data?.results ?? response.data?.data?.results ?? []
    },
    refetchInterval: () => (TERMINAL_STATUSES.has(normalizeStatus(taskData?.status)) ? false : 3000),
  })

  const optimizationTask = taskData ?? null
  const optimizationResults = useMemo<OptimizationTaskResult[]>(
    () => (Array.isArray(resultsData) ? resultsData : []),
    [resultsData]
  )

  const sortedResults = useMemo(() => {
    const results = [...optimizationResults]
    results.sort((left, right) => {
      const leftRank = left.rank_order ?? left.rank_num ?? Number.MAX_SAFE_INTEGER
      const rightRank = right.rank_order ?? right.rank_num ?? Number.MAX_SAFE_INTEGER
      if (leftRank !== rightRank) return leftRank - rightRank

      const metricKey = objectiveMetric
      const leftMetric = Number(left.metrics?.[metricKey] ?? Number.NEGATIVE_INFINITY)
      const rightMetric = Number(right.metrics?.[metricKey] ?? Number.NEGATIVE_INFINITY)
      return rightMetric - leftMetric
    })
    return results
  }, [objectiveMetric, optimizationResults])

  const heatmapResults = useMemo(() => {
    return sortedResults
      .filter((item) => item.params && item.metrics)
      .map((item) => ({
        parameters: item.params,
        total_return: Number(item.metrics.total_return ?? 0),
        sharpe_ratio: Number(item.metrics.sharpe_ratio ?? 0),
        max_drawdown: Number(item.metrics.max_drawdown ?? 0),
      }))
  }, [sortedResults])

  const heatmapParameterNames = useMemo(() => {
    const taskParamNames = Object.keys(optimizationTask?.best_params ?? {})
    if (taskParamNames.length >= 2) return taskParamNames.slice(0, 2)
    const resultParamNames = Object.keys(sortedResults[0]?.params ?? {})
    return resultParamNames.slice(0, 2)
  }, [optimizationTask?.best_params, sortedResults])

  const bestParams = optimizationTask?.best_params ?? sortedResults[0]?.params ?? null
  const bestMetrics = optimizationTask?.best_metrics ?? sortedResults[0]?.metrics ?? null
  const totalCombinations = useMemo(() => estimateTotalRuns(parameterRanges, searchMethod), [parameterRanges, searchMethod])
  const status = normalizeStatus(optimizationTask?.status)

  const openModal = () => {
    setIsOpen(true)
    if (selectedStrategy?.id) {
      setSelectedStrategyId(String(selectedStrategy.id))
      setParameterRanges(inferParameterRanges(selectedStrategy.parameters))
    } else if (!selectedStrategyId) {
      setParameterRanges({})
    }
  }

  const closeModal = () => {
    setIsOpen(false)
    setFormError(null)
  }

  const handleAddParameter = () => {
    const name = newParameterName.trim()
    if (!name) return
    setParameterRanges((current) => {
      if (current[name]) return current
      return {
        ...current,
        [name]: buildRangeDraft(0),
      }
    })
    setNewParameterName('')
  }

  const handleRemoveParameter = (name: string) => {
    setParameterRanges((current) => {
      const next = { ...current }
      delete next[name]
      return next
    })
  }

  const handleRangeChange = (name: string, field: keyof ParameterRangeDraft, value: string) => {
    setParameterRanges((current) => ({
      ...current,
      [name]: {
        ...current[name],
        [field]: value,
      },
    }))
  }

  const handleStrategySelect = (strategyId: string) => {
    setSelectedStrategyId(strategyId)
    const nextStrategy = strategies.find((item) => String(item.id) === strategyId)
    setParameterRanges(inferParameterRanges(nextStrategy?.parameters))
    setFormError(null)
  }

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setFormError(null)

    if (!selectedStrategyId) {
      setFormError(t('optimization.selectStrategy', { defaultValue: 'Please select a strategy first.' }))
      return
    }

    let paramSpace: Record<string, ParameterRangePayload>
    try {
      paramSpace = buildParamSpace(parameterRanges)
    } catch (error) {
      setFormError(error instanceof Error ? error.message : t('optimization.invalidParameters', { defaultValue: 'Parameter ranges are invalid.' }))
      return
    }

    if (Object.keys(paramSpace).length === 0) {
      setFormError(t('optimization.noParameters', { defaultValue: 'Add at least one numeric parameter range.' }))
      return
    }

    optimizationMutation.mutate({
      strategy_id: Number(selectedStrategyId),
      search_method: searchMethod,
      param_space: paramSpace,
      objective_metric: objectiveMetric,
    })
  }

  const statusTone = getStatusTone(status)
  const isRefreshing = taskFetching || resultsFetching

  if (!isOpen) {
    return (
      <button
        onClick={openModal}
        className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
      >
        <TrendingUp className="h-4 w-4" />
        {t('optimization.optimizeStrategy', { defaultValue: 'Optimize Strategy' })}
      </button>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4" onClick={closeModal}>
      <div
        className="flex max-h-[92vh] w-full max-w-7xl flex-col overflow-hidden rounded-[30px] border border-slate-200 bg-white shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between border-b border-slate-200 px-6 py-5">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight text-slate-900">
              {t('optimization.title', { defaultValue: 'Optimize Strategy' })}
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              {t('optimization.subtitle', { defaultValue: 'Configure search ranges, choose an objective, and compare the best parameter combinations.' })}
            </p>
          </div>
          <button
            onClick={closeModal}
            className="rounded-xl border border-slate-200 p-2 text-slate-500 transition hover:bg-slate-50 hover:text-slate-700"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-auto bg-slate-50 px-6 py-6">
          <div className="grid gap-6 xl:grid-cols-[420px_minmax(0,1fr)]">
            <form onSubmit={handleSubmit} className="space-y-6">
              <section className="rounded-3xl border border-slate-200 bg-white shadow-sm">
                <div className="border-b border-slate-200 px-6 py-5">
                  <h3 className="text-lg font-semibold text-slate-900">
                    {t('optimization.configuration', { defaultValue: 'Optimization Configuration' })}
                  </h3>
                </div>
                <div className="space-y-5 p-6">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-700">
                      {t('optimization.strategy', { defaultValue: 'Strategy' })}
                    </label>
                    <select
                      value={selectedStrategyId}
                      onChange={(event) => handleStrategySelect(event.target.value)}
                      className="h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-700 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                    >
                      <option value="">{t('optimization.selectStrategy', { defaultValue: 'Select a strategy' })}</option>
                      {strategies.map((strategy) => (
                        <option key={strategy.id} value={strategy.id}>
                          {strategy.name} v{strategy.version}
                        </option>
                      ))}
                    </select>
                    {strategiesLoading && (
                      <p className="mt-2 text-xs text-slate-500">{t('common:loading', { defaultValue: 'Loading...' })}</p>
                    )}
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="mb-2 block text-sm font-medium text-slate-700">
                        {t('optimization.objective', { defaultValue: 'Objective' })}
                      </label>
                      <select
                        value={objectiveMetric}
                        onChange={(event) => setObjectiveMetric(event.target.value as ObjectiveMetric)}
                        className="h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-700 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                      >
                        {OBJECTIVE_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-medium text-slate-700">
                        {t('optimization.searchMethod', { defaultValue: 'Search Method' })}
                      </label>
                      <select
                        value={searchMethod}
                        onChange={(event) => setSearchMethod(event.target.value as SearchMethod)}
                        className="h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-700 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                      >
                        {SEARCH_METHOD_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium text-slate-900">
                          {t('optimization.parameterRanges', { defaultValue: 'Parameter Ranges' })}
                        </p>
                        <p className="mt-1 text-xs leading-5 text-slate-500">
                          {t('optimization.parameterHelp', { defaultValue: 'Use numeric ranges to generate combinations. We prefill values from the selected strategy when available.' })}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setParameterRanges(inferParameterRanges(currentStrategy?.parameters))}
                        className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 transition hover:bg-slate-100"
                      >
                        <RefreshCw className="h-3.5 w-3.5" />
                        {t('optimization.resetRanges', { defaultValue: 'Reset' })}
                      </button>
                    </div>

                    <div className="mt-4 space-y-3">
                      {Object.entries(parameterRanges).length === 0 ? (
                        <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-4 py-5 text-sm text-slate-500">
                          {t('optimization.noParametersHint', { defaultValue: 'No numeric parameters detected yet. Add one below or select another strategy.' })}
                        </div>
                      ) : (
                        Object.entries(parameterRanges).map(([name, range]) => (
                          <div key={name} className="rounded-2xl border border-slate-200 bg-white p-4">
                            <div className="flex items-center justify-between gap-3">
                              <div className="text-sm font-semibold text-slate-900">{name}</div>
                              <button
                                type="button"
                                onClick={() => handleRemoveParameter(name)}
                                className="inline-flex items-center gap-1 rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 transition hover:bg-red-50"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                                {t('common:remove', { defaultValue: 'Remove' })}
                              </button>
                            </div>
                            <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_24px_1fr_64px_1fr] sm:items-center">
                              <input
                                type="number"
                                value={range.min}
                                onChange={(event) => handleRangeChange(name, 'min', event.target.value)}
                                className="h-10 rounded-xl border border-slate-200 px-3 text-sm text-slate-700 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                              />
                              <span className="text-center text-sm text-slate-400">~</span>
                              <input
                                type="number"
                                value={range.max}
                                onChange={(event) => handleRangeChange(name, 'max', event.target.value)}
                                className="h-10 rounded-xl border border-slate-200 px-3 text-sm text-slate-700 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                              />
                              <span className="text-center text-xs font-medium uppercase tracking-[0.16em] text-slate-400">
                                {t('optimization.step', { defaultValue: 'Step' })}
                              </span>
                              <input
                                type="number"
                                value={range.step}
                                onChange={(event) => handleRangeChange(name, 'step', event.target.value)}
                                className="h-10 rounded-xl border border-slate-200 px-3 text-sm text-slate-700 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                              />
                            </div>
                          </div>
                        ))
                      )}
                    </div>

                    <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                      <input
                        value={newParameterName}
                        onChange={(event) => setNewParameterName(event.target.value)}
                        placeholder={t('optimization.enterParamName', { defaultValue: 'Add parameter name' })}
                        className="h-11 flex-1 rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-700 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                      />
                      <button
                        type="button"
                        onClick={handleAddParameter}
                        className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
                      >
                        <Plus className="h-4 w-4" />
                        {t('optimization.addParameter', { defaultValue: 'Add Parameter' })}
                      </button>
                    </div>
                  </div>
                </div>
              </section>

              <section className="rounded-3xl border border-slate-200 bg-white shadow-sm">
                <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900">
                      {t('optimization.runSummary', { defaultValue: 'Run Summary' })}
                    </h3>
                    <p className="mt-1 text-sm text-slate-500">
                      {currentStrategy?.name || t('optimization.selectStrategyHint', { defaultValue: 'Choose a strategy to generate parameter combinations.' })}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-blue-50 px-4 py-3 text-right">
                    <div className="text-xs uppercase tracking-[0.18em] text-blue-500">
                      {searchMethod === 'grid'
                        ? t('optimization.combinations', { defaultValue: 'Combinations' })
                        : t('optimization.samples', { defaultValue: 'Samples' })}
                    </div>
                    <div className="mt-1 text-2xl font-semibold text-blue-700">{totalCombinations}</div>
                  </div>
                </div>
                <div className="space-y-4 p-6">
                  {formError && (
                    <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                      {formError}
                    </div>
                  )}
                  <div className="grid gap-3 sm:grid-cols-3">
                    <InfoCard
                      icon={<Target className="h-4 w-4" />}
                      label={t('optimization.objective', { defaultValue: 'Objective' })}
                      value={OBJECTIVE_OPTIONS.find((option) => option.value === objectiveMetric)?.label ?? objectiveMetric}
                    />
                    <InfoCard
                      icon={<BarChart3 className="h-4 w-4" />}
                      label={t('optimization.searchMethod', { defaultValue: 'Search Method' })}
                      value={SEARCH_METHOD_OPTIONS.find((option) => option.value === searchMethod)?.label ?? searchMethod}
                    />
                    <InfoCard
                      icon={<TrendingUp className="h-4 w-4" />}
                      label={t('optimization.parametersCount', { defaultValue: 'Parameters' })}
                      value={String(Object.keys(parameterRanges).length)}
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={optimizationMutation.isPending || strategiesLoading}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {optimizationMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Play className="h-4 w-4" />
                    )}
                    {searchMethod === 'grid'
                      ? t('optimization.startWithCount', {
                          defaultValue: `Start Optimization (${totalCombinations} combinations)`,
                          count: totalCombinations,
                        })
                      : t('optimization.startOptimization', { defaultValue: 'Start Optimization' })}
                  </button>
                </div>
              </section>
            </form>

            <div className="space-y-6">
              <section className="rounded-3xl border border-slate-200 bg-white shadow-sm">
                <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900">
                      {t('optimization.results', { defaultValue: 'Optimization Results' })}
                    </h3>
                    <p className="mt-1 text-sm text-slate-500">
                      {activeTaskId
                        ? `${t('optimization.taskId', { defaultValue: 'Task' })} #${activeTaskId}`
                        : t('optimization.noResults', { defaultValue: 'Start a task to see the result heatmap and top parameter sets.' })}
                    </p>
                  </div>
                  {activeTaskId && (
                    <button
                      type="button"
                      onClick={() => {
                        void refetchTask()
                        void refetchResults()
                      }}
                      className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                    >
                      <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                      {t('common:refresh', { defaultValue: 'Refresh' })}
                    </button>
                  )}
                </div>

                {!activeTaskId ? (
                  <div className="px-6 py-16 text-center text-sm text-slate-500">
                    {t('optimization.emptyResultState', { defaultValue: 'No optimization task yet. Configure the ranges on the left and launch one run.' })}
                  </div>
                ) : (
                  <div className="space-y-6 p-6">
                    <div className={`rounded-2xl border px-4 py-4 ${statusTone.container}`}>
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <div className="text-xs uppercase tracking-[0.18em] text-slate-500">
                            {t('common:status', { defaultValue: 'Status' })}
                          </div>
                          <div className="mt-2 text-lg font-semibold text-slate-900">{statusTone.label}</div>
                        </div>
                        <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${statusTone.badge}`}>
                          {statusTone.label}
                        </span>
                      </div>
                      {optimizationTask?.created_at && (
                        <p className="mt-3 text-xs text-slate-500">
                          {t('optimization.createdAt', { defaultValue: 'Created' })}: {new Date(optimizationTask.created_at).toLocaleString()}
                        </p>
                      )}
                    </div>

                    <div className="grid gap-3 md:grid-cols-3">
                      <MetricCard
                        label={t('optimization.totalReturn', { defaultValue: 'Total Return' })}
                        value={formatMetric(bestMetrics?.total_return, 'percent')}
                        tone={Number(bestMetrics?.total_return ?? 0) >= 0 ? 'positive' : 'negative'}
                      />
                      <MetricCard
                        label={t('optimization.sharpeRatio', { defaultValue: 'Sharpe Ratio' })}
                        value={formatMetric(bestMetrics?.sharpe_ratio)}
                        tone="neutral"
                      />
                      <MetricCard
                        label={t('optimization.maxDrawdown', { defaultValue: 'Max Drawdown' })}
                        value={formatMetric(bestMetrics?.max_drawdown, 'percent')}
                        tone="negative"
                      />
                    </div>

                    <div className="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
                      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                        <div className="text-sm font-semibold text-slate-900">
                          {t('optimization.bestParameters', { defaultValue: 'Best Parameters' })}
                        </div>
                        {!bestParams ? (
                          <p className="mt-3 text-sm text-slate-500">
                            {t('optimization.waitingBestParams', { defaultValue: 'Waiting for ranked parameter results...' })}
                          </p>
                        ) : (
                          <div className="mt-4 space-y-3">
                            {Object.entries(bestParams).map(([key, value]) => (
                              <div key={key} className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm">
                                <span className="text-slate-600">{key}</span>
                                <span className="font-semibold text-slate-900">{formatMetric(value)}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="rounded-2xl border border-slate-200 bg-white p-5">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <div className="text-sm font-semibold text-slate-900">
                              {t('optimization.heatmapTitle', { defaultValue: 'Optimization Heatmap' })}
                            </div>
                            <p className="mt-1 text-xs text-slate-500">
                              {heatmapParameterNames.length >= 2
                                ? `${heatmapParameterNames[0]} x ${heatmapParameterNames[1]}`
                                : t('optimization.heatmapHint', { defaultValue: 'Heatmap appears when at least two parameters have evaluated results.' })}
                            </p>
                          </div>
                        </div>
                        <div className="mt-4">
                          {heatmapParameterNames.length >= 2 && heatmapResults.length > 0 ? (
                            <OptimizationHeatmap
                              results={heatmapResults}
                              xParam={heatmapParameterNames[0]}
                              yParam={heatmapParameterNames[1]}
                              metric={objectiveMetric === 'total_return' ? 'total_return' : 'sharpe_ratio'}
                            />
                          ) : (
                            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-14 text-center text-sm text-slate-500">
                              {t('optimization.noDataForHeatmap', { defaultValue: 'No heatmap data yet.' })}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-white">
                      <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
                        <div className="text-sm font-semibold text-slate-900">
                          {t('optimization.allResults', {
                            defaultValue: `${sortedResults.length} ranked results`,
                            count: sortedResults.length,
                          })}
                        </div>
                        {isRefreshing && <Loader2 className="h-4 w-4 animate-spin text-slate-400" />}
                      </div>
                      {sortedResults.length === 0 ? (
                        <div className="px-5 py-10 text-sm text-slate-500">
                          {t('optimization.waitingResults', { defaultValue: 'Optimization results will appear here once the task starts returning ranked combinations.' })}
                        </div>
                      ) : (
                        <div className="max-h-[320px] overflow-auto">
                          <table className="min-w-full text-left text-sm">
                            <thead className="sticky top-0 bg-slate-50 text-xs uppercase tracking-[0.18em] text-slate-500">
                              <tr>
                                <th className="px-5 py-3 font-semibold">#</th>
                                <th className="px-5 py-3 font-semibold">{t('optimization.params', { defaultValue: 'Parameters' })}</th>
                                <th className="px-5 py-3 text-right font-semibold">{t('optimization.return', { defaultValue: 'Return' })}</th>
                                <th className="px-5 py-3 text-right font-semibold">{t('optimization.sharpe', { defaultValue: 'Sharpe' })}</th>
                                <th className="px-5 py-3 text-right font-semibold">{t('optimization.maxDrawdown', { defaultValue: 'Max Drawdown' })}</th>
                              </tr>
                            </thead>
                            <tbody>
                              {sortedResults.map((result, index) => (
                                <tr key={result.id ?? index} className="border-t border-slate-200 hover:bg-slate-50">
                                  <td className="px-5 py-3 text-slate-500">{index + 1}</td>
                                  <td className="px-5 py-3 text-slate-700">
                                    {Object.entries(result.params ?? {})
                                      .map(([key, value]) => `${key}: ${formatMetric(value)}`)
                                      .join(', ')}
                                  </td>
                                  <td className={`px-5 py-3 text-right font-medium ${Number(result.metrics?.total_return ?? 0) >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                                    {formatMetric(result.metrics?.total_return, 'percent')}
                                  </td>
                                  <td className="px-5 py-3 text-right text-slate-700">
                                    {formatMetric(result.metrics?.sharpe_ratio)}
                                  </td>
                                  <td className="px-5 py-3 text-right text-red-600">
                                    {formatMetric(result.metrics?.max_drawdown, 'percent')}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </section>

              <div className="flex items-center justify-between rounded-3xl border border-slate-200 bg-white px-6 py-4 shadow-sm">
                <p className="text-sm text-slate-500">
                  {t('optimization.footerHint', { defaultValue: 'Tip: grid search is best for small discrete ranges; random or Bayesian search works better once the space gets large.' })}
                </p>
                <button
                  type="button"
                  onClick={() => void refetchStrategies()}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                >
                  <RefreshCw className="h-4 w-4" />
                  {t('optimization.refreshStrategies', { defaultValue: 'Refresh Strategies' })}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function buildRangeDraft(value: number): ParameterRangeDraft {
  if (!Number.isFinite(value) || value === 0) {
    return { min: '0', max: '10', step: '1' }
  }

  if (Number.isInteger(value)) {
    const min = Math.max(0, Math.floor(value * 0.6))
    const max = Math.max(min + 1, Math.ceil(value * 1.6))
    return {
      min: String(min),
      max: String(max),
      step: '1',
    }
  }

  const min = Math.max(0, Number((value * 0.6).toFixed(2)))
  const max = Math.max(min + 0.1, Number((value * 1.6).toFixed(2)))
  return {
    min: String(min),
    max: String(max),
    step: '0.1',
  }
}

function inferParameterRanges(parameters: unknown): Record<string, ParameterRangeDraft> {
  if (!parameters || typeof parameters !== 'object' || Array.isArray(parameters)) return {}

  const entries = Object.entries(parameters as Record<string, unknown>).filter(([, value]) => typeof value === 'number')
  return Object.fromEntries(entries.map(([key, value]) => [key, buildRangeDraft(Number(value))]))
}

function buildParamSpace(ranges: Record<string, ParameterRangeDraft>): Record<string, ParameterRangePayload> {
  return Object.entries(ranges).reduce<Record<string, ParameterRangePayload>>((accumulator, [name, range]) => {
    const min = Number(range.min)
    const max = Number(range.max)
    const step = Number(range.step)

    if (!Number.isFinite(min) || !Number.isFinite(max) || !Number.isFinite(step) || step <= 0 || max < min) {
      throw new Error(`Invalid range for ${name}`)
    }

    accumulator[name] = { min, max, step }
    return accumulator
  }, {})
}

function estimateTotalRuns(ranges: Record<string, ParameterRangeDraft>, searchMethod: SearchMethod): string {
  let total = 1
  let hasValidRange = false

  for (const range of Object.values(ranges)) {
    const min = Number(range.min)
    const max = Number(range.max)
    const step = Number(range.step)
    if (!Number.isFinite(min) || !Number.isFinite(max) || !Number.isFinite(step) || step <= 0 || max < min) {
      continue
    }
    hasValidRange = true
    const count = Math.floor((max - min) / step) + 1
    total *= Math.max(1, count)
    if (total > 99999) return '99999+'
  }

  if (!hasValidRange) return '0'
  if (searchMethod === 'random') return String(Math.min(total, 100))
  if (searchMethod === 'bayesian') return String(Math.min(total, 50))
  return String(total)
}

function normalizeStatus(status?: string): string {
  if (!status) return 'pending'
  const normalized = status.toLowerCase()
  if (normalized === 'running') return 'running'
  if (normalized === 'completed' || normalized === 'finished') return 'completed'
  if (normalized === 'failed') return 'failed'
  if (normalized === 'cancelled') return 'cancelled'
  return 'pending'
}

function getStatusTone(status: string): { label: string; container: string; badge: string } {
  switch (status) {
    case 'running':
      return {
        label: 'Running',
        container: 'border-blue-200 bg-blue-50',
        badge: 'bg-blue-100 text-blue-700',
      }
    case 'completed':
      return {
        label: 'Completed',
        container: 'border-emerald-200 bg-emerald-50',
        badge: 'bg-emerald-100 text-emerald-700',
      }
    case 'failed':
      return {
        label: 'Failed',
        container: 'border-red-200 bg-red-50',
        badge: 'bg-red-100 text-red-700',
      }
    case 'cancelled':
      return {
        label: 'Cancelled',
        container: 'border-slate-300 bg-slate-100',
        badge: 'bg-slate-200 text-slate-700',
      }
    default:
      return {
        label: 'Pending',
        container: 'border-amber-200 bg-amber-50',
        badge: 'bg-amber-100 text-amber-700',
      }
  }
}

function formatMetric(value: unknown, mode: 'number' | 'percent' = 'number'): string {
  const numericValue = Number(value)
  if (!Number.isFinite(numericValue)) return '--'

  if (mode === 'percent') {
    return `${numericValue.toFixed(2)}%`
  }

  if (Math.abs(numericValue) >= 100) return numericValue.toFixed(0)
  if (Math.abs(numericValue) >= 10) return numericValue.toFixed(1)
  return numericValue.toFixed(2)
}

function InfoCard({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
      <div className="flex items-center gap-2 text-xs uppercase tracking-[0.16em] text-slate-500">
        {icon}
        {label}
      </div>
      <div className="mt-2 text-sm font-semibold text-slate-900">{value}</div>
    </div>
  )
}

function MetricCard({
  label,
  value,
  tone,
}: {
  label: string
  value: string
  tone: 'positive' | 'negative' | 'neutral'
}) {
  const toneClass =
    tone === 'positive'
      ? 'text-emerald-600'
      : tone === 'negative'
        ? 'text-red-600'
        : 'text-blue-600'

  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4">
      <div className="text-xs uppercase tracking-[0.16em] text-slate-500">{label}</div>
      <div className={`mt-2 text-2xl font-semibold ${toneClass}`}>{value}</div>
    </div>
  )
}
