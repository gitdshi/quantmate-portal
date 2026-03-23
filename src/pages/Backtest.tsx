import { useQuery } from '@tanstack/react-query'
import { Activity, BarChart3, GitCompare, Layers, Play, SlidersHorizontal, TrendingUp } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

import BacktestForm from '../components/BacktestForm'
import BacktestJobList from '../components/BacktestJobList'
import BacktestResults from '../components/BacktestResults'
import BulkBacktestForm from '../components/BulkBacktestForm'
import BulkBacktestSummary from '../components/BulkBacktestSummary'
import PerformanceComparison from '../components/PerformanceComparison'
import StrategyOptimization from '../components/StrategyOptimization'
import TabPanel from '../components/ui/TabPanel'
import { queueAPI } from '../lib/api'

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

export default function Backtest() {
  const { t } = useTranslation(['backtest', 'common'])
  const [showSingleForm, setShowSingleForm] = useState(false)
  const [showBulkForm, setShowBulkForm] = useState(false)
  const [activeResultJobId, setActiveResultJobId] = useState<string | null>(null)
  const [activeBulkSummaryJobId, setActiveBulkSummaryJobId] = useState<string | null>(null)
  const [resumeBulkSummaryJobId, setResumeBulkSummaryJobId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'runs' | 'compare' | 'optimize'>('runs')

  const { data: jobsResponse } = useQuery({
    queryKey: ['backtest-jobs', 'overview'],
    queryFn: () => queueAPI.listJobs(undefined, 100),
    refetchInterval: activeTab === 'runs' && !showBulkForm ? 5000 : false,
  })

  const jobs = useMemo<QueueJob[]>(() => {
    const payload = jobsResponse?.data
    return Array.isArray(payload) ? payload : []
  }, [jobsResponse])

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

          {activeTab === 'optimize' && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">{t('page.optimizationPending')}</p>
              <StrategyOptimization />
            </div>
          )}
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
    </div>
  )
}
