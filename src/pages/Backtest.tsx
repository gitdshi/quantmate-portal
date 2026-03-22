import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  BarChart3,
  GitCompare,
  List,
  Play,
  Plus,
  Settings2,
  TrendingUp,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

import BarChart from '../components/charts/BarChart'
import HeatmapChart from '../components/charts/HeatmapChart'
import LineChart from '../components/charts/LineChart'
import Badge from '../components/ui/Badge'
import DataTable, { type Column } from '../components/ui/DataTable'
import FilterBar from '../components/ui/FilterBar'
import Modal from '../components/ui/Modal'
import StatCard from '../components/ui/StatCard'
import TabPanel from '../components/ui/TabPanel'
import { showToast } from '../components/ui/Toast'
import { backtestAPI, queueAPI, strategiesAPI } from '../lib/api'
import type { BacktestResult, Strategy } from '../types'

export default function Backtest() {
  const { t } = useTranslation('backtest')
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState('runs')
  const [newBtModal, setNewBtModal] = useState(false)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [selectedResult, setSelectedResult] = useState<BacktestResult | null>(null)

  const tabs = useMemo(
    () => [
      { key: 'runs', label: t('page.tabs.runs'), icon: <List size={16} /> },
      { key: 'result', label: t('page.tabs.result'), icon: <TrendingUp size={16} /> },
      { key: 'compare', label: t('page.tabs.compare'), icon: <GitCompare size={16} /> },
      { key: 'optimize', label: t('page.tabs.optimize'), icon: <Settings2 size={16} /> },
    ],
    [t]
  )

  // New backtest form
  const [btForm, setBtForm] = useState({
    strategy_class: 'DualMA_Cross',
    symbol: '600519.SH',
    start_date: '2025-01-01',
    end_date: '2026-01-01',
    initial_capital: 1000000,
    benchmark: '000300.SH',
  })

  // ── Data fetching ──────────────────────────────────────────────────
  const { data: strategies = [] } = useQuery<Strategy[]>({
    queryKey: ['strategies'],
    queryFn: () => strategiesAPI.list().then((r) => {
      const d = r.data
      return Array.isArray(d) ? d : d?.data ?? []
    }),
  })

  const { data: history = [], isLoading } = useQuery<BacktestResult[]>({
    queryKey: ['backtest', 'history'],
    queryFn: () => backtestAPI.getHistory().then((r) => {
      const d = r.data
      return Array.isArray(d) ? d : d?.data ?? []
    }),
    refetchInterval: 10_000,
  })

  const submitMutation = useMutation({
    mutationFn: (data: typeof btForm) => queueAPI.submitBacktest({
      strategy_class: data.strategy_class,
      symbol: data.symbol,
      start_date: data.start_date,
      end_date: data.end_date,
      initial_capital: data.initial_capital,
      benchmark: data.benchmark,
    }),
    onSuccess: () => {
      showToast(t('page.submitSuccess'), 'success')
      setNewBtModal(false)
      queryClient.invalidateQueries({ queryKey: ['backtest', 'history'] })
    },
    onError: () => showToast(t('submitFailed'), 'error'),
  })

  // ── Filtered list ──────────────────────────────────────────────────
  const filtered = useMemo(() => {
    let list = history
    if (search) {
      const q = search.toLowerCase()
      list = list.filter((b) => (b.strategy_name || '').toLowerCase().includes(q) || b.symbol.toLowerCase().includes(q))
    }
    if (statusFilter) list = list.filter((b) => b.status === statusFilter)
    return list
  }, [history, search, statusFilter])

  // ── Columns ────────────────────────────────────────────────────────
  const runColumns: Column<BacktestResult>[] = [
    { key: 'job_id', label: t('jobList.id'), className: 'font-mono text-xs', render: (r) => r.job_id.slice(0, 8) },
    { key: 'strategy_name', label: t('jobList.strategy'), render: (r) => r.strategy_name || '-' },
    { key: 'symbol', label: t('symbol'), className: 'font-mono' },
    { key: 'status', label: t('jobList.status'), render: (r) => <Badge variant={r.status === 'finished' ? 'success' : r.status === 'failed' ? 'destructive' : r.status === 'started' ? 'primary' : 'muted'}>{r.status === 'finished' ? t('status.finished') : r.status === 'failed' ? t('status.failed') : r.status === 'started' ? t('status.running') : t('status.queued')}</Badge> },
    { key: 'total_return', label: t('metrics.totalReturn'), sortable: true, render: (r) => r.statistics ? <span className={r.statistics.total_return >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>{r.statistics.total_return >= 0 ? '+' : ''}{(r.statistics.total_return * 100).toFixed(2)}%</span> : '-' },
    { key: 'sharpe', label: 'Sharpe', render: (r) => r.statistics?.sharpe_ratio?.toFixed(2) || '-' },
    { key: 'max_dd', label: t('metrics.maxDrawdown'), render: (r) => r.statistics ? <span className="text-red-600 dark:text-red-400">{(r.statistics.max_drawdown * 100).toFixed(2)}%</span> : '-' },
    { key: 'start_date', label: t('common:date', { defaultValue: 'Date' }), render: (r) => `${r.start_date} ~ ${r.end_date}` },
  ]

  // ── Result section derived data ────────────────────────────────────
  const result = selectedResult
  const stats = result?.statistics

  // ── Render ─────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t('page.title')}</h1>
          <p className="text-sm text-muted-foreground">{t('page.subtitle')}</p>
        </div>
        <button onClick={() => setNewBtModal(true)} className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md bg-primary text-white hover:opacity-90">
          <Plus size={16} /> {t('page.newBacktest')}
        </button>
      </div>

      <TabPanel tabs={tabs} activeTab={activeTab} onChange={setActiveTab}>
        {/* ── Runs ─────────────────────────────────────── */}
        {activeTab === 'runs' && (
          <div className="space-y-4">
            <FilterBar
              searchValue={search}
              onSearchChange={setSearch}
              searchPlaceholder={t('page.searchPlaceholder')}
              filters={[{
                key: 'status',
                value: statusFilter,
                options: [
                  { value: 'finished', label: t('status.finished') },
                  { value: 'started', label: t('status.running') },
                  { value: 'failed', label: t('status.failed') },
                  { value: 'queued', label: t('status.queued') },
                ],
                onChange: setStatusFilter,
                placeholder: t('page.allStatuses'),
              }]}
            />
            <DataTable
              columns={runColumns}
              data={filtered}
              keyField="job_id"
              emptyText={t('page.emptyRuns')}
              onRowClick={(row) => { setSelectedResult(row); setActiveTab('result') }}
            />
          </div>
        )}

        {/* ── Result ───────────────────────────────────── */}
        {activeTab === 'result' && (
          <div className="space-y-4">
            {!result ? (
              <div className="text-center py-12 text-muted-foreground">{t('page.selectRun')}</div>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <StatCard label={t('metrics.totalReturn')} value={stats ? `${stats.total_return >= 0 ? '+' : ''}${(stats.total_return * 100).toFixed(2)}%` : '-'} changeType={stats && stats.total_return >= 0 ? 'positive' : 'negative'} />
                  <StatCard label={t('metrics.annualReturn')} value={stats ? `${stats.annual_return >= 0 ? '+' : ''}${(stats.annual_return * 100).toFixed(2)}%` : '-'} changeType={stats && stats.annual_return >= 0 ? 'positive' : 'negative'} />
                  <StatCard label={t('metrics.sharpeRatio')} value={stats?.sharpe_ratio?.toFixed(2) || '-'} />
                  <StatCard label={t('metrics.maxDrawdown')} value={stats ? `${(stats.max_drawdown * 100).toFixed(2)}%` : '-'} changeType="negative" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <StatCard label={t('metrics.winRate')} value={stats ? `${(stats.winning_rate * 100).toFixed(1)}%` : '-'} />
                  <StatCard label={t('metrics.profitFactor')} value={stats?.profit_factor?.toFixed(2) || '-'} />
                  <StatCard label={t('metrics.totalTrades')} value={stats?.total_trades ?? '-'} />
                  <StatCard label={t('symbol')} value={result.symbol} />
                </div>

                <div className="rounded-lg border border-border bg-card p-5">
                  <h3 className="font-semibold text-card-foreground mb-4">{t('results.equity')}</h3>
                  {/* TODO: Connect to detailed equity curve API when available */}
                  <div className="text-center py-12 text-muted-foreground">
                    {t('results.strategyDateSummary', { strategy: result.strategy_name, start: result.start_date, end: result.end_date })}
                    <br />{t('results.equityPending')}
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* ── Compare ──────────────────────────────────── */}
        {activeTab === 'compare' && (
          <div className="space-y-4">
            <div className="rounded-lg border border-border bg-card p-5">
              <h3 className="font-semibold text-card-foreground mb-4">{t('page.compareTitle')}</h3>
              <div className="flex flex-wrap gap-3 mb-4">
                {(strategies.length > 0 ? strategies.slice(0, 4) : [
                  { id: 1, name: 'DualMA_Cross' },
                  { id: 2, name: 'RSI_Reversal' },
                  { id: 3, name: 'BollingerBand' },
                  { id: 4, name: 'MACD_Trend' },
                ]).map((s) => (
                  <label key={s.id} className="flex items-center gap-2 text-sm cursor-pointer">
                    <input type="checkbox" className="rounded" defaultChecked={s.id <= 2} />
                    {s.name}
                  </label>
                ))}
              </div>
              <button className="px-3 py-1.5 text-sm rounded-md bg-primary text-white hover:opacity-90">
                {t('comparison.generate')}
              </button>
            </div>

            {/* TODO: Connect to analytics compare API */}
            <div className="rounded-lg border border-border bg-card overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted">
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">{t('comparison.metric')}</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">DualMA_Cross</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">RSI_Reversal</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { label: t('metrics.totalReturn'), v1: '+23.50%', v2: '+18.20%' },
                    { label: t('metrics.annualReturn'), v1: '+31.20%', v2: '+24.30%' },
                    { label: t('comparison.sharpe'), v1: '1.42', v2: '1.18' },
                    { label: t('metrics.maxDrawdown'), v1: '-12.30%', v2: '-15.80%' },
                    { label: t('metrics.winRate'), v1: '62.5%', v2: '58.3%' },
                    { label: t('metrics.profitFactor'), v1: '1.85', v2: '1.62' },
                    { label: t('metrics.totalTrades'), v1: '48', v2: '36' },
                    { label: t('comparison.calmarRatio'), v1: '2.54', v2: '1.54' },
                  ].map((row) => (
                    <tr key={row.label} className="border-b border-border">
                      <td className="px-4 py-2 font-medium">{row.label}</td>
                      <td className="px-4 py-2">{row.v1}</td>
                      <td className="px-4 py-2">{row.v2}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── Optimize ─────────────────────────────────── */}
        {activeTab === 'optimize' && (
          <div className="space-y-4">
            {/* TODO: Connect to optimization API */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="rounded-lg border border-border bg-card p-5">
                <h3 className="font-semibold text-card-foreground mb-4">{t('page.optimizationConfig')}</h3>
                <div className="flex flex-col gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">{t('strategy')}</label>
                    <select className="w-full px-3 py-2 text-sm rounded-md border border-border bg-background">
                      <option>DualMA_Cross</option>
                      <option>RSI_Reversal</option>
                    </select>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs text-muted-foreground mb-1">{t('optimization.parameterLabel', { name: 'short_window' })}</label>
                      <div className="flex gap-2">
                        <input type="number" defaultValue={3} className="w-full px-2 py-1 text-sm rounded-md border border-border bg-background" placeholder={t('optimization.minValue')} />
                        <input type="number" defaultValue={15} className="w-full px-2 py-1 text-sm rounded-md border border-border bg-background" placeholder={t('optimization.maxValue')} />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs text-muted-foreground mb-1">{t('optimization.parameterLabel', { name: 'long_window' })}</label>
                      <div className="flex gap-2">
                        <input type="number" defaultValue={10} className="w-full px-2 py-1 text-sm rounded-md border border-border bg-background" placeholder={t('optimization.minValue')} />
                        <input type="number" defaultValue={60} className="w-full px-2 py-1 text-sm rounded-md border border-border bg-background" placeholder={t('optimization.maxValue')} />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs text-muted-foreground mb-1">{t('optimization.objective')}</label>
                      <select className="w-full px-2 py-1 text-sm rounded-md border border-border bg-background">
                        <option>Sharpe</option>
                        <option>{t('metrics.totalReturn')}</option>
                        <option>Calmar</option>
                      </select>
                    </div>
                  </div>
                  <button className="px-3 py-1.5 text-sm rounded-md bg-primary text-white hover:opacity-90" onClick={() => showToast(t('page.optimizeSuccess'), 'success')}>
                    <Play size={14} className="inline mr-1" />{t('optimization.combinations', { count: 143 })}
                  </button>
                </div>
              </div>

              <div className="rounded-lg border border-border bg-card p-5">
                <h3 className="font-semibold text-card-foreground mb-4">{t('page.optimizationHeatmap')}</h3>
                <div className="text-center py-8 text-muted-foreground text-sm">
                  {t('optimization.pending')}
                </div>
              </div>
            </div>
          </div>
        )}
      </TabPanel>

      {/* New Backtest Modal */}
      <Modal open={newBtModal} onClose={() => setNewBtModal(false)} title={t('page.newBacktest')} footer={
        <>
          <button onClick={() => setNewBtModal(false)} className="px-4 py-2 text-sm rounded-md border border-border hover:bg-muted">{t('common:cancel')}</button>
          <button
            onClick={() => submitMutation.mutate(btForm)}
            disabled={submitMutation.isPending}
            className="px-4 py-2 text-sm rounded-md bg-primary text-white hover:opacity-90 disabled:opacity-50"
          >
            {t('runBacktest')}
          </button>
        </>
      }>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">{t('strategy')}</label>
            <select value={btForm.strategy_class} onChange={(e) => setBtForm({ ...btForm, strategy_class: e.target.value })} className="w-full px-3 py-2 text-sm rounded-md border border-border bg-background">
              {strategies.length > 0
                ? strategies.map((s) => <option key={s.id} value={s.class_name || s.name}>{s.name}</option>)
                : ['DualMA_Cross', 'RSI_Reversal', 'BollingerBand', 'MyAlpha01'].map((n) => <option key={n} value={n}>{n}</option>)
              }
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">{t('symbol')}</label>
            <input type="text" value={btForm.symbol} onChange={(e) => setBtForm({ ...btForm, symbol: e.target.value })} className="w-full px-3 py-2 text-sm rounded-md border border-border bg-background" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">{t('startDate')}</label>
            <input type="date" value={btForm.start_date} onChange={(e) => setBtForm({ ...btForm, start_date: e.target.value })} className="w-full px-3 py-2 text-sm rounded-md border border-border bg-background" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">{t('endDate')}</label>
            <input type="date" value={btForm.end_date} onChange={(e) => setBtForm({ ...btForm, end_date: e.target.value })} className="w-full px-3 py-2 text-sm rounded-md border border-border bg-background" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">{t('initialCapital')}</label>
            <input type="number" value={btForm.initial_capital} onChange={(e) => setBtForm({ ...btForm, initial_capital: +e.target.value })} className="w-full px-3 py-2 text-sm rounded-md border border-border bg-background" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">{t('form.benchmark')}</label>
            <select value={btForm.benchmark} onChange={(e) => setBtForm({ ...btForm, benchmark: e.target.value })} className="w-full px-3 py-2 text-sm rounded-md border border-border bg-background">
              <option value="000300.SH">{t('form.benchmarkOptions.hs300')}</option>
              <option value="000016.SH">{t('form.benchmarkOptions.sse50')}</option>
              <option value="000905.SH">{t('form.benchmarkOptions.csi500')}</option>
            </select>
          </div>
        </div>
      </Modal>
    </div>
  )
}
