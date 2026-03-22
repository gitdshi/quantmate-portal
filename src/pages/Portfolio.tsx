import { useQuery } from '@tanstack/react-query'
import {
  BarChart3,
  Briefcase,
  PieChart as PieChartIcon,
  Shield,
  Wallet,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

import LineChart from '../components/charts/LineChart'
import Badge from '../components/ui/Badge'
import DataTable, { type Column } from '../components/ui/DataTable'
import FilterBar from '../components/ui/FilterBar'
import Modal from '../components/ui/Modal'
import ProgressBar from '../components/ui/ProgressBar'
import StatCard from '../components/ui/StatCard'
import TabPanel from '../components/ui/TabPanel'
import { showToast } from '../components/ui/Toast'
import { analyticsAPI, portfolioAPI } from '../lib/api'
import { chartPalette, themeColors } from '../lib/theme'
import type { DashboardMetrics, Position, RiskMetrics } from '../types'

export default function Portfolio() {
  const { t } = useTranslation('portfolio')
  const [activeTab, setActiveTab] = useState('overview')
  const [search, setSearch] = useState('')
  const [strategyFilter, setStrategyFilter] = useState('')
  const [dirFilter, setDirFilter] = useState('')
  const [riskModalOpen, setRiskModalOpen] = useState(false)
  const [rebalanceModalOpen, setRebalanceModalOpen] = useState(false)

  // ── Data fetching ──────────────────────────────────────────────────
  const { data: dashData, isLoading: dashLoading } = useQuery<DashboardMetrics>({
    queryKey: ['dashboard'],
    queryFn: () => analyticsAPI.dashboard().then((r) => r.data),
  })

  const { data: positions = [], isLoading: posLoading } = useQuery<Position[]>({
    queryKey: ['portfolio', 'positions'],
    queryFn: () => portfolioAPI.positions().then((r) => r.data?.positions ?? r.data ?? []),
  })

  const { data: riskData } = useQuery<RiskMetrics>({
    queryKey: ['analytics', 'risk'],
    queryFn: () => analyticsAPI.riskMetrics().then((r) => r.data),
    enabled: activeTab === 'risk',
  })

  // ── Derived values ─────────────────────────────────────────────────
  const stats = dashData?.portfolio_stats
  const totalValue = stats?.total_value ?? 0
  const positionVale = positions.reduce((sum, p) => sum + p.market_value, 0)
  const cash = stats?.cash ?? totalValue - positionVale
  const positionRatio = totalValue > 0 ? ((positionVale / totalValue) * 100).toFixed(1) : '0'

  const navDates = (dashData?.performance_history ?? []).map((p) => p.date)
  const navValues = (dashData?.performance_history ?? []).map((p) => p.value)

  const strategies = useMemo(() => {
    const set = new Set(positions.map((p) => p.strategy).filter(Boolean))
    return Array.from(set) as string[]
  }, [positions])

  const filteredPositions = useMemo(() => {
    let list = positions
    if (search) {
      const q = search.toLowerCase()
      list = list.filter((p) => p.symbol.toLowerCase().includes(q) || (p.name || '').toLowerCase().includes(q))
    }
    if (strategyFilter) list = list.filter((p) => p.strategy === strategyFilter)
    if (dirFilter) list = list.filter((p) => p.direction === dirFilter)
    return list
  }, [positions, search, strategyFilter, dirFilter])

  // Holdings distribution
  const holdingsDistrib = useMemo(() => {
    if (!positions.length) return []
    const totalMV = positions.reduce((s, p) => s + p.market_value, 0)
    return positions
      .map((p) => ({ name: p.name || p.symbol, pct: totalMV > 0 ? +((p.market_value / totalMV) * 100).toFixed(1) : 0 }))
      .sort((a, b) => b.pct - a.pct)
  }, [positions])

  const tabs = useMemo(() => [
    { key: 'overview', label: t('page.tabs.overview'), icon: <Briefcase size={16} /> },
    { key: 'positions', label: t('page.tabs.positions'), icon: <Wallet size={16} /> },
    { key: 'risk', label: t('page.tabs.risk'), icon: <Shield size={16} /> },
    { key: 'allocation', label: t('page.tabs.allocation'), icon: <PieChartIcon size={16} /> },
  ], [t])

  // ── Risk rules (placeholder) ───────────────────────────────────────
  const riskRules = useMemo(() => [
    { rule: t('page.riskRules.singlePosition'), threshold: '≤ 20%', current: holdingsDistrib[0]?.pct ? `${holdingsDistrib[0].pct}%` : '0%', ok: (holdingsDistrib[0]?.pct ?? 0) <= 20 },
    { rule: t('page.riskRules.totalPosition'), threshold: '≤ 80%', current: `${positionRatio}%`, ok: +positionRatio <= 80 },
    { rule: t('page.riskRules.dailyLoss'), threshold: '≤ 3%', current: `${Math.abs(stats?.daily_pnl_pct ?? 0).toFixed(1)}%`, ok: Math.abs(stats?.daily_pnl_pct ?? 0) <= 3 },
    { rule: t('page.riskRules.drawdown'), threshold: '≤ 15%', current: `${(riskData?.max_drawdown ?? dashData?.risk_metrics?.max_drawdown ?? 0).toFixed(1)}%`, ok: (riskData?.max_drawdown ?? dashData?.risk_metrics?.max_drawdown ?? 0) <= 15 },
    { rule: t('page.riskRules.concentration'), threshold: '≤ 30%', current: `${(riskData?.concentration ?? 0).toFixed(1)}%`, ok: (riskData?.concentration ?? 0) <= 30 },
  ], [dashData?.risk_metrics?.max_drawdown, holdingsDistrib, positionRatio, riskData?.concentration, riskData?.max_drawdown, stats?.daily_pnl_pct, t])

  // ── Columns ────────────────────────────────────────────────────────
  const posColumns: Column<Position>[] = useMemo(() => [
    { key: 'symbol', label: t('page.table.symbol'), sortable: true, className: 'font-mono' },
    { key: 'name', label: t('page.table.name') },
    { key: 'strategy', label: t('page.table.strategy') },
    { key: 'direction', label: t('page.table.direction'), render: (r) => <Badge variant={r.direction === 'short' ? 'destructive' : 'success'}>{r.direction === 'short' ? t('page.direction.short') : t('page.direction.long')}</Badge> },
    { key: 'quantity', label: t('page.table.quantity'), sortable: true },
    { key: 'avg_cost', label: t('page.table.avgCost'), render: (r) => `¥${r.avg_cost.toFixed(2)}` },
    { key: 'market_price', label: t('page.table.marketPrice'), render: (r) => `¥${r.market_price.toFixed(2)}` },
    { key: 'market_value', label: t('page.table.marketValue'), sortable: true, render: (r) => `¥${r.market_value.toLocaleString()}` },
    {
      key: 'pnl', label: t('page.table.pnl'), sortable: true,
      render: (r) => <span className={r.pnl >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>{r.pnl >= 0 ? '+' : ''}¥{Math.abs(r.pnl).toLocaleString()}</span>,
    },
    {
      key: 'pnl_pct', label: t('page.table.pnlPct'), sortable: true,
      render: (r) => <span className={r.pnl_pct >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>{r.pnl_pct >= 0 ? '+' : ''}{r.pnl_pct.toFixed(2)}%</span>,
    },
  ], [t])

  const targetAllocations = useMemo(() => [
    { name: t('analytics.sectorAllocation'), target: 30, color: themeColors.primary },
    { name: t('risk.topPosition'), target: 25, color: '#22c55e' },
    { name: t('risk.top3Positions'), target: 20, color: '#eab308' },
    { name: t('risk.top5Positions'), target: 25, color: '#ef4444' },
  ], [t])

  const rebalanceItems = useMemo(() => [
    { name: t('page.rebalanceItems.maotai'), action: t('page.modals.reduce', { value: '62.2' }), target: '30%', isReduce: true },
    { name: t('page.rebalanceItems.bankEtf'), action: t('page.modals.buy', { value: '25' }), target: '25%', isReduce: false },
    { name: t('page.rebalanceItems.solarEtf'), action: t('page.modals.increase', { value: '12.2' }), target: '20%', isReduce: false },
    { name: t('page.rebalanceItems.techEtf'), action: t('page.modals.buy', { value: '25' }), target: '25%', isReduce: false },
  ], [t])

  const loading = dashLoading || posLoading

  // ── Render ─────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t('title')}</h1>
          <p className="text-sm text-muted-foreground">{t('subtitle')}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setRiskModalOpen(true)} className="px-3 py-1.5 text-sm rounded-md border border-border hover:bg-muted">{t('page.actions.riskSettings')}</button>
          <button onClick={() => setRebalanceModalOpen(true)} className="px-3 py-1.5 text-sm rounded-md bg-primary text-white hover:opacity-90">{t('page.actions.rebalance')}</button>
        </div>
      </div>

      <TabPanel tabs={tabs} activeTab={activeTab} onChange={setActiveTab}>
        {/* ── Overview ────────────────────────────────── */}
        {activeTab === 'overview' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard label={t('page.stats.totalValue')} value={`¥${totalValue.toLocaleString()}`} icon={Wallet} iconColor="text-blue-500" />
              <StatCard label={t('page.stats.positionValue')} value={`¥${positionVale.toLocaleString()}`} icon={Briefcase} iconColor="text-green-500" />
              <StatCard label={t('page.stats.availableCash')} value={`¥${cash.toLocaleString()}`} icon={BarChart3} iconColor="text-purple-500" />
              <StatCard label={t('page.stats.positionRatio')} value={`${positionRatio}%`} icon={PieChartIcon} iconColor="text-yellow-500" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard label={t('page.stats.totalPnl')} value={`${(stats?.total_pnl ?? 0) >= 0 ? '+' : ''}¥${(stats?.total_pnl ?? 0).toLocaleString()}`} changeType={(stats?.total_pnl ?? 0) >= 0 ? 'positive' : 'negative'} />
              <StatCard label={t('page.stats.dailyPnl')} value={`${(stats?.daily_pnl ?? 0) >= 0 ? '+' : ''}¥${(stats?.daily_pnl ?? 0).toLocaleString()}`} change={`${(stats?.daily_pnl_pct ?? 0) >= 0 ? '+' : ''}${(stats?.daily_pnl_pct ?? 0).toFixed(2)}%`} changeType={(stats?.daily_pnl ?? 0) >= 0 ? 'positive' : 'negative'} />
              <StatCard label={t('page.stats.maxDrawdown')} value={`-${(dashData?.risk_metrics?.max_drawdown ?? 0).toFixed(1)}%`} changeType="negative" />
              <StatCard label={t('page.stats.sharpe30d')} value={(dashData?.risk_metrics?.sharpe_ratio ?? 0).toFixed(2)} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="rounded-lg border border-border bg-card p-5">
                <h3 className="font-semibold text-card-foreground mb-4">{t('page.sections.nav')}</h3>
                <LineChart xData={navDates} series={[{ name: t('page.sections.nav'), data: navValues, areaStyle: true }]} height={220} loading={loading} />
              </div>

              <div className="rounded-lg border border-border bg-card p-5">
                <h3 className="font-semibold text-card-foreground mb-4">{t('page.sections.holdings')}</h3>
                <div className="flex flex-col gap-3 pt-2">
                  {holdingsDistrib.slice(0, 5).map((h, i) => {
                    const colors = chartPalette
                    return (
                      <div key={h.name}>
                        <div className="flex justify-between text-[13px] mb-1">
                          <span>{h.name}</span>
                          <span>{h.pct}%</span>
                        </div>
                        <div className="h-2 rounded-full bg-muted overflow-hidden">
                          <div className="h-full rounded-full transition-all" style={{ width: `${h.pct}%`, background: colors[i % colors.length] }} />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Positions ──────────────────────────────── */}
        {activeTab === 'positions' && (
          <div className="space-y-4">
            <FilterBar
              searchValue={search}
              onSearchChange={setSearch}
              searchPlaceholder={t('page.filters.searchPositions')}
              filters={[
                {
                  key: 'strategy',
                  value: strategyFilter,
                  options: strategies.map((s) => ({ value: s, label: s })),
                  onChange: setStrategyFilter,
                  placeholder: t('page.filters.allStrategies'),
                },
                {
                  key: 'direction',
                  value: dirFilter,
                  options: [{ value: 'long', label: t('page.direction.long') }, { value: 'short', label: t('page.direction.short') }],
                  onChange: setDirFilter,
                  placeholder: t('page.filters.allDirections'),
                },
              ]}
            />
            <DataTable columns={posColumns} data={filteredPositions} keyField="symbol" emptyText={t('page.empty.positions')} />
          </div>
        )}

        {/* ── Risk ────────────────────────────────────── */}
        {activeTab === 'risk' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <StatCard label={t('page.stats.varDay')} value={`¥${(riskData?.value_at_risk ?? 0).toLocaleString()}`} subtitle={`${t('risk.valueAtRisk')} ${totalValue > 0 ? ((riskData?.value_at_risk ?? 0) / totalValue * 100).toFixed(2) : '0'}%`} changeType="negative" />
              <StatCard label={t('page.stats.maxDrawdown')} value={`${(riskData?.max_drawdown ?? 0).toFixed(1)}%`} changeType="negative" />
              <StatCard label={t('page.stats.betaHs300')} value={(riskData?.beta ?? 0).toFixed(2)} subtitle={riskData?.beta && riskData.beta < 1 ? t('page.marketRisk.lower') : t('page.marketRisk.higher')} />
            </div>

            <div className="rounded-lg border border-border bg-card p-5">
              <h3 className="font-semibold text-card-foreground mb-4">{t('page.sections.riskRules')}</h3>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="px-4 py-2 text-left font-medium text-muted-foreground">{t('page.table.rule')}</th>
                    <th className="px-4 py-2 text-left font-medium text-muted-foreground">{t('page.table.threshold')}</th>
                    <th className="px-4 py-2 text-left font-medium text-muted-foreground">{t('page.table.current')}</th>
                    <th className="px-4 py-2 text-left font-medium text-muted-foreground">{t('page.table.status')}</th>
                  </tr>
                </thead>
                <tbody>
                  {riskRules.map((r) => (
                    <tr key={r.rule} className="border-b border-border">
                      <td className="px-4 py-2">{r.rule}</td>
                      <td className="px-4 py-2">{r.threshold}</td>
                      <td className="px-4 py-2">{r.current}</td>
                      <td className="px-4 py-2"><Badge variant={r.ok ? 'success' : 'destructive'}>{r.ok ? t('page.riskStatus.normal') : t('page.riskStatus.exceeded')}</Badge></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── Allocation ──────────────────────────────── */}
        {activeTab === 'allocation' && (
          <div className="space-y-4">
            {/* TODO: Connect to real allocation/optimization API when available */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="rounded-lg border border-border bg-card p-5">
                <h3 className="font-semibold text-card-foreground mb-4">{t('page.sections.currentAllocation')}</h3>
                <div className="flex flex-col gap-3">
                  {(dashData?.sector_allocation ?? []).map((s, i) => {
                    const colors = chartPalette
                    return (
                      <div key={s.name}>
                        <div className="flex justify-between text-[13px] mb-1">
                          <span>{s.name}</span>
                          <span>{s.value.toFixed(1)}%</span>
                        </div>
                        <div className="h-2 rounded-full bg-muted overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${s.value}%`, background: colors[i % colors.length] }} />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              <div className="rounded-lg border border-border bg-card p-5">
                <h3 className="font-semibold text-card-foreground mb-4">{t('page.sections.targetAllocation')}</h3>
                <div className="flex flex-col gap-3">
                  {targetAllocations.map((a) => (
                    <div key={a.name}>
                      <div className="flex justify-between text-[13px] mb-1">
                        <span>{a.name}</span>
                        <span>{t('page.targetPrefix', { value: a.target })}</span>
                      </div>
                      <div className="h-2 rounded-full bg-muted overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${a.target}%`, background: a.color }} />
                      </div>
                    </div>
                  ))}
                </div>
                <button
                  onClick={() => showToast(t('page.targetApplied'), 'success')}
                  className="mt-4 px-3 py-1.5 text-sm rounded-md bg-primary text-white hover:opacity-90"
                >
                  {t('page.actions.applyTarget')}
                </button>
              </div>
            </div>
          </div>
        )}
      </TabPanel>

      {/* Risk Settings Modal */}
      <Modal open={riskModalOpen} onClose={() => setRiskModalOpen(false)} title={t('page.modals.riskTitle')} footer={
        <>
          <button onClick={() => setRiskModalOpen(false)} className="px-4 py-2 text-sm rounded-md border border-border hover:bg-muted">{t('common:cancel')}</button>
          <button onClick={() => { setRiskModalOpen(false); showToast(t('page.modals.riskSaved'), 'success') }} className="px-4 py-2 text-sm rounded-md bg-primary text-white hover:opacity-90">{t('common:save')}</button>
        </>
      }>
        <div className="flex flex-col gap-4">
          {[
            { label: t('page.fields.singlePosition'), defaultValue: 20 },
            { label: t('page.fields.totalPosition'), defaultValue: 80 },
            { label: t('page.fields.dailyLoss'), defaultValue: 3 },
            { label: t('page.fields.drawdown'), defaultValue: 15 },
            { label: t('page.fields.concentration'), defaultValue: 30 },
          ].map((field) => (
            <div key={field.label}>
              <label className="block text-sm font-medium text-foreground mb-1">{field.label}</label>
              <input type="number" defaultValue={field.defaultValue} className="w-full px-3 py-2 text-sm rounded-md border border-border bg-background" />
            </div>
          ))}
        </div>
      </Modal>

      {/* Rebalance Modal */}
      <Modal open={rebalanceModalOpen} onClose={() => setRebalanceModalOpen(false)} title={t('page.modals.rebalanceTitle')} footer={
        <>
          <button onClick={() => setRebalanceModalOpen(false)} className="px-4 py-2 text-sm rounded-md border border-border hover:bg-muted">{t('common:cancel')}</button>
          <button onClick={() => { setRebalanceModalOpen(false); showToast(t('page.modals.rebalanceSubmitted'), 'success') }} className="px-4 py-2 text-sm rounded-md bg-primary text-white hover:opacity-90">{t('page.actions.executeRebalance')}</button>
        </>
      }>
        <p className="text-sm text-muted-foreground mb-4">{t('page.modals.rebalanceHint')}</p>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="px-3 py-2 text-left font-medium text-muted-foreground">{t('page.table.item')}</th>
              <th className="px-3 py-2 text-left font-medium text-muted-foreground">{t('page.table.operation')}</th>
              <th className="px-3 py-2 text-left font-medium text-muted-foreground">{t('page.table.target')}</th>
            </tr>
          </thead>
          <tbody>
            {rebalanceItems.map((item) => (
              <tr key={item.name} className="border-b border-border">
                <td className="px-3 py-2">{item.name}</td>
                <td className={`px-3 py-2 ${item.isReduce ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>{item.action}</td>
                <td className="px-3 py-2">{item.target}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Modal>
    </div>
  )
}
