import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Loader2, Play, Plus, RefreshCw, SlidersHorizontal, Trash2, X } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { optimizationAPI, strategiesAPI } from '../lib/api'
import type { Strategy } from '../types'

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

type StrategyOptimizationProps = {
  selectedStrategy?: Strategy | null
  onCreated?: (taskId: number) => void
}

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

function toStrategies(value: unknown): Strategy[] {
  if (Array.isArray(value)) return value as Strategy[]
  if (value && typeof value === 'object') {
    const payload = value as Record<string, unknown>
    if (Array.isArray(payload.data)) return payload.data as Strategy[]
  }
  return []
}

function normalizeStrategyDetail(value: unknown): Strategy | null {
  if (!value || typeof value !== 'object') return null
  const payload = value as Record<string, unknown>
  if (typeof payload.id === 'number') return payload as Strategy
  if (payload.data && typeof payload.data === 'object') {
    const nested = payload.data as Record<string, unknown>
    if (typeof nested.id === 'number') return nested as Strategy
  }
  return null
}

export default function StrategyOptimization({ selectedStrategy, onCreated }: StrategyOptimizationProps) {
  const { t } = useTranslation(['strategies', 'common'])
  const queryClient = useQueryClient()
  const [isOpen, setIsOpen] = useState(false)
  const [selectedStrategyId, setSelectedStrategyId] = useState('')
  const [objectiveMetric, setObjectiveMetric] = useState<ObjectiveMetric>('sharpe_ratio')
  const [searchMethod, setSearchMethod] = useState<SearchMethod>('grid')
  const [parameterRanges, setParameterRanges] = useState<Record<string, ParameterRangeDraft>>({})
  const [newParameterName, setNewParameterName] = useState('')
  const [formError, setFormError] = useState<string | null>(null)
  const [parameterLoadError, setParameterLoadError] = useState<string | null>(null)
  const [loadingStrategyParameters, setLoadingStrategyParameters] = useState(false)

  const requestIdRef = useRef(0)

  const { data: strategiesData, isLoading: strategiesLoading } = useQuery({
    queryKey: ['strategies', 'optimization-modal'],
    enabled: isOpen,
    queryFn: async () => (await strategiesAPI.list()).data,
  })

  const strategies = useMemo<Strategy[]>(() => toStrategies(strategiesData), [strategiesData])

  useEffect(() => {
    if (!isOpen || selectedStrategyId || strategies.length === 0) return
    if (selectedStrategy?.id) {
      setSelectedStrategyId(String(selectedStrategy.id))
      return
    }
    setSelectedStrategyId(String(strategies[0].id))
  }, [isOpen, selectedStrategy?.id, selectedStrategyId, strategies])

  const loadStrategyParameterRanges = useCallback(
    async (strategyId: string) => {
      if (!strategyId) {
        setParameterRanges({})
        setParameterLoadError(null)
        return
      }

      const listItem = strategies.find((item) => String(item.id) === strategyId)
      const listRanges = inferParameterRanges(listItem?.parameters)
      setParameterRanges(listRanges)
      setLoadingStrategyParameters(true)
      setParameterLoadError(null)

      const requestId = ++requestIdRef.current
      try {
        const response = await strategiesAPI.get(Number(strategyId))
        if (requestIdRef.current !== requestId) return
        const detail = normalizeStrategyDetail(response.data)
        if (!detail) {
          throw new Error('Invalid strategy detail response.')
        }

        const detailRanges = inferParameterRanges(detail.parameters)
        setParameterRanges(Object.keys(detailRanges).length > 0 ? detailRanges : listRanges)
      } catch (error: unknown) {
        if (requestIdRef.current !== requestId) return
        const requestError = error as { response?: { data?: { detail?: string } } }
        setParameterLoadError(
          requestError.response?.data?.detail ||
            t('optimization.loadParametersFailed', {
              defaultValue: 'Failed to auto-load strategy parameters. You can add them manually.',
            })
        )
      } finally {
        if (requestIdRef.current === requestId) {
          setLoadingStrategyParameters(false)
        }
      }
    },
    [strategies, t]
  )

  useEffect(() => {
    if (!isOpen || !selectedStrategyId) return
    void loadStrategyParameterRanges(selectedStrategyId)
  }, [isOpen, loadStrategyParameterRanges, selectedStrategyId])

  const createMutation = useMutation({
    mutationFn: async (payload: {
      strategy_id: number
      search_method: SearchMethod
      param_space: Record<string, ParameterRangePayload>
      objective_metric: ObjectiveMetric
    }) => (await optimizationAPI.createTask(payload)).data,
    onSuccess: (data) => {
      setFormError(null)
      setIsOpen(false)
      void queryClient.invalidateQueries({ queryKey: ['optimization-tasks-list'] })
      onCreated?.(data.id)
    },
    onError: (error: unknown) => {
      const requestError = error as { response?: { data?: { detail?: string } } }
      setFormError(
        requestError.response?.data?.detail ||
          t('optimization.submitFailed', {
            defaultValue: 'Failed to start optimization task.',
          })
      )
    },
  })

  const totalCombinations = useMemo(() => estimateTotalRuns(parameterRanges, searchMethod), [parameterRanges, searchMethod])

  const handleOpen = () => {
    setIsOpen(true)
    if (selectedStrategy?.id) {
      setSelectedStrategyId(String(selectedStrategy.id))
    }
  }

  const handleClose = () => {
    setIsOpen(false)
    setFormError(null)
    setParameterLoadError(null)
  }

  const handleStrategyChange = (strategyId: string) => {
    setSelectedStrategyId(strategyId)
    setFormError(null)
    setParameterLoadError(null)
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
      setFormError(
        error instanceof Error
          ? error.message
          : t('optimization.invalidParameters', { defaultValue: 'Parameter ranges are invalid.' })
      )
      return
    }

    if (Object.keys(paramSpace).length === 0) {
      setFormError(
        t('optimization.noParameters', {
          defaultValue: 'Add at least one numeric parameter range.',
        })
      )
      return
    }

    createMutation.mutate({
      strategy_id: Number(selectedStrategyId),
      search_method: searchMethod,
      param_space: paramSpace,
      objective_metric: objectiveMetric,
    })
  }

  if (!isOpen) {
    return (
      <button
        type="button"
        onClick={handleOpen}
        className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
      >
        <SlidersHorizontal className="h-4 w-4" />
        {t('optimization.optimizeStrategy', { defaultValue: 'Optimize Strategy' })}
      </button>
    )
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm"
      onClick={handleClose}
    >
      <div
        className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-lg border border-border bg-card shadow-lg"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border p-4">
          <div>
            <h2 className="text-xl font-semibold text-card-foreground">
              {t('optimization.title', { defaultValue: 'Strategy Optimization' })}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {t('optimization.subtitle', {
                defaultValue: 'Auto-load strategy parameters, tune min/max/step, and submit optimization tasks.',
              })}
            </p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="rounded-md p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 space-y-4 overflow-y-auto p-4">
          {formError && (
            <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
              {formError}
            </div>
          )}

          <section className="rounded-lg border border-border bg-background p-4">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="md:col-span-3">
                <label className="mb-2 block text-sm font-medium text-foreground">
                  {t('optimization.strategy', { defaultValue: 'Strategy' })}
                </label>
                <select
                  value={selectedStrategyId}
                  onChange={(event) => handleStrategyChange(event.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  disabled={strategiesLoading}
                >
                  <option value="">
                    {strategiesLoading
                      ? t('common:loading', { defaultValue: 'Loading...' })
                      : t('optimization.selectStrategy', { defaultValue: 'Select Strategy' })}
                  </option>
                  {strategies.map((strategy) => (
                    <option key={strategy.id} value={strategy.id}>
                      {strategy.name} v{strategy.version || 1}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-foreground">
                  {t('optimization.objective', { defaultValue: 'Objective' })}
                </label>
                <select
                  value={objectiveMetric}
                  onChange={(event) => setObjectiveMetric(event.target.value as ObjectiveMetric)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  {OBJECTIVE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-foreground">
                  {t('optimization.searchMethod', { defaultValue: 'Search Method' })}
                </label>
                <select
                  value={searchMethod}
                  onChange={(event) => setSearchMethod(event.target.value as SearchMethod)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  {SEARCH_METHOD_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="rounded-md border border-border bg-card px-3 py-2">
                <div className="text-xs uppercase tracking-wide text-muted-foreground">
                  {searchMethod === 'grid'
                    ? t('optimization.combinations', { defaultValue: 'Combinations' })
                    : t('optimization.samples', { defaultValue: 'Samples' })}
                </div>
                <div className="mt-1 text-lg font-semibold text-foreground">{totalCombinations}</div>
              </div>
            </div>
          </section>

          <section className="rounded-lg border border-border bg-background p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-sm font-medium text-foreground">
                  {t('optimization.parameterRanges', { defaultValue: 'Parameter Ranges' })}
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {t('optimization.parameterHelp', {
                    defaultValue: 'Auto-detected numeric parameters can be tuned with min / max / step.',
                  })}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => void loadStrategyParameterRanges(selectedStrategyId)}
                  disabled={!selectedStrategyId || loadingStrategyParameters}
                  className="inline-flex items-center gap-2 rounded-md border border-border px-3 py-2 text-xs font-medium hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${loadingStrategyParameters ? 'animate-spin' : ''}`} />
                  {t('optimization.resetRanges', { defaultValue: 'Reload Parameters' })}
                </button>
              </div>
            </div>

            {loadingStrategyParameters && (
              <p className="mt-3 text-xs text-muted-foreground">
                {t('optimization.loadingParameters', { defaultValue: 'Loading strategy parameters...' })}
              </p>
            )}
            {parameterLoadError && (
              <p className="mt-3 text-xs text-destructive">{parameterLoadError}</p>
            )}

            <div className="mt-4 space-y-3">
              {Object.entries(parameterRanges).length === 0 ? (
                <div className="rounded-md border border-dashed border-border px-3 py-4 text-sm text-muted-foreground">
                  {t('optimization.noParametersHint', {
                    defaultValue: 'No numeric parameters detected yet. Add one manually below.',
                  })}
                </div>
              ) : (
                Object.entries(parameterRanges).map(([name, range]) => (
                  <div key={name} className="rounded-md border border-border p-3">
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-sm font-medium text-foreground">{name}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveParameter(name)}
                        className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs text-muted-foreground hover:bg-muted"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        {t('common:remove', { defaultValue: 'Remove' })}
                      </button>
                    </div>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_24px_1fr_56px_1fr] sm:items-center">
                      <input
                        type="number"
                        step="any"
                        value={range.min}
                        onChange={(event) => handleRangeChange(name, 'min', event.target.value)}
                        className="rounded-md border border-input bg-background px-3 py-2 text-sm"
                      />
                      <span className="text-center text-sm text-muted-foreground">~</span>
                      <input
                        type="number"
                        step="any"
                        value={range.max}
                        onChange={(event) => handleRangeChange(name, 'max', event.target.value)}
                        className="rounded-md border border-input bg-background px-3 py-2 text-sm"
                      />
                      <span className="text-center text-xs uppercase text-muted-foreground">
                        {t('optimization.step', { defaultValue: 'Step' })}
                      </span>
                      <input
                        type="number"
                        step="any"
                        value={range.step}
                        onChange={(event) => handleRangeChange(name, 'step', event.target.value)}
                        className="rounded-md border border-input bg-background px-3 py-2 text-sm"
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
                placeholder={t('optimization.enterParamName', { defaultValue: 'Enter parameter name' })}
                className="h-10 flex-1 rounded-md border border-input bg-background px-3 text-sm"
              />
              <button
                type="button"
                onClick={handleAddParameter}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-border px-3 text-sm font-medium hover:bg-muted"
              >
                <Plus className="h-4 w-4" />
                {t('optimization.addParameter', { defaultValue: 'Add Parameter' })}
              </button>
            </div>
          </section>

          <div className="flex items-center justify-end gap-2 border-t border-border pt-2">
            <button
              type="button"
              onClick={handleClose}
              className="rounded-md border border-border px-4 py-2 text-sm font-medium hover:bg-muted"
            >
              {t('common:cancel', { defaultValue: 'Cancel' })}
            </button>
            <button
              type="submit"
              disabled={createMutation.isPending || strategiesLoading}
              className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {createMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Play className="h-4 w-4" />
              )}
              {searchMethod === 'grid'
                ? `${t('optimization.startOptimization', { defaultValue: 'Start Optimization' })} (${totalCombinations})`
                : t('optimization.startOptimization', { defaultValue: 'Start Optimization' })}
            </button>
          </div>
        </form>
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
  const normalized = normalizeParameters(parameters)
  const entries = Object.entries(normalized)
    .map(([key, value]) => [key, resolveNumericSeed(value)] as const)
    .filter((entry): entry is readonly [string, number] => entry[1] !== null)
  return Object.fromEntries(entries.map(([key, value]) => [key, buildRangeDraft(value)]))
}

function normalizeParameters(parameters: unknown): Record<string, unknown> {
  if (!parameters) return {}
  if (typeof parameters === 'string') {
    const text = parameters.trim()
    if (!text) return {}
    try {
      return normalizeParameters(JSON.parse(text))
    } catch {
      return {}
    }
  }
  if (typeof parameters === 'object' && !Array.isArray(parameters)) {
    return parameters as Record<string, unknown>
  }
  return {}
}

function resolveNumericSeed(value: unknown): number | null {
  const directValue = toFiniteNumber(value)
  if (directValue !== null) return directValue
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null

  const record = value as Record<string, unknown>
  const preferredKeys = ['default', 'value', 'initial', 'start', 'min']
  for (const key of preferredKeys) {
    const resolved = toFiniteNumber(record[key])
    if (resolved !== null) return resolved
  }

  const range = record.range
  if (Array.isArray(range) && range.length > 0) {
    const resolved = toFiniteNumber(range[0])
    if (resolved !== null) return resolved
  }

  return null
}

function toFiniteNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  if (!trimmed) return null
  const parsed = Number(trimmed)
  return Number.isFinite(parsed) ? parsed : null
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
