import { useQuery } from '@tanstack/react-query'
import { Activity, BarChart3, GitCompare, Layers, Play, SlidersHorizontal, TrendingUp } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

import BacktestForm from '../components/BacktestForm'
import BacktestJobList from '../components/BacktestJobList'
import BacktestResults from '../components/BacktestResults'
import BulkBacktestForm from '../components/BulkBacktestForm'
import BulkBacktestSummary from '../components/BulkBacktestSummary'
import Modal from '../components/ui/Modal'
import OptimizationTaskList from '../components/OptimizationTaskList'
import OptimizationTaskResultsModal from '../components/OptimizationTaskResultsModal'
import PerformanceComparison from '../components/PerformanceComparison'
import StrategyOptimization from '../components/StrategyOptimization'
import TabPanel from '../components/ui/TabPanel'
import { backtestAPI, queueAPI } from '../lib/api'

type QueueJob = {
  job_id: string
  status: string
  type?: string
  created_at: string
  updated_at?: string
  symbol?: string
  symbol_name?: string
  strategy_name?: string
  strategy_class?: string
  result?: {
    statistics?: {
      total_return?: number
    }
    best_return?: number
    best_symbol?: string
  }
}

type UnifiedRun = {
  job_id: string
  subject_type?: 'strategy' | 'factor' | 'composite'
  subject_name?: string | null
  status: string
  start_date?: string | null
  end_date?: string | null
  created_at?: string | null
  summary?: {
    total_return?: number
    sharpe_ratio?: number
    ic_mean?: number
  }
}

type UnifiedRunDetail = UnifiedRun & {
  result?: {
    statistics?: {
      total_return?: number
      annual_return?: number
      max_drawdown?: number
      sharpe_ratio?: number
      total_trades?: number
      winning_rate?: number
    }
    factor_metrics?: {
      ic_mean?: number
      ic_ir?: number
      turnover?: number
    }
  }
}

export default function Backtest() {
  const { t } = useTranslation(['backtest', 'common'])
  const [showSingleForm, setShowSingleForm] = useState(false)
  const [showBulkForm, setShowBulkForm] = useState(false)
  const [activeResultJobId, setActiveResultJobId] = useState<string | null>(null)
  const [activeBulkSummaryJobId, setActiveBulkSummaryJobId] = useState<string | null>(null)
  const [resumeBulkSummaryJobId, setResumeBulkSummaryJobId] = useState<string | null>(null)
  const [activeOptimizationTaskId, setActiveOptimizationTaskId] = useState<number | null>(null)
  const [activeUnifiedRunId, setActiveUnifiedRunId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'runs' | 'compare' | 'optimize'>('runs')

  const { data: jobsResponse } = useQuery({
    queryKey: ['backtest-jobs', 'overview'],
    queryFn: () => queueAPI.listJobs(undefined, 100),
    retry: 0,
    refetchOnWindowFocus: false,
    refetchInterval: activeTab === 'runs' && !showBulkForm && !activeUnifiedRunId ? 5000 : false,
  })

  const { data: unifiedRunsResponse } = useQuery({
    queryKey: ['unified-backtest-runs'],
    queryFn: () => backtestAPI.listRuns({ page_size: 50 }),
    retry: 0,
    refetchOnWindowFocus: false,
    refetchInterval: activeTab === 'runs' && !activeUnifiedRunId ? 5000 : false,
  })

  const {
    data: unifiedRunDetail,
    isPending: isUnifiedRunDetailPending,
    isError: isUnifiedRunDetailError,
  } = useQuery<UnifiedRunDetail>({
    queryKey: ['unified-backtest-run', activeUnifiedRunId],
    queryFn: () => backtestAPI.getRun(activeUnifiedRunId!).then((response) => response.data),
    enabled: !!activeUnifiedRunId,
    retry: 0,
    refetchOnWindowFocus: false,
  })

  const jobs = useMemo<QueueJob[]>(() => {
    const payload = jobsResponse?.data
    return Array.isArray(payload) ? payload : []
  }, [jobsResponse])

  const unifiedRuns = useMemo<UnifiedRun[]>(() => {
    const payload = unifiedRunsResponse?.data
    return Array.isArray(payload) ? payload : payload?.data ?? []
  }, [unifiedRunsResponse])

  const summary = useMemo(() => {
    const runningStatuses = new Set(['queued', 'started'])
    const finishedStatuses = new Set(['finished', 'completed'])

    const total = jobs.length
    const running = jobs.filter((job) => runningStatuses.has(job.status)).length
    const completed = jobs.filter((job) => finishedStatuses.has(job.status)).length
    const bulk = jobs.filter((job) => job.type === 'bulk_backtest' || job.job_id.startsWith('bulk_')).length

    return {
      total,
      running,
      completed,
      bulk,
      completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
    }
  }, [jobs])

  const unifiedSummary = useMemo(() => {
    return unifiedRuns.reduce(
      (acc, run) => {
        acc.total += 1
        if (run.subject_type === 'strategy') acc.strategy += 1
        if (run.subject_type === 'factor') acc.factor += 1
        if (run.subject_type === 'composite') acc.composite += 1
        return acc
      },
      { total: 0, strategy: 0, factor: 0, composite: 0 }
    )
  }, [unifiedRuns])

  const activeUnifiedRun = useMemo(
    () => unifiedRuns.find((run) => run.job_id === activeUnifiedRunId) ?? null,
    [activeUnifiedRunId, unifiedRuns]
  )

  const formatUnifiedStatus = (status?: string) => {
    if (!status) return '-'
    return t(`unified.status.${status}`, { defaultValue: status })
  }

  const formatUnifiedType = (subjectType?: UnifiedRun['subject_type']) => {
    if (!subjectType) return '-'
    return t(`unified.types.${subjectType}`, { defaultValue: subjectType })
  }

  const tabs = useMemo(
    () => [
      { key: 'runs', label: t('page.tabs.runs'), icon: <BarChart3 size={16} /> },
      { key: 'compare', label: t('page.tabs.compare'), icon: <GitCompare size={16} /> },
      { key: 'optimize', label: t('page.tabs.optimize'), icon: <SlidersHorizontal size={16} /> },
    ],
    [t]
  )

  const handleOpenChildResult = (jobId: string) => {
    if (activeBulkSummaryJobId) {
      setResumeBulkSummaryJobId(activeBulkSummaryJobId)
    }
    setActiveBulkSummaryJobId(null)
    setActiveResultJobId(jobId)
  }

  const handleCloseResult = () => {
    setActiveResultJobId(null)
    if (resumeBulkSummaryJobId) {
      setActiveBulkSummaryJobId(resumeBulkSummaryJobId)
      setResumeBulkSummaryJobId(null)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t('page.title')}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t('page.subtitle')}</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {activeTab === 'runs' && (
            <>
              <button
                onClick={() => setShowBulkForm(true)}
                className="inline-flex items-center gap-2 rounded-md border border-border bg-card px-4 py-2 text-sm font-medium text-card-foreground transition-colors hover:bg-muted"
              >
                <Layers className="h-4 w-4" />
                {t('page.bulkAction')}
              </button>
              <button
                onClick={() => setShowSingleForm(true)}
                className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
              >
                <Play className="h-4 w-4" />
                {t('page.newBacktest')}
              </button>
            </>
          )}

          {activeTab === 'optimize' && <StrategyOptimization onCreated={() => setActiveTab('optimize')} />}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="rounded-lg border border-border bg-card px-3 py-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">{t('jobList.title')}</span>
            <BarChart3 className="h-4 w-4 text-primary" />
          </div>
          <div className="mt-1 text-lg font-semibold text-card-foreground">{summary.total}</div>
        </div>
        <div className="rounded-lg border border-border bg-card px-3 py-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">{t('status.running')}</span>
            <Activity className="h-4 w-4 text-blue-500" />
          </div>
          <div className="mt-1 text-lg font-semibold text-card-foreground">{summary.running}</div>
        </div>
        <div className="rounded-lg border border-border bg-card px-3 py-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">{t('status.finished')}</span>
            <TrendingUp className="h-4 w-4 text-emerald-500" />
          </div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-lg font-semibold text-card-foreground">{summary.completed}</span>
            <span className="text-xs text-muted-foreground">{summary.completionRate}%</span>
          </div>
        </div>
        <div className="rounded-lg border border-border bg-card px-3 py-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">{t('bulk.title')}</span>
            <Layers className="h-4 w-4 text-orange-500" />
          </div>
          <div className="mt-1 text-lg font-semibold text-card-foreground">{summary.bulk}</div>
        </div>
      </div>

      <div className="rounded-lg border border-border bg-card p-5">
        <div className="mb-4 flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-card-foreground">{t('unified.title')}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{t('unified.subtitle')}</p>
          </div>
          <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
            <span className="rounded-full bg-muted px-3 py-1">{t('unified.summary.all', { count: unifiedSummary.total })}</span>
            <span className="rounded-full bg-muted px-3 py-1">{t('unified.summary.strategy', { count: unifiedSummary.strategy })}</span>
            <span className="rounded-full bg-muted px-3 py-1">{t('unified.summary.factor', { count: unifiedSummary.factor })}</span>
            <span className="rounded-full bg-muted px-3 py-1">{t('unified.summary.composite', { count: unifiedSummary.composite })}</span>
          </div>
        </div>

        {unifiedRuns.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t('unified.empty')}</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="min-w-full text-sm">
              <thead className="bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-3 py-2">{t('unified.columns.subject')}</th>
                  <th className="px-3 py-2">{t('unified.columns.type')}</th>
                  <th className="px-3 py-2">{t('unified.columns.status')}</th>
                  <th className="px-3 py-2">{t('unified.columns.return')}</th>
                  <th className="px-3 py-2">{t('unified.columns.sharpe')}</th>
                  <th className="px-3 py-2">{t('unified.columns.created')}</th>
                  <th className="px-3 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {unifiedRuns.map((run) => (
                  <tr
                    key={run.job_id}
                    className={`border-t border-border ${activeUnifiedRunId === run.job_id ? 'bg-muted/30' : ''}`}
                  >
                    <td className="px-3 py-2 font-medium text-card-foreground">{run.subject_name || run.job_id}</td>
                    <td className="px-3 py-2 text-muted-foreground">{formatUnifiedType(run.subject_type)}</td>
                    <td className="px-3 py-2">
                      <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${run.status === 'completed' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : run.status === 'failed' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' : 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'}`}>
                        {formatUnifiedStatus(run.status)}
                      </span>
                    </td>
                    <td className="px-3 py-2">{run.summary?.total_return != null ? `${(run.summary.total_return * 100).toFixed(2)}%` : '-'}</td>
                    <td className="px-3 py-2">{run.summary?.sharpe_ratio?.toFixed(3) ?? '-'}</td>
                    <td className="px-3 py-2 text-muted-foreground">{run.created_at?.slice(0, 16).replace('T', ' ') ?? '-'}</td>
                    <td className="px-3 py-2 text-right">
                      <button className="text-xs font-medium text-primary hover:underline" onClick={() => setActiveUnifiedRunId(run.job_id)}>
                        {activeUnifiedRunId === run.job_id && isUnifiedRunDetailPending ? t('unified.actions.loading') : t('unified.actions.view')}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal
        open={!!activeUnifiedRunId}
        onClose={() => setActiveUnifiedRunId(null)}
        title={unifiedRunDetail?.subject_name || activeUnifiedRun?.subject_name || t('unified.detailFallbackTitle')}
        size="lg"
        footer={
          <button
            className="rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted"
            onClick={() => setActiveUnifiedRunId(null)}
          >
            {t('unified.actions.close')}
          </button>
        }
      >
        {isUnifiedRunDetailPending ? (
          <p className="text-sm text-muted-foreground">{t('unified.loadingDetail')}</p>
        ) : isUnifiedRunDetailError ? (
          <p className="text-sm text-destructive">{t('unified.detailLoadFailed')}</p>
        ) : unifiedRunDetail ? (
          <div className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">
                {t('unified.detailSubtitle', {
                  type: formatUnifiedType(unifiedRunDetail.subject_type),
                  status: formatUnifiedStatus(unifiedRunDetail.status),
                })}
              </p>
            </div>

            <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
              <div className="rounded-md border border-border bg-card px-3 py-2">
                <div className="text-xs text-muted-foreground">{t('metrics.totalReturn')}</div>
                <div className="mt-1 text-sm font-semibold">{unifiedRunDetail.result?.statistics?.total_return != null ? `${(unifiedRunDetail.result.statistics.total_return * 100).toFixed(2)}%` : '-'}</div>
              </div>
              <div className="rounded-md border border-border bg-card px-3 py-2">
                <div className="text-xs text-muted-foreground">{t('metrics.annualReturn')}</div>
                <div className="mt-1 text-sm font-semibold">{unifiedRunDetail.result?.statistics?.annual_return != null ? `${(unifiedRunDetail.result.statistics.annual_return * 100).toFixed(2)}%` : '-'}</div>
              </div>
              <div className="rounded-md border border-border bg-card px-3 py-2">
                <div className="text-xs text-muted-foreground">{t('metrics.maxDrawdown')}</div>
                <div className="mt-1 text-sm font-semibold">{unifiedRunDetail.result?.statistics?.max_drawdown != null ? `${(unifiedRunDetail.result.statistics.max_drawdown * 100).toFixed(2)}%` : '-'}</div>
              </div>
              <div className="rounded-md border border-border bg-card px-3 py-2">
                <div className="text-xs text-muted-foreground">{t('metrics.sharpeRatio')}</div>
                <div className="mt-1 text-sm font-semibold">{unifiedRunDetail.result?.statistics?.sharpe_ratio?.toFixed(3) ?? '-'}</div>
              </div>
              <div className="rounded-md border border-border bg-card px-3 py-2">
                <div className="text-xs text-muted-foreground">{t('unified.metrics.icMean')}</div>
                <div className="mt-1 text-sm font-semibold">{unifiedRunDetail.result?.factor_metrics?.ic_mean?.toFixed(4) ?? '-'}</div>
              </div>
              <div className="rounded-md border border-border bg-card px-3 py-2">
                <div className="text-xs text-muted-foreground">{t('unified.metrics.icIr')}</div>
                <div className="mt-1 text-sm font-semibold">{unifiedRunDetail.result?.factor_metrics?.ic_ir?.toFixed(3) ?? '-'}</div>
              </div>
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">{t('unified.detailEmpty')}</p>
        )}
      </Modal>

      <div className="rounded-lg border border-border bg-card p-5">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-card-foreground">{t('jobList.title')}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{t('page.workflowHint')}</p>
          </div>
        </div>

        <TabPanel tabs={tabs} activeTab={activeTab} onChange={(tab) => setActiveTab(tab as 'runs' | 'compare' | 'optimize')}>
          {activeTab === 'runs' && (
            <BacktestJobList
              onViewResults={(jobId) => {
                setResumeBulkSummaryJobId(null)
                setActiveResultJobId(jobId)
              }}
              onViewBulkSummary={(jobId) => setActiveBulkSummaryJobId(jobId)}
            />
          )}

          {activeTab === 'compare' && <PerformanceComparison />}

          {activeTab === 'optimize' && <OptimizationTaskList onViewResults={(taskId) => setActiveOptimizationTaskId(taskId)} />}
        </TabPanel>
      </div>

      {showSingleForm && (
        <BacktestForm
          onClose={() => setShowSingleForm(false)}
          onSubmitSuccess={() => {
            setShowSingleForm(false)
            setActiveTab('runs')
            setActiveResultJobId(null)
            setActiveBulkSummaryJobId(null)
            setResumeBulkSummaryJobId(null)
          }}
        />
      )}

      {showBulkForm && (
        <BulkBacktestForm
          onClose={() => setShowBulkForm(false)}
          onSubmitSuccess={() => {
            setShowBulkForm(false)
            setActiveTab('runs')
            setActiveResultJobId(null)
            setActiveBulkSummaryJobId(null)
            setResumeBulkSummaryJobId(null)
          }}
        />
      )}

      {activeResultJobId && (
        <BacktestResults jobId={activeResultJobId} onClose={handleCloseResult} />
      )}

      {activeBulkSummaryJobId && (
        <BulkBacktestSummary
          jobId={activeBulkSummaryJobId}
          onClose={() => setActiveBulkSummaryJobId(null)}
          onViewChildResult={handleOpenChildResult}
        />
      )}

      {activeOptimizationTaskId !== null && (
        <OptimizationTaskResultsModal taskId={activeOptimizationTaskId} onClose={() => setActiveOptimizationTaskId(null)} />
      )}
    </div>
  )
}
