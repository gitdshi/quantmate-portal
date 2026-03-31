import { useQuery } from '@tanstack/react-query'
import {
  Activity,
  ArrowRight,
  Bell,
  Clock3,
  DollarSign,
  TrendingUp,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'

import EmptyState from '../components/EmptyState'
import SystemHealthStrip from '../components/SystemHealthStrip'
import LineChart from '../components/charts/LineChart'
import PieChart from '../components/charts/PieChart'
import Badge from '../components/ui/Badge'
import DataTable, { type Column } from '../components/ui/DataTable'
import StatCard from '../components/ui/StatCard'
import { alertsAPI, analyticsAPI, portfolioAPI, systemAPI, tradingAPI } from '../lib/api'
import { themeColors } from '../lib/theme'
import type {
  AlertHistory,
  DashboardMetrics,
  Order,
  Position,
  SyncStatusResponse,
  SystemVersionInfo,
} from '../types'

const NAV_PERIODS = ['1w', '1m', '3m', 'ytd'] as const

interface NextAction {
  id: string
  title: string
  description: string
  href: string
}

interface ActivityItem {
  id: string
  kind: 'order' | 'alert'
  title: string
  subtitle: string
  timestamp: string
  href: string
}

export default function Dashboard() {
  const { t } = useTranslation('dashboard')
  const [navPeriod, setNavPeriod] = useState<string>('1m')

  const { data: dashData, isLoading: dashLoading } = useQuery<DashboardMetrics>({
    queryKey: ['dashboard'],
    queryFn: () => analyticsAPI.dashboard().then((response) => response.data),
    refetchInterval: 30_000,
  })

  const { data: positions = [], isLoading: positionsLoading } = useQuery<Position[]>({
    queryKey: ['portfolio', 'positions'],
    queryFn: () => portfolioAPI.positions().then((response) => response.data?.positions ?? response.data ?? []),
  })

  const { data: recentOrders = [] } = useQuery<Order[]>({
    queryKey: ['trading', 'orders', 'recent'],
    queryFn: () =>
      tradingAPI.listOrders({ page_size: 5 }).then((response) => {
        const data = response.data
        return Array.isArray(data) ? data : data?.data ?? []
      }),
  })

  const { data: alerts = [] } = useQuery<AlertHistory[]>({
    queryKey: ['alerts', 'recent'],
    queryFn: () =>
      alertsAPI.listHistory({ page_size: 5 }).then((response) => {
        const data = response.data
        return Array.isArray(data) ? data : data?.data ?? []
      }),
  })

  const { data: syncStatus } = useQuery<SyncStatusResponse>({
    queryKey: ['system', 'sync-status'],
    queryFn: async () => {
      const response = await systemAPI.syncStatus()
      return response.data
    },
    retry: 1,
    staleTime: 30_000,
  })

  const { data: versionInfo } = useQuery<SystemVersionInfo>({
    queryKey: ['system', 'version'],
    queryFn: async () => {
      const response = await systemAPI.versionInfo()
      return response.data
    },
    retry: 1,
    staleTime: 5 * 60 * 1000,
  })

  const stats = dashData?.portfolio_stats
  const totalValue = stats?.total_value ?? 0
  const dailyPnl = stats?.daily_pnl ?? 0
  const dailyPnlPct = stats?.daily_pnl_pct ?? 0
  const strategyCount = dashData?.strategy_performance?.length ?? 0
  const activeStrategies = dashData?.strategy_performance?.filter((strategy) => strategy.status === 'running').length ?? 0
  const unreadAlerts = alerts.filter((alert) => alert.status === 'unread').length

  const navDates = (dashData?.performance_history ?? []).map((point) => point.date)
  const navValues = (dashData?.performance_history ?? []).map((point) => point.value)
  const benchmarkValues = (dashData?.performance_history ?? [])
    .filter((point) => point.benchmark != null)
    .map((point) => point.benchmark as number)

  const pieData = (dashData?.sector_allocation ?? []).map((sector) => ({
    name: sector.name,
    value: sector.value,
  }))

  const hasSyncRun = Boolean(syncStatus?.daemon?.last_run_at)
  const hasStrategies = strategyCount > 0
  const hasBacktestHistory = navValues.length > 0
  const hasPositions = positions.length > 0
  const missingCount = syncStatus?.consistency?.missing_count ?? 0

  const nextActions = useMemo<NextAction[]>(() => {
    const actions: NextAction[] = []
    if (!hasSyncRun || missingCount > 0) {
      actions.push({
        id: 'sync',
        title: t('nextActions.sync.title', 'Sync your first data batch'),
        description: t(
          'nextActions.sync.description',
          'Start by checking data sync coverage so strategy signals and analytics have something trustworthy to work with.'
        ),
        href: '/settings?tab=system-management',
      })
    }
    if (!hasStrategies) {
      actions.push({
        id: 'strategy',
        title: t('nextActions.strategy.title', 'Create your first strategy'),
        description: t(
          'nextActions.strategy.description',
          'Pick a template or write a simple rule-based idea so the platform can begin tracking research output.'
        ),
        href: '/strategies',
      })
    }
    if (hasStrategies && !hasBacktestHistory) {
      actions.push({
        id: 'backtest',
        title: t('nextActions.backtest.title', 'Run the first backtest'),
        description: t(
          'nextActions.backtest.description',
          'One completed backtest unlocks the most useful analytics, return attribution, and comparison views.'
        ),
        href: '/backtest',
      })
    }
    if (hasBacktestHistory && !hasPositions) {
      actions.push({
        id: 'paper',
        title: t('nextActions.paper.title', 'Start paper trading'),
        description: t(
          'nextActions.paper.description',
          'Move the strongest idea into a simulated account to validate execution, exposure, and monitoring rules.'
        ),
        href: '/paper-trading',
      })
    }
    return actions.slice(0, 4)
  }, [hasBacktestHistory, hasPositions, hasStrategies, hasSyncRun, missingCount, t])

  const activityItems = useMemo<ActivityItem[]>(() => {
    const orderItems = recentOrders.map((order) => ({
      id: `order-${order.id}`,
      kind: 'order' as const,
      title: t('activity.orderTitle', {
        symbol: order.symbol,
        direction: order.direction === 'buy' ? t('page.badges.buy') : t('page.badges.sell'),
        defaultValue: `${order.direction === 'buy' ? 'Buy' : 'Sell'} ${order.symbol}`,
      }),
      subtitle: t('activity.orderSubtitle', {
        status: order.status,
        quantity: order.quantity,
        defaultValue: `Status: ${order.status} · Quantity: ${order.quantity}`,
      }),
      timestamp: order.updated_at ?? order.created_at,
      href: '/trading',
    }))

    const alertItems = alerts.map((alert) => ({
      id: `alert-${alert.id}`,
      kind: 'alert' as const,
      title: alert.message || t('activity.alertFallback', 'Alert received'),
      subtitle: t('activity.alertSubtitle', {
        level: alert.level,
        status: alert.status,
        defaultValue: `Level: ${alert.level} · Status: ${alert.status}`,
      }),
      timestamp: alert.triggered_at,
      href: '/monitoring',
    }))

    return [...orderItems, ...alertItems]
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 6)
  }, [alerts, recentOrders, t])

  const positionsColumns: Column<Position>[] = useMemo(
    () => [
      { key: 'symbol', label: t('page.table.symbol'), sortable: true, className: 'font-mono' },
      { key: 'name', label: t('page.table.name') },
      {
        key: 'direction',
        label: t('page.table.direction'),
        render: (row) => (
          <Badge variant={row.direction === 'short' ? 'destructive' : 'success'}>
            {row.direction === 'short' ? t('page.badges.short') : t('page.badges.long')}
          </Badge>
        ),
      },
      { key: 'quantity', label: t('page.table.quantity'), sortable: true },
      { key: 'avg_cost', label: t('page.table.avgCost'), render: (row) => `¥${row.avg_cost.toFixed(2)}` },
      {
        key: 'market_price',
        label: t('page.table.marketPrice'),
        render: (row) => `¥${row.market_price.toFixed(2)}`,
      },
      {
        key: 'market_value',
        label: t('page.table.marketValue'),
        sortable: true,
        render: (row) => `¥${row.market_value.toLocaleString()}`,
      },
      {
        key: 'pnl',
        label: t('page.table.pnl'),
        sortable: true,
        render: (row) => (
          <span className={row.pnl >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>
            {row.pnl >= 0 ? '+' : ''}¥{row.pnl.toLocaleString()}
          </span>
        ),
      },
      {
        key: 'pnl_pct',
        label: t('page.table.pnlPct'),
        sortable: true,
        render: (row) => (
          <span
            className={row.pnl_pct >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}
          >
            {row.pnl_pct >= 0 ? '+' : ''}
            {row.pnl_pct.toFixed(2)}%
          </span>
        ),
      },
    ],
    [t]
  )

  const orderColumns: Column<Order>[] = useMemo(
    () => [
      { key: 'symbol', label: t('page.table.symbol'), className: 'font-mono' },
      {
        key: 'direction',
        label: t('page.table.direction'),
        render: (row) => (
          <Badge variant={row.direction === 'sell' ? 'destructive' : 'success'}>
            {row.direction === 'sell' ? t('page.badges.sell') : t('page.badges.buy')}
          </Badge>
        ),
      },
      { key: 'quantity', label: t('page.table.quantity') },
      {
        key: 'price',
        label: t('page.table.price'),
        render: (row) => (row.price ? `¥${row.price.toFixed(2)}` : '-'),
      },
      {
        key: 'status',
        label: t('page.table.status'),
        render: (row) => (
          <Badge
            variant={
              row.status === 'filled' ? 'success' : row.status === 'cancelled' ? 'muted' : 'warning'
            }
          >
            {row.status}
          </Badge>
        ),
      },
    ],
    [t]
  )

  const alertColumns: Column<AlertHistory>[] = useMemo(
    () => [
      {
        key: 'level',
        label: t('page.table.level'),
        render: (row) => (
          <Badge
            variant={
              row.level === 'severe' ? 'destructive' : row.level === 'warning' ? 'warning' : 'primary'
            }
          >
            {row.level}
          </Badge>
        ),
      },
      { key: 'message', label: t('page.table.message') },
      {
        key: 'triggered_at',
        label: t('page.table.time'),
        render: (row) => new Date(row.triggered_at).toLocaleString(),
      },
    ],
    [t]
  )

  const loading = dashLoading || positionsLoading
  const showEnvironmentBadge = versionInfo?.environment && versionInfo.environment !== 'production'
  const environmentLabel =
    versionInfo?.environment === 'staging'
      ? t('environment.staging', 'Staging')
      : versionInfo?.environment === 'testing'
        ? t('environment.testing', 'Testing')
        : t('environment.development', 'Development')

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t('title')}</h1>
          <p className="text-sm text-muted-foreground">{t('subtitle')}</p>
        </div>
        {showEnvironmentBadge && <Badge variant="warning">{environmentLabel}</Badge>}
      </div>

      <SystemHealthStrip />

      {nextActions.length > 0 && (
        <section className="space-y-3">
          <div>
            <h2 className="text-lg font-semibold text-foreground">
              {t('nextActions.heading', 'Next best actions')}
            </h2>
            <p className="text-sm text-muted-foreground">
              {t(
                'nextActions.subheading',
                'These are the fastest steps to turn an empty workspace into something observable and trustworthy.'
              )}
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {nextActions.map((action) => (
              <Link
                key={action.id}
                to={action.href}
                className="group rounded-2xl border border-border bg-card p-5 transition hover:border-primary/30 hover:shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-semibold text-card-foreground">{action.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">{action.description}</p>
                  </div>
                  <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition group-hover:translate-x-1 group-hover:text-foreground" />
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {!hasStrategies && !hasBacktestHistory && !hasPositions && (
        <EmptyState
          type="setup"
          icon={<Activity size={24} />}
          title={t('setup.title', 'Wake QuantMate up with the first real workflow')}
          explanation={t(
            'setup.explanation',
            'Right now the dashboard is mostly waiting on data, a starter strategy, and the first backtest result. Once those arrive, your KPI cards and charts become much more informative.'
          )}
          primaryCTA={{ label: t('setup.primary', 'Create first strategy'), href: '/strategies' }}
          secondaryCTAs={[
            { label: t('setup.secondary', 'Go to sync settings'), href: '/settings?tab=system-management' },
          ]}
          helperText={t(
            'setup.helper',
            'A good first milestone is: sync data, clone a template, run a backtest, then move the best idea into paper trading.'
          )}
        />
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
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
          subtitle={t('page.stats.strategySubtitle', {
            total: strategyCount,
            defaultValue: `${strategyCount} strategies configured`,
          })}
          icon={Activity}
          iconColor="text-purple-500"
        />
        <StatCard
          label={t('page.stats.unreadAlerts')}
          value={unreadAlerts}
          subtitle={t('page.stats.alertSubtitle', {
            count: alerts.length,
            defaultValue: `${alerts.length} recent alerts tracked`,
          })}
          icon={Bell}
          iconColor={unreadAlerts > 0 ? 'text-yellow-500' : 'text-muted-foreground'}
        />
      </div>

      <section className="rounded-2xl border border-border bg-card p-5">
        <div className="mb-4 flex items-center gap-2">
          <Clock3 className="h-4 w-4 text-muted-foreground" />
          <div>
            <h2 className="font-semibold text-card-foreground">
              {t('activity.heading', 'Recent activity')}
            </h2>
            <p className="text-sm text-muted-foreground">
              {t(
                'activity.subheading',
                'Orders and alerts appear here first so you can tell whether the workspace is moving or still waiting on setup.'
              )}
            </p>
          </div>
        </div>

        {activityItems.length === 0 ? (
          <EmptyState
            type="activity"
            icon={<Clock3 size={24} />}
            title={t('activity.emptyTitle', 'No recent activity yet')}
            explanation={t(
              'activity.emptyExplanation',
              'As soon as orders execute or alerts trigger, this timeline will start giving you a quick operational summary.'
            )}
            primaryCTA={{ label: t('activity.primary', 'Run a backtest'), href: '/backtest' }}
            secondaryCTAs={[{ label: t('activity.secondary', 'Review monitoring'), href: '/monitoring' }]}
          />
        ) : (
          <div className="space-y-3">
            {activityItems.map((item) => (
              <Link
                key={item.id}
                to={item.href}
                className="flex items-start justify-between gap-4 rounded-xl border border-border px-4 py-4 transition hover:bg-muted/40"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <Badge variant={item.kind === 'alert' ? 'warning' : 'primary'}>
                      {item.kind === 'alert' ? t('activity.alertBadge', 'Alert') : t('activity.orderBadge', 'Order')}
                    </Badge>
                    <p className="font-medium text-foreground">{item.title}</p>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{item.subtitle}</p>
                </div>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {new Date(item.timestamp).toLocaleString()}
                </span>
              </Link>
            ))}
          </div>
        )}
      </section>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <section className="rounded-2xl border border-border bg-card p-5">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-semibold text-card-foreground">{t('page.navTitle')}</h3>
            <div className="flex gap-1">
              {NAV_PERIODS.map((period) => (
                <button
                  key={period}
                  onClick={() => setNavPeriod(period)}
                  className={`rounded px-2.5 py-1 text-xs ${
                    navPeriod === period ? 'bg-primary text-white' : 'text-muted-foreground hover:bg-muted'
                  }`}
                >
                  {period}
                </button>
              ))}
            </div>
          </div>

          {navValues.length > 0 ? (
            <LineChart
              xData={navDates}
              series={[
                {
                  name: t('page.navSeries.portfolio'),
                  data: navValues,
                  areaStyle: true,
                  color: themeColors.primary,
                },
                ...(benchmarkValues.length > 0
                  ? [{ name: t('page.navSeries.benchmark'), data: benchmarkValues, color: '#9ca3af' }]
                  : []),
              ]}
              height={260}
              loading={loading}
            />
          ) : (
            <EmptyState
              type="activity"
              icon={<TrendingUp size={24} />}
              title={t('page.empty.navTitle', 'No NAV curve yet')}
              explanation={t(
                'page.empty.navExplanation',
                'A NAV curve appears after you have at least one backtest result or an active position to track over time.'
              )}
              primaryCTA={{ label: t('page.empty.navPrimary', 'Run first backtest'), href: '/backtest' }}
            />
          )}
        </section>

        <section className="rounded-2xl border border-border bg-card p-5">
          <h3 className="mb-4 font-semibold text-card-foreground">{t('page.allocationTitle')}</h3>
          {pieData.length > 0 ? (
            <PieChart data={pieData} height={260} loading={loading} donut />
          ) : (
            <EmptyState
              type="setup"
              icon={<DollarSign size={24} />}
              title={t('page.empty.allocationTitle', 'Allocation will appear after the first position')}
              explanation={t(
                'page.empty.allocationExplanation',
                'Once your portfolio has live or simulated holdings, this panel will show how capital is distributed.'
              )}
              primaryCTA={{ label: t('page.empty.allocationPrimary', 'Open paper portfolio'), href: '/paper-trading' }}
            />
          )}
        </section>
      </div>

      <section className="rounded-2xl border border-border bg-card p-5">
        <h3 className="mb-4 font-semibold text-card-foreground">{t('page.positionsTitle')}</h3>
        <DataTable
          columns={positionsColumns}
          data={positions}
          keyField="symbol"
          emptyText={t(
            'page.empty.positions',
            'No positions yet. Open a paper position or deploy a strategy to start filling this table.'
          )}
        />
      </section>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <section className="rounded-2xl border border-border bg-card p-5">
          <h3 className="mb-4 font-semibold text-card-foreground">{t('page.ordersTitle')}</h3>
          <DataTable
            columns={orderColumns}
            data={recentOrders}
            emptyText={t(
              'page.empty.orders',
              'No recent orders. Paper or live execution activity will show up here.'
            )}
          />
        </section>

        <section className="rounded-2xl border border-border bg-card p-5">
          <h3 className="mb-4 font-semibold text-card-foreground">{t('page.alertsTitle')}</h3>
          <DataTable
            columns={alertColumns}
            data={alerts}
            emptyText={t(
              'page.empty.alerts',
              'No alert rules have fired yet. Create a price reminder or risk alert to start monitoring.'
            )}
          />
        </section>
      </div>

      {dashData?.strategy_performance && dashData.strategy_performance.length > 0 && (
        <section>
          <h3 className="mb-4 font-semibold text-foreground">{t('page.strategyStatusTitle')}</h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {dashData.strategy_performance.map((strategy) => {
              const borderColor =
                strategy.status === 'running'
                  ? 'border-l-green-500'
                  : strategy.status === 'error'
                    ? 'border-l-red-500'
                    : 'border-l-gray-400'
              return (
                <div
                  key={strategy.name}
                  className={`rounded-lg border border-border border-l-4 bg-card p-4 ${borderColor}`}
                >
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-sm font-medium text-card-foreground">{strategy.name}</span>
                    <Badge
                      variant={
                        strategy.status === 'running'
                          ? 'success'
                          : strategy.status === 'error'
                            ? 'destructive'
                            : 'muted'
                      }
                    >
                      {strategy.status === 'running'
                        ? t('page.badges.running')
                        : strategy.status === 'error'
                          ? t('page.badges.error')
                          : t('page.badges.stopped')}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{t('page.metrics.dailyReturn')}</span>
                    <span
                      className={
                        strategy.daily_return >= 0
                          ? 'text-green-600 dark:text-green-400'
                          : 'text-red-600 dark:text-red-400'
                      }
                    >
                      {strategy.daily_return >= 0 ? '+' : ''}
                      {strategy.daily_return.toFixed(2)}%
                    </span>
                  </div>
                  <div className="mt-1 flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{t('page.metrics.totalReturn')}</span>
                    <span
                      className={
                        strategy.total_return >= 0
                          ? 'text-green-600 dark:text-green-400'
                          : 'text-red-600 dark:text-red-400'
                      }
                    >
                      {strategy.total_return >= 0 ? '+' : ''}
                      {strategy.total_return.toFixed(2)}%
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      )}
    </div>
  )
}
