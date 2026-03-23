import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  ArrowDown,
  ArrowUp,
  BarChart3,
  CheckCircle,
  ChevronDown,
  ChevronRight,
  Clock,
  Eye,
  Loader,
  Search,
  Trash2,
  XCircle,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { usePagination } from '../hooks/usePagination'
import { queueAPI } from '../lib/api'
import type { BulkJobChildResult, BulkJobResultsPage } from '../types'
import Pagination from './Pagination'
import Badge from './ui/Badge'

interface BacktestJobListProps {
  onViewResults: (jobId: string) => void
  onViewBulkSummary?: (jobId: string) => void
}

type BacktestListJob = {
  job_id: string
  status: string
  type?: string
  created_at: string
  progress?: number
  progress_message?: string
  symbol?: string
  symbol_name?: string
  symbols?: string[]
  total_symbols?: number
  strategy_class?: string
  strategy_name?: string
  strategy_version?: number
  start_date?: string
  end_date?: string
  result?: {
    best_return?: number
    best_symbol?: string
    statistics?: {
      total_return?: number
      annual_return?: number
      sharpe_ratio?: number
      max_drawdown?: number
      max_drawdown_percent?: number
    }
  }
}

export default function BacktestJobList({ onViewResults, onViewBulkSummary }: BacktestJobListProps) {
  const { t } = useTranslation(['backtest', 'common'])
  const [filter, setFilter] = useState<string>('all')
  const [search, setSearch] = useState('')
  const [strategyFilter, setStrategyFilter] = useState<string>('all')
  const [jobDetails, setJobDetails] = useState<Record<string, any>>({})
  const [expandedBulk, setExpandedBulk] = useState<Record<string, boolean>>({})
  const queryClient = useQueryClient()

  const { data: jobsData, isLoading } = useQuery({
    queryKey: ['backtest-jobs', filter],
    queryFn: () => queueAPI.listJobs(filter === 'all' ? undefined : filter, 100),
    refetchInterval: 5000,
  })

  const deleteMutation = useMutation({
    mutationFn: (jobId: string) => queueAPI.deleteJob(jobId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['backtest-jobs'] })
    },
  })

  const handleDelete = (jobId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (confirm(t('jobList.confirmDelete'))) {
      deleteMutation.mutate(jobId)
    }
  }

  const fetchJobDetails = async (jobId: string) => {
    if (!jobDetails[jobId]) {
      try {
        const response = await queueAPI.getJob(jobId)
        setJobDetails((prev) => ({
          ...prev,
          [jobId]: response.data,
        }))
      } catch (error) {
        console.error('Failed to fetch job details:', error)
      }
    }
  }

  const jobs = useMemo<BacktestListJob[]>(() => {
    const payload = jobsData?.data
    return Array.isArray(payload) ? payload : []
  }, [jobsData])

  useEffect(() => {
    if (jobs.length > 0) {
      jobs.forEach((job) => {
        if ((job.status === 'finished' || job.status === 'completed') && !jobDetails[job.job_id]) {
          void fetchJobDetails(job.job_id)
        }
      })
    }
  }, [jobs, jobDetails])

  const filteredJobs = useMemo(() => {
    const query = search.trim().toLowerCase()

    return jobs.filter((job) => {
      const matchesSearch = !query || [
        job.job_id,
        job.strategy_name,
        job.strategy_class,
        job.symbol,
        job.symbol_name,
      ].some((value) => String(value || '').toLowerCase().includes(query))

      if (!matchesSearch) {
        return false
      }

      if (strategyFilter === 'all') {
        return true
      }

      const strategyName = job.strategy_name || job.strategy_class || ''
      return strategyName === strategyFilter
    })
  }, [jobs, search, strategyFilter])

  const strategyOptions = useMemo(() => {
    const options = new Set<string>()
    jobs.forEach((job) => {
      const strategyName = (job.strategy_name || job.strategy_class || '').trim()
      if (strategyName) {
        options.add(strategyName)
      }
    })
    return Array.from(options).sort((a, b) => a.localeCompare(b))
  }, [jobs])

  const jobsPagination = usePagination(filteredJobs, { initialPageSize: 10 })

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'queued':
        return <Badge variant="warning">{t('status.queued')}</Badge>
      case 'started':
        return <Badge variant="primary">{t('status.running')}</Badge>
      case 'finished':
      case 'completed':
        return <Badge variant="success">{t('status.finished')}</Badge>
      case 'failed':
        return <Badge variant="destructive">{t('status.failed')}</Badge>
      default:
        return <Badge variant="muted">{status}</Badge>
    }
  }

  const formatReturn = (value?: number | null) => {
    if (value === undefined || value === null) {
      return '-'
    }

    return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`
  }

  const renderSingleRow = (job: BacktestListJob) => {
    const isCompleted = job.status === 'finished' || job.status === 'completed'
    const detail = jobDetails[job.job_id]
    const stats = detail?.result?.statistics
    const totalReturn = stats?.total_return
    const sharpe = stats?.sharpe_ratio
    const maxDrawdown = stats?.max_drawdown_percent ?? stats?.max_drawdown
    const strategyLabel = job.strategy_name || job.strategy_class || '-'
    const symbolLabel = job.symbol_name ? `${job.symbol} (${job.symbol_name})` : job.symbol || '-'

    return (
      <tr
        key={job.job_id}
        onClick={() => {
          if (isCompleted) {
            onViewResults(job.job_id)
          }
        }}
        className={isCompleted ? 'cursor-pointer hover:bg-accent/50' : ''}
      >
        <td className="px-4 py-3 font-mono text-xs">{job.job_id.slice(0, 12)}</td>
        <td className="px-4 py-3">
          <div className="font-medium text-foreground">{strategyLabel}</div>
          {job.strategy_version ? <div className="mt-0.5 text-[11px] text-muted-foreground">v{job.strategy_version}</div> : null}
        </td>
        <td className="px-4 py-3">
          <div className="font-mono text-xs text-foreground">{symbolLabel}</div>
          {job.start_date && job.end_date ? <div className="mt-0.5 text-[11px] text-muted-foreground">{job.start_date} ~ {job.end_date}</div> : null}
        </td>
        <td className="px-4 py-3">{getStatusBadge(job.status)}</td>
        <td className="px-4 py-3">
          <span className={totalReturn !== undefined && totalReturn !== null ? (totalReturn >= 0 ? 'font-semibold text-red-500' : 'font-semibold text-green-500') : 'text-muted-foreground'}>
            {formatReturn(totalReturn)}
          </span>
        </td>
        <td className="px-4 py-3">{sharpe !== undefined && sharpe !== null ? sharpe.toFixed(2) : '-'}</td>
        <td className="px-4 py-3">
          <span className={maxDrawdown !== undefined && maxDrawdown !== null ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground'}>
            {maxDrawdown !== undefined && maxDrawdown !== null ? `${maxDrawdown.toFixed(2)}%` : '-'}
          </span>
        </td>
        <td className="px-4 py-3">
          <div className="text-xs text-foreground">{new Date(job.created_at).toLocaleDateString()}</div>
          <div className="mt-0.5 text-[11px] text-muted-foreground">{new Date(job.created_at).toLocaleTimeString()}</div>
        </td>
        <td className="px-4 py-3">
          <div className="flex items-center gap-1">
            {isCompleted ? (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onViewResults(job.job_id)
                }}
                className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs text-primary transition-colors hover:bg-primary/10"
              >
                <Eye className="h-3.5 w-3.5" />
                {t('common:view')}
              </button>
            ) : null}
            <button
              onClick={(e) => handleDelete(job.job_id, e)}
              disabled={deleteMutation.isPending}
              className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs text-destructive transition-colors hover:bg-destructive/10 disabled:opacity-50"
            >
              <Trash2 className="h-3.5 w-3.5" />
              {t('common:delete')}
            </button>
          </div>
          {job.progress !== undefined && job.progress > 0 && job.progress < 100 ? (
            <div className="mt-2 w-28">
              <div className="mb-1 flex items-center justify-between text-[10px] text-muted-foreground">
                <span>{job.progress_message || t('jobList.processing')}</span>
                <span>{job.progress}%</span>
              </div>
              <div className="h-1.5 rounded-full bg-muted">
                <div className="h-1.5 rounded-full bg-primary transition-all" style={{ width: `${job.progress}%` }} />
              </div>
            </div>
          ) : null}
        </td>
      </tr>
    )
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-muted/20 p-3">
        <div className="relative min-w-[220px] max-w-sm flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('page.searchPlaceholder')}
            className="w-full rounded-md border border-input bg-background py-2 pl-9 pr-3 text-sm outline-none transition-colors focus:border-ring focus:ring-2 focus:ring-ring/20"
          />
        </div>

        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="min-w-[140px] rounded-md border border-input bg-background px-3 py-2 text-sm outline-none transition-colors focus:border-ring focus:ring-2 focus:ring-ring/20"
        >
          <option value="all">{t('page.allStatuses')}</option>
          <option value="finished">{t('status.finished')}</option>
          <option value="started">{t('status.running')}</option>
          <option value="failed">{t('status.failed')}</option>
          <option value="queued">{t('status.queued')}</option>
        </select>

        <select
          value={strategyFilter}
          onChange={(e) => setStrategyFilter(e.target.value)}
          className="min-w-[180px] rounded-md border border-input bg-background px-3 py-2 text-sm outline-none transition-colors focus:border-ring focus:ring-2 focus:ring-ring/20"
        >
          <option value="all">{t('page.allStrategies')}</option>
          {strategyOptions.map((strategy) => (
            <option key={strategy} value={strategy}>
              {strategy}
            </option>
          ))}
        </select>
      </div>

      {filteredJobs.length === 0 ? (
        <div className="rounded-lg border border-border bg-card py-12 text-center">
          <p className="text-muted-foreground">{t('jobList.noJobs')}</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full border-collapse text-sm">
            <thead className="bg-muted">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.05em] text-muted-foreground">{t('jobList.id')}</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.05em] text-muted-foreground">{t('jobList.strategy')}</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.05em] text-muted-foreground">{t('symbol')}</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.05em] text-muted-foreground">{t('jobList.status')}</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.05em] text-muted-foreground">{t('metrics.totalReturn')}</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.05em] text-muted-foreground">{t('metrics.sharpeRatio')}</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.05em] text-muted-foreground">{t('metrics.maxDrawdown')}</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.05em] text-muted-foreground">{t('jobList.created')}</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.05em] text-muted-foreground">{t('jobList.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {jobsPagination.paginatedItems.map((job) => {
                const isBulk = job.job_id.startsWith('bulk_') || job.type === 'bulk_backtest'
                if (isBulk) {
                  return (
                    <BulkTableRows
                      key={job.job_id}
                      job={job}
                      expanded={!!expandedBulk[job.job_id]}
                      onToggle={() => setExpandedBulk((prev) => ({ ...prev, [job.job_id]: !prev[job.job_id] }))}
                      onDelete={(e) => handleDelete(job.job_id, e)}
                      deleteIsPending={deleteMutation.isPending}
                      onViewResults={onViewResults}
                      onViewBulkSummary={onViewBulkSummary}
                    />
                  )
                }

                return renderSingleRow(job)
              })}
            </tbody>
          </table>
        </div>
      )}

      {filteredJobs.length > 0 ? (
        <Pagination
          page={jobsPagination.page}
          pageSize={jobsPagination.pageSize}
          total={jobsPagination.total}
          onPageChange={jobsPagination.onPageChange}
          onPageSizeChange={jobsPagination.onPageSizeChange}
        />
      ) : null}
    </div>
  )
}

function BulkTableRows({
  job,
  expanded,
  onToggle,
  onDelete,
  deleteIsPending,
  onViewResults,
  onViewBulkSummary,
}: {
  job: BacktestListJob
  expanded: boolean
  onToggle: () => void
  onDelete: (e: React.MouseEvent) => void
  deleteIsPending: boolean
  onViewResults: (jobId: string) => void
  onViewBulkSummary?: (jobId: string) => void
}) {
  const { t } = useTranslation(['backtest', 'common'])
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [page, setPage] = useState(1)
  const [allResults, setAllResults] = useState<BulkJobChildResult[]>([])
  const [total, setTotal] = useState(0)
  const [loadingMore, setLoadingMore] = useState(false)
  const pageSize = 10
  const hasFinished = job.status === 'finished' || job.status === 'completed'
  const totalSymbols = job.total_symbols || job.symbols?.length || 0
  const bestReturn = job.result?.best_return
  const bestSymbol = job.result?.best_symbol
  const strategyLabel = job.strategy_name || job.strategy_class || '-'

  const { data: bulkSummaryData } = useQuery({
    queryKey: ['bulk-summary-inline', job.job_id],
    queryFn: async () => {
      const res = await queueAPI.getBulkJobSummary(job.job_id)
      return res.data
    },
    enabled: hasFinished,
    staleTime: 30_000,
  })

  const avgMetrics = bulkSummaryData?.avg_metrics
  const avgTotalReturn = avgMetrics?.total_return
  const avgSharpe = avgMetrics?.sharpe_ratio
  const avgMaxDrawdown = avgMetrics?.max_drawdown

  useEffect(() => {
    if (expanded && allResults.length === 0 && hasFinished) {
      void loadPage(1)
    }
  }, [expanded, allResults.length, hasFinished])

  useEffect(() => {
    if (expanded && hasFinished) {
      setAllResults([])
      setPage(1)
      void loadPage(1)
    }
  }, [sortOrder])

  const loadPage = async (nextPage: number) => {
    setLoadingMore(true)
    try {
      const res = await queueAPI.getBulkJobResults(job.job_id, nextPage, pageSize, sortOrder)
      const data: BulkJobResultsPage = res.data
      setAllResults((prev) => (nextPage === 1 ? data.results : [...prev, ...data.results]))
      setTotal(data.total)
      setPage(nextPage)
    } catch (error) {
      console.error('Failed to load bulk results', error)
    } finally {
      setLoadingMore(false)
    }
  }

  const hasMore = allResults.length < total

  return (
    <>
      <tr className="hover:bg-accent/50">
        <td className="px-4 py-3 font-mono text-xs">{job.job_id.slice(0, 12)}</td>
        <td className="px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="font-medium text-foreground">{strategyLabel}</span>
            <Badge variant="warning">{t('bulk.label')}</Badge>
          </div>
          {job.strategy_version ? <div className="mt-0.5 text-[11px] text-muted-foreground">v{job.strategy_version}</div> : null}
        </td>
        <td className="px-4 py-3">
          <div className="font-medium text-foreground">{t('bulk.symbols', { count: totalSymbols })}</div>
          {job.start_date && job.end_date ? <div className="mt-0.5 text-[11px] text-muted-foreground">{job.start_date} ~ {job.end_date}</div> : null}
        </td>
        <td className="px-4 py-3">
          {job.status === 'finished' || job.status === 'completed' ? <Badge variant="success">{t('status.finished')}</Badge> : null}
          {job.status === 'started' ? <Badge variant="primary">{t('status.running')}</Badge> : null}
          {job.status === 'queued' ? <Badge variant="warning">{t('status.queued')}</Badge> : null}
          {job.status === 'failed' ? <Badge variant="destructive">{t('status.failed')}</Badge> : null}
        </td>
        <td className="px-4 py-3">
          <span className={avgTotalReturn !== undefined && avgTotalReturn !== null ? (avgTotalReturn >= 0 ? 'font-semibold text-red-500' : 'font-semibold text-green-500') : 'text-muted-foreground'}>
            {avgTotalReturn !== undefined && avgTotalReturn !== null ? `${avgTotalReturn >= 0 ? '+' : ''}${avgTotalReturn.toFixed(2)}%` : '-'}
          </span>
          {bestSymbol ? <div className="mt-0.5 text-[11px] text-muted-foreground">Best: {bestSymbol}</div> : null}
        </td>
        <td className="px-4 py-3">{avgSharpe !== undefined && avgSharpe !== null ? avgSharpe.toFixed(2) : '-'}</td>
        <td className="px-4 py-3">{avgMaxDrawdown !== undefined && avgMaxDrawdown !== null ? `${avgMaxDrawdown.toFixed(2)}%` : '-'}</td>
        <td className="px-4 py-3">
          <div className="text-xs text-foreground">{new Date(job.created_at).toLocaleDateString()}</div>
          <div className="mt-0.5 text-[11px] text-muted-foreground">{new Date(job.created_at).toLocaleTimeString()}</div>
        </td>
        <td className="px-4 py-3">
          <div className="flex items-center gap-1">
            {hasFinished ? (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onToggle()
                }}
                className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs text-primary transition-colors hover:bg-primary/10"
                title={t('common:view')}
              >
                {expanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
              </button>
            ) : null}
            {hasFinished && onViewBulkSummary ? (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onViewBulkSummary(job.job_id)
                }}
                className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs text-primary transition-colors hover:bg-primary/10"
              >
                <BarChart3 className="h-3.5 w-3.5" />
                {t('common:view')}
              </button>
            ) : null}
            <button
              onClick={onDelete}
              disabled={deleteIsPending}
              className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs text-destructive transition-colors hover:bg-destructive/10 disabled:opacity-50"
            >
              <Trash2 className="h-3.5 w-3.5" />
              {t('common:delete')}
            </button>
          </div>
          {job.progress !== undefined && job.progress > 0 && job.progress < 100 ? (
            <div className="mt-2 w-28">
              <div className="mb-1 flex items-center justify-between text-[10px] text-muted-foreground">
                <span>{job.progress_message || t('jobList.processing')}</span>
                <span>{job.progress}%</span>
              </div>
              <div className="h-1.5 rounded-full bg-muted">
                <div className="h-1.5 rounded-full bg-primary transition-all" style={{ width: `${job.progress}%` }} />
              </div>
            </div>
          ) : null}
        </td>
      </tr>

      {expanded && hasFinished ? (
        <tr>
          <td colSpan={9} className="px-0 py-0">
            <div className="border-t border-border bg-muted/10">
              <div className="flex items-center justify-between px-4 py-2">
                <span className="text-xs text-muted-foreground">{total} {t('jobList.results')}</span>
                <button
                  onClick={() => setSortOrder((prev) => (prev === 'desc' ? 'asc' : 'desc'))}
                  className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                >
                  {t('metrics.totalReturn')}
                  {sortOrder === 'desc' ? <ArrowDown className="h-3 w-3" /> : <ArrowUp className="h-3 w-3" />}
                </button>
              </div>

              <div className="overflow-x-auto border-t border-border bg-background">
                <table className="w-full border-collapse text-xs">
                  <thead className="bg-muted/60">
                    <tr>
                      <th className="px-4 py-2 text-left text-[10px] font-semibold uppercase tracking-[0.05em] text-muted-foreground">{t('symbol')}</th>
                      <th className="px-4 py-2 text-right text-[10px] font-semibold uppercase tracking-[0.05em] text-muted-foreground">{t('metrics.totalReturn')}</th>
                      <th className="px-4 py-2 text-right text-[10px] font-semibold uppercase tracking-[0.05em] text-muted-foreground">{t('metrics.annualReturn')}</th>
                      <th className="px-4 py-2 text-right text-[10px] font-semibold uppercase tracking-[0.05em] text-muted-foreground">{t('metrics.sharpeRatio')}</th>
                      <th className="px-4 py-2 text-right text-[10px] font-semibold uppercase tracking-[0.05em] text-muted-foreground">{t('metrics.maxDrawdown')}</th>
                      <th className="px-4 py-2 text-right text-[10px] font-semibold uppercase tracking-[0.05em] text-muted-foreground">{t('jobList.status')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allResults.map((child) => {
                      const ret = child.statistics?.total_return
                      const annual = child.statistics?.annual_return
                      const sharpe = child.statistics?.sharpe_ratio
                      const maxDrawdown = child.statistics?.max_drawdown_percent ?? child.statistics?.max_drawdown

                      return (
                        <tr key={child.job_id} className="cursor-pointer hover:bg-accent/50" onClick={() => onViewResults(child.job_id)}>
                          <td className="px-4 py-2">
                            <div className="font-medium text-foreground">{child.symbol}</div>
                            {child.symbol_name ? <div className="text-[11px] text-muted-foreground">{child.symbol_name}</div> : null}
                          </td>
                          <td className="px-4 py-2 text-right">
                            <span className={ret !== undefined && ret !== null ? (ret >= 0 ? 'font-semibold text-red-500' : 'font-semibold text-green-500') : 'text-muted-foreground'}>
                              {ret !== undefined && ret !== null ? `${ret >= 0 ? '+' : ''}${ret.toFixed(2)}%` : '-'}
                            </span>
                          </td>
                          <td className="px-4 py-2 text-right">{annual !== undefined && annual !== null ? `${annual.toFixed(2)}%` : '-'}</td>
                          <td className="px-4 py-2 text-right">{sharpe !== undefined && sharpe !== null ? sharpe.toFixed(2) : '-'}</td>
                          <td className="px-4 py-2 text-right">{maxDrawdown !== undefined && maxDrawdown !== null ? `${maxDrawdown.toFixed(2)}%` : '-'}</td>
                          <td className="px-4 py-2 text-right">
                            {child.status === 'completed' || child.status === 'finished' ? <CheckCircle className="ml-auto h-3.5 w-3.5 text-green-500" /> : null}
                            {child.status === 'started' ? <Clock className="ml-auto h-3.5 w-3.5 text-blue-500" /> : null}
                            {child.status === 'queued' ? <Clock className="ml-auto h-3.5 w-3.5 text-yellow-500" /> : null}
                            {child.status === 'failed' ? <XCircle className="ml-auto h-3.5 w-3.5 text-red-500" /> : null}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {hasMore ? (
                <div className="border-t border-border px-4 py-2 text-center">
                  <button
                    onClick={() => void loadPage(page + 1)}
                    disabled={loadingMore}
                    className="text-sm text-primary hover:underline disabled:opacity-50"
                  >
                    {loadingMore ? t('common:loading') : `... ${t('jobList.loadMore')} (${allResults.length}/${total})`}
                  </button>
                </div>
              ) : null}

              {loadingMore && allResults.length === 0 ? (
                <div className="px-4 py-4 text-center">
                  <Loader className="mx-auto h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : null}
            </div>
          </td>
        </tr>
      ) : null}
    </>
  )
}
