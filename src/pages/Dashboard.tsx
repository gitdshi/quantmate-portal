import { useQuery } from '@tanstack/react-query'
import {
  Activity,
  AlertTriangle,
  Bell,
  DollarSign,
  TrendingUp,
} from 'lucide-react'
import { useState } from 'react'
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
  const posColumns: Column<Position>[] = [
    { key: 'symbol', label: '代码', sortable: true, className: 'font-mono' },
    { key: 'name', label: '名称' },
    { key: 'direction', label: '方向', render: (r) => <Badge variant={r.direction === 'short' ? 'destructive' : 'success'}>{r.direction === 'short' ? '空' : '多'}</Badge> },
    { key: 'quantity', label: '数量', sortable: true },
    { key: 'avg_cost', label: '成本价', render: (r) => `¥${r.avg_cost.toFixed(2)}` },
    { key: 'market_price', label: '现价', render: (r) => `¥${r.market_price.toFixed(2)}` },
    { key: 'market_value', label: '市值', sortable: true, render: (r) => `¥${r.market_value.toLocaleString()}` },
    { key: 'pnl', label: '盈亏', sortable: true, render: (r) => <span className={r.pnl >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>{r.pnl >= 0 ? '+' : ''}¥{r.pnl.toLocaleString()}</span> },
    { key: 'pnl_pct', label: '盈亏%', sortable: true, render: (r) => <span className={r.pnl_pct >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>{r.pnl_pct >= 0 ? '+' : ''}{r.pnl_pct.toFixed(2)}%</span> },
  ]

  const orderColumns: Column<Order>[] = [
    { key: 'symbol', label: '代码', className: 'font-mono' },
    { key: 'direction', label: '方向', render: (r) => <Badge variant={r.direction === 'sell' ? 'destructive' : 'success'}>{r.direction === 'sell' ? '卖出' : '买入'}</Badge> },
    { key: 'quantity', label: '数量' },
    { key: 'price', label: '价格', render: (r) => r.price ? `¥${r.price.toFixed(2)}` : '-' },
    { key: 'status', label: '状态', render: (r) => <Badge variant={r.status === 'filled' ? 'success' : r.status === 'cancelled' ? 'muted' : 'warning'}>{r.status}</Badge> },
  ]

  const alertColumns: Column<AlertHistory>[] = [
    { key: 'level', label: '级别', render: (r) => <Badge variant={r.level === 'severe' ? 'destructive' : r.level === 'warning' ? 'warning' : 'primary'}>{r.level}</Badge> },
    { key: 'message', label: '内容' },
    { key: 'triggered_at', label: '时间', render: (r) => new Date(r.triggered_at).toLocaleString() },
  ]

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
          label="总资产"
          value={`¥${totalValue.toLocaleString()}`}
          icon={DollarSign}
          iconColor="text-blue-500"
        />
        <StatCard
          label="今日盈亏"
          value={`${dailyPnl >= 0 ? '+' : ''}¥${dailyPnl.toLocaleString()}`}
          change={`${dailyPnlPct >= 0 ? '+' : ''}${dailyPnlPct.toFixed(2)}%`}
          changeType={dailyPnl >= 0 ? 'positive' : 'negative'}
          icon={TrendingUp}
          iconColor={dailyPnl >= 0 ? 'text-green-500' : 'text-red-500'}
        />
        <StatCard
          label="活跃策略"
          value={activeStrategies}
          icon={Activity}
          iconColor="text-purple-500"
        />
        <StatCard
          label="未处理告警"
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
            <h3 className="font-semibold text-card-foreground">净值走势</h3>
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
              { name: '净值', data: navValues, areaStyle: true, color: themeColors.primary },
              ...(benchValues.length > 0 ? [{ name: '基准', data: benchValues, color: '#9ca3af' }] : []),
            ]}
            height={260}
            loading={loading}
          />
        </div>

        {/* Allocation Pie */}
        <div className="rounded-lg border border-border bg-card p-5">
          <h3 className="font-semibold text-card-foreground mb-4">持仓分布</h3>
          <PieChart data={pieData} height={260} loading={loading} donut />
        </div>
      </div>

      {/* Positions Table */}
      <div className="rounded-lg border border-border bg-card p-5">
        <h3 className="font-semibold text-card-foreground mb-4">当前持仓</h3>
        <DataTable columns={posColumns} data={positions} keyField="symbol" emptyText="暂无持仓" />
      </div>

      {/* Orders + Alerts side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-lg border border-border bg-card p-5">
          <h3 className="font-semibold text-card-foreground mb-4">最近委托</h3>
          <DataTable columns={orderColumns} data={recentOrders} emptyText="暂无委托" />
        </div>
        <div className="rounded-lg border border-border bg-card p-5">
          <h3 className="font-semibold text-card-foreground mb-4">告警信息</h3>
          <DataTable columns={alertColumns} data={alerts} emptyText="暂无告警" />
        </div>
      </div>

      {/* Strategy Status Cards */}
      {dashData?.strategy_performance && dashData.strategy_performance.length > 0 && (
        <div>
          <h3 className="font-semibold text-foreground mb-4">策略状态</h3>
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
                      {sp.status === 'running' ? '运行中' : sp.status === 'error' ? '异常' : '已停止'}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">今日收益</span>
                    <span className={sp.daily_return >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>
                      {sp.daily_return >= 0 ? '+' : ''}{sp.daily_return.toFixed(2)}%
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm mt-1">
                    <span className="text-muted-foreground">累计收益</span>
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
