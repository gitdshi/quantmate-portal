import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Eye, Loader2, RefreshCw, Trash2 } from 'lucide-react'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'

import { optimizationAPI, strategiesAPI } from '../lib/api'
import type { Strategy } from '../types'

type OptimizationTask = {
  id: number
  strategy_id: number
  status?: string
  search_method?: string
  objective_metric?: string
  created_at?: string
  completed_at?: string | null
  total_iterations?: number
}

type OptimizationTaskListProps = {
  onViewResults: (taskId: number) => void
}

function normalizeTasks(value: unknown): OptimizationTask[] {
  if (Array.isArray(value)) return value as OptimizationTask[]
  if (value && typeof value === 'object') {
    const payload = value as Record<string, unknown>
    if (Array.isArray(payload.data)) return payload.data as OptimizationTask[]
  }
  return []
}

function normalizeStrategies(value: unknown): Strategy[] {
  if (Array.isArray(value)) return value as Strategy[]
  if (value && typeof value === 'object') {
    const payload = value as Record<string, unknown>
    if (Array.isArray(payload.data)) return payload.data as Strategy[]
  }
  return []
}

function formatDateTime(value?: string | null): string {
  if (!value) return '--'
  const dt = new Date(value)
  if (Number.isNaN(dt.getTime())) return String(value)
  return dt.toLocaleString()
}

function statusClass(status: string): string {
  const normalized = status.toLowerCase()
  if (normalized === 'completed' || normalized === 'finished') return 'bg-emerald-100 text-emerald-700'
  if (normalized === 'running' || normalized === 'started') return 'bg-blue-100 text-blue-700'
  if (normalized === 'failed') return 'bg-red-100 text-red-700'
  if (normalized === 'cancelled') return 'bg-slate-200 text-slate-700'
  return 'bg-amber-100 text-amber-700'
}

function methodLabel(method?: string): string {
  if (!method) return '--'
  if (method === 'grid') return 'Grid'
  if (method === 'random') return 'Random'
  if (method === 'bayesian') return 'Bayesian'
  return method
}

export default function OptimizationTaskList({ onViewResults }: OptimizationTaskListProps) {
  const { t } = useTranslation(['strategies', 'common'])
  const queryClient = useQueryClient()

  const {
    data: tasksData,
    isLoading,
    isFetching,
    refetch,
  } = useQuery({
    queryKey: ['optimization-tasks-list'],
    queryFn: async () => (await optimizationAPI.listTasks(1, 100)).data,
    refetchInterval: 5000,
  })

  const { data: strategiesData } = useQuery({
    queryKey: ['strategies', 'optimization-list-map'],
    queryFn: async () => (await strategiesAPI.list()).data,
  })

  const tasks = useMemo(() => normalizeTasks(tasksData), [tasksData])
  const strategies = useMemo(() => normalizeStrategies(strategiesData), [strategiesData])

  const strategyNameMap = useMemo(() => {
    return new Map(strategies.map((item) => [item.id, item.name]))
  }, [strategies])

  const deleteMutation = useMutation({
    mutationFn: async (taskId: number) => optimizationAPI.deleteTask(taskId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['optimization-tasks-list'] })
    },
  })

  const handleDelete = (taskId: number) => {
    const ok = window.confirm(
      t('optimization.deleteTaskConfirm', {
        defaultValue: 'Delete this optimization task and its results?',
      })
    )
    if (!ok) return
    deleteMutation.mutate(taskId)
  }

  return (
    <div className="rounded-lg border border-border bg-card">
      <div className="flex items-center justify-between border-b border-border p-4">
        <div>
          <h3 className="text-base font-semibold text-card-foreground">
            {t('optimization.taskListTitle', { defaultValue: 'Optimization Tasks' })}
          </h3>
          <p className="mt-1 text-xs text-muted-foreground">
            {t('optimization.taskListSubtitle', {
              defaultValue: 'Track optimization progress, view results, and delete finished tasks.',
            })}
          </p>
        </div>
        <button
          type="button"
          onClick={() => void refetch()}
          className="inline-flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm hover:bg-muted"
          disabled={isFetching}
        >
          <RefreshCw size={14} className={isFetching ? 'animate-spin' : ''} />
          {t('common:refresh', { defaultValue: 'Refresh' })}
        </button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center gap-2 p-8 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          {t('common:loading', { defaultValue: 'Loading...' })}
        </div>
      ) : tasks.length === 0 ? (
        <div className="p-8 text-center text-sm text-muted-foreground">
          {t('optimization.noTaskListData', { defaultValue: 'No optimization tasks yet.' })}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-3">ID</th>
                <th className="px-4 py-3">{t('optimization.strategy', { defaultValue: 'Strategy' })}</th>
                <th className="px-4 py-3">{t('optimization.searchMethod', { defaultValue: 'Search Method' })}</th>
                <th className="px-4 py-3">{t('optimization.objective', { defaultValue: 'Objective' })}</th>
                <th className="px-4 py-3">{t('common:status', { defaultValue: 'Status' })}</th>
                <th className="px-4 py-3">{t('optimization.createdAt', { defaultValue: 'Created At' })}</th>
                <th className="px-4 py-3">{t('common:actions', { defaultValue: 'Actions' })}</th>
              </tr>
            </thead>
            <tbody>
              {tasks.map((task) => {
                const status = task.status || 'pending'
                const strategyName = strategyNameMap.get(task.strategy_id) || `#${task.strategy_id}`
                return (
                  <tr key={task.id} className="border-t border-border/70">
                    <td className="px-4 py-3 font-medium text-foreground">#{task.id}</td>
                    <td className="px-4 py-3 text-foreground">{strategyName}</td>
                    <td className="px-4 py-3 text-muted-foreground">{methodLabel(task.search_method)}</td>
                    <td className="px-4 py-3 text-muted-foreground">{task.objective_metric || '--'}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${statusClass(status)}`}>
                        {status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{formatDateTime(task.created_at)}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => onViewResults(task.id)}
                          className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs hover:bg-muted"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          {t('common:view', { defaultValue: 'View' })}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(task.id)}
                          className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs text-destructive hover:bg-destructive/10"
                          disabled={deleteMutation.isPending}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          {t('common:delete', { defaultValue: 'Delete' })}
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
