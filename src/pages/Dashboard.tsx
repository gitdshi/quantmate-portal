import { useQuery } from '@tanstack/react-query'
import {
  Activity,
  AlertTriangle,
  Bell,
  DollarSign,
  TrendingUp,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

import LineChart from '../components/charts/LineChart'
import PieChart from '../components/charts/PieChart'
import Badge from '../components/ui/Badge'
import DataTable, { type Column } from '../components/ui/DataTable'
import { themeColors } from '../lib/theme'
import StatCard from '../components/ui/StatCard'
import { analyticsAPI, portfolioAPI, alertsAPI, tradingAPI } from '../lib/api'
import type { DashboardMetrics, Position, Order, AlertHistory } from '../types'

const NAV_PERIODS = ['1w', '1m', '3m', 'ytd'] as const

export default function Dashboard() {
  const { t } = useTranslation('dashboard')
  const [navPeriod, setNavPeriod] = useState<string>('1m')

  // ── Data fetching ──────────────────────────────────────────────────
  const { data: dashData, isLoading: dashLoading } = useQuery<DashboardMetrics>({
    queryKey: ['dashboard'],
    queryFn: () => analyticsAPI.dashboard().then((r) => r.data),
    refetchInterval: 30_000,
  })

  const { data: positions = [], isLoading: posLoading } = useQuery<Position[]>({
    queryKey: ['portfolio', 'positions'],
    queryFn: () => portfolioAPI.positions().then((r) => r.data?.positions ?? r.data ?? []),
  })

  const { data: recentOrders = [] } = useQuery<Order[]>({
    queryKey: ['trading', 'orders', 'recent'],
    queryFn: () =>
      tradingAPI.listOrders({ page_size: 5 }).then((r) => {
        const d = r.data
        return Array.isArray(d) ? d : d?.data ?? []
      }),
  })

  const { data: alerts = [] } = useQuery<AlertHistory[]>({
    queryKey: ['alerts', 'recent'],
    queryFn: () =>
      alertsAPI.listHistory({ page_size: 5 }).then((r) => {
        const d = r.data
        return Array.isArray(d) ? d : d?.data ?? []
      }),
  })

  // ── Derived values ─────────────────────────────────────────────────
  const stats = dashData?.portfolio_stats
  const totalValue = stats?.total_value ?? 0
  const dailyPnl = stats?.daily_pnl ?? 0
  const dailyPnlPct = stats?.daily_pnl_pct ?? 0
  const activeStrategies = dashData?.strategy_performance?.filter((s) => s.status === 'running').length ?? 0
  const unreadAlerts = alerts.filter((a) => a.status === 'unread').length

  const navDates = (dashData?.performance_history ?? []).map((p) => p.date)
  const navValues = (dashData?.performance_history ?? []).map((p) => p.value)
  const benchValues = (dashData?.performance_history ?? []).filter((p) => p.benchmark != null).map((p) => p.benchmark!)

  const pieData = (dashData?.sector_allocation ?? []).map((s) => ({
    name: s.name,
    value: s.value,
  }))

  // ── Columns ────────────────────────────────────────────────────────
  const posColumns: Column<Position>[] = useMemo(() => [
    { key: 'symbol', label: t('page.table.symbol'), sortable: true, className: 'font-mono' },
    { key: 'name', label: t('page.table.name') },
    { key: 'direction', label: t('page.table.direction'), render: (r) => <Badge variant={r.direction === 'short' ? 'destructive' : 'success'}>{r.direction === 'short' ? t('page.badges.short') : t('page.badges.long')}</Badge> },
    { key: 'quantity', label: t('page.table.quantity'), sortable: true },
    { key: 'avg_cost', label: t('page.table.avgCost'), render: (r) => `¥${r.avg_cost.toFixed(2)}` },
    { key: 'market_price', label: t('page.table.marketPrice'), render: (r) => `¥${r.market_price.toFixed(2)}` },
    { key: 'market_value', label: t('page.table.marketValue'), sortable: true, render: (r) => `¥${r.market_value.toLocaleString()}` },
    { key: 'pnl', label: t('page.table.pnl'), sortable: true, render: (r) => <span className={r.pnl >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>{r.pnl >= 0 ? '+' : ''}¥{r.pnl.toLocaleString()}</span> },
    { key: 'pnl_pct', label: t('page.table.pnlPct'), sortable: true, render: (r) => <span className={r.pnl_pct >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>{r.pnl_pct >= 0 ? '+' : ''}{r.pnl_pct.toFixed(2)}%</span> },
  ], [t])

  const orderColumns: Column<Order>[] = useMemo(() => [
    { key: 'symbol', label: t('page.table.symbol'), className: 'font-mono' },
    { key: 'direction', label: t('page.table.direction'), render: (r) => <Badge variant={r.direction === 'sell' ? 'destructive' : 'success'}>{r.direction === 'sell' ? t('page.badges.sell') : t('page.badges.buy')}</Badge> },
    { key: 'quantity', label: t('page.table.quantity') },
    { key: 'price', label: t('page.table.price'), render: (r) => r.price ? `¥${r.price.toFixed(2)}` : '-' },
    { key: 'status', label: t('page.table.status'), render: (r) => <Badge variant={r.status === 'filled' ? 'success' : r.status === 'cancelled' ? 'muted' : 'warning'}>{r.status}</Badge> },
  ], [t])

  const alertColumns: Column<AlertHistory>[] = useMemo(() => [
    { key: 'level', label: t('page.table.level'), render: (r) => <Badge variant={r.level === 'severe' ? 'destructive' : r.level === 'warning' ? 'warning' : 'primary'}>{r.level}</Badge> },
    { key: 'message', label: t('page.table.message') },
    { key: 'triggered_at', label: t('page.table.time'), render: (r) => new Date(r.triggered_at).toLocaleString() },
  ], [t])

  const loading = dashLoading || posLoading

  // ── Render ─────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">{t('title')}</h1>
        <p className="text-sm text-muted-foreground">{t('subtitle')}</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label={t('page.stats.totalAssets')}
          value={`¥${totalValue.toLocaleString()}`}
          icon={DollarSign}
          iconColor="text-blue-500"
        />
        <StatCard
          label={t('page.stats.dailyPnl')}
          value={`${dailyPnl >= 0 ? '+' : ''}¥${dailyPnl.toLocaleString()}`}
          change={`${dailyPnlPct >= 0 ? '+' : ''}${dailyPnlPct.toFixed(2)}%`}
          changeType={dailyPnl >= 0 ? 'positive' : 'negative'}
          icon={TrendingUp}
          iconColor={dailyPnl >= 0 ? 'text-green-500' : 'text-red-500'}
        />
        <StatCard
          label={t('page.stats.activeStrategies')}
          value={activeStrategies}
          icon={Activity}
          iconColor="text-purple-500"
        />
        <StatCard
          label={t('page.stats.unreadAlerts')}
          value={unreadAlerts}
          icon={Bell}
          iconColor={unreadAlerts > 0 ? 'text-yellow-500' : 'text-muted-foreground'}
        />
      </div>

      {/* Charts: NAV + Allocation Pie */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* NAV Chart */}
        <div className="rounded-lg border border-border bg-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-card-foreground">{t('page.navTitle')}</h3>
            <div className="flex gap-1">
              {NAV_PERIODS.map((p) => (
                <button
                  key={p}
                  onClick={() => setNavPeriod(p)}
                  className={`px-2.5 py-1 text-xs rounded ${navPeriod === p ? 'bg-primary text-white' : 'text-muted-foreground hover:bg-muted'}`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
          <LineChart
            xData={navDates}
            series={[
              { name: t('page.navSeries.portfolio'), data: navValues, areaStyle: true, color: themeColors.primary },
              ...(benchValues.length > 0 ? [{ name: t('page.navSeries.benchmark'), data: benchValues, color: '#9ca3af' }] : []),
            ]}
            height={260}
            loading={loading}
          />
        </div>

        {/* Allocation Pie */}
        <div className="rounded-lg border border-border bg-card p-5">
          <h3 className="font-semibold text-card-foreground mb-4">{t('page.allocationTitle')}</h3>
          <PieChart data={pieData} height={260} loading={loading} donut />
        </div>
      </div>

      {/* Positions Table */}
      <div className="rounded-lg border border-border bg-card p-5">
        <h3 className="font-semibold text-card-foreground mb-4">{t('page.positionsTitle')}</h3>
        <DataTable columns={posColumns} data={positions} keyField="symbol" emptyText={t('page.empty.positions')} />
      </div>

      {/* Orders + Alerts side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-lg border border-border bg-card p-5">
          <h3 className="font-semibold text-card-foreground mb-4">{t('page.ordersTitle')}</h3>
          <DataTable columns={orderColumns} data={recentOrders} emptyText={t('page.empty.orders')} />
        </div>
        <div className="rounded-lg border border-border bg-card p-5">
          <h3 className="font-semibold text-card-foreground mb-4">{t('page.alertsTitle')}</h3>
          <DataTable columns={alertColumns} data={alerts} emptyText={t('page.empty.alerts')} />
        </div>
      </div>

      {/* Strategy Status Cards */}
      {dashData?.strategy_performance && dashData.strategy_performance.length > 0 && (
        <div>
          <h3 className="font-semibold text-foreground mb-4">{t('page.strategyStatusTitle')}</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {dashData.strategy_performance.map((sp) => {
              const borderColor =
                sp.status === 'running' ? 'border-l-green-500' :
                sp.status === 'error' ? 'border-l-red-500' :
                'border-l-gray-400'
              return (
                <div
                  key={sp.name}
                  className={`rounded-lg border border-border bg-card p-4 border-l-4 ${borderColor}`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-sm text-card-foreground">{sp.name}</span>
                    <Badge variant={sp.status === 'running' ? 'success' : sp.status === 'error' ? 'destructive' : 'muted'}>
                      {sp.status === 'running' ? t('page.badges.running') : sp.status === 'error' ? t('page.badges.error') : t('page.badges.stopped')}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{t('page.metrics.dailyReturn')}</span>
                    <span className={sp.daily_return >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>
                      {sp.daily_return >= 0 ? '+' : ''}{sp.daily_return.toFixed(2)}%
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm mt-1">
                    <span className="text-muted-foreground">{t('page.metrics.totalReturn')}</span>
                    <span className={sp.total_return >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>
                      {sp.total_return >= 0 ? '+' : ''}{sp.total_return.toFixed(2)}%
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
