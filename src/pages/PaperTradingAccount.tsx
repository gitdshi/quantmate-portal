import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  ArrowLeft,
  CheckCircle2,
  Play,
  ShoppingCart,
  Square,
  TrendingUp,
  XCircle,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

import Pagination from '../components/Pagination'
import LineChart from '../components/charts/LineChart'
import Badge from '../components/ui/Badge'
import DataTable, { type Column } from '../components/ui/DataTable'
import FilterBar from '../components/ui/FilterBar'
import Modal from '../components/ui/Modal'
import StatCard from '../components/ui/StatCard'
import { showToast } from '../components/ui/toast-service'
import { usePagination } from '../hooks/usePagination'
import { compositeStrategiesAPI, paperAccountAPI, paperTradingAPI, strategiesAPI } from '../lib/api'
import type { PaperAccount, PaperSignal } from '../types'

type PaperDeployment = {
  id: number
  strategy_name: string
  strategy_source_type?: string
  status: string
  vt_symbol?: string
  execution_mode?: string
  created_at?: string
  started_at?: string
}

type PaperOrder = {
  id: number
  symbol: string
  direction: 'buy' | 'sell'
  order_type: string
  quantity: number
  price?: number
  avg_fill_price?: number
  fee?: number
  status: string
  paper_account_id: number
  created_at: string
}

type PaperPosition = {
  symbol: string
  direction: 'buy' | 'sell'
  quantity: number
  avg_cost: number
  current_price: number
  pnl: number
  pnl_pct: number
}

type PaperAnalytics = {
  current_equity?: number
  total_pnl?: number
  total_return_pct?: number
  total_trades?: number
  win_rate?: number
  sharpe_ratio?: number | null
  profit_factor?: number | null
  max_drawdown_pct?: number
}

type EquityPoint = {
  date: string
  equity?: number
  total_equity?: number
}

const CURRENCY_MAP: Record<string, string> = { CNY: '¥', HKD: 'HK$', USD: '$' }

function formatMoney(value: number, currency: string = 'CNY') {
  const prefix = CURRENCY_MAP[currency] || '¥'
  return `${prefix}${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function unwrapArray<T>(value: unknown, key: string): T[] {
  if (Array.isArray(value)) {
    return value as T[]
  }
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>
    if (Array.isArray(record[key])) {
      return record[key] as T[]
    }
    if (Array.isArray(record.data)) {
      return record.data as T[]
    }
  }
  return []
}

function formatPercent(value: number | null | undefined) {
  if (value == null || Number.isNaN(value)) {
    return '-'
  }
  return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`
}

function formatDateTime(value: string | undefined) {
  if (!value) {
    return '-'
  }
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return value
  }
  return date.toLocaleString()
}

function matchesSearch(values: Array<string | number | undefined>, query: string) {
  const normalizedQuery = query.trim().toLowerCase()
  if (!normalizedQuery) {
    return true
  }
  return values.some((value) => String(value ?? '').toLowerCase().includes(normalizedQuery))
}

export default function PaperTradingAccount() {
  const { t } = useTranslation('trading')
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const accountId = Number(useParams().accountId)
  const isValidAccountId = Number.isFinite(accountId) && accountId > 0

  const [orderModal, setOrderModal] = useState(false)
  const [deployModal, setDeployModal] = useState(false)
  const [orderForm, setOrderForm] = useState({ symbol: '', direction: 'buy', order_type: 'market', quantity: '100', price: '' })
  const [deployForm, setDeployForm] = useState({ strategy_source_type: 'strategy', strategy_id: '', composite_strategy_id: '', vt_symbol: '', execution_mode: 'auto' })
  const [deploymentSearch, setDeploymentSearch] = useState('')
  const [deploymentStatus, setDeploymentStatus] = useState('')
  const [positionSearch, setPositionSearch] = useState('')
  const [orderSearch, setOrderSearch] = useState('')
  const [orderStatus, setOrderStatus] = useState('')
  const [signalSearch, setSignalSearch] = useState('')
  const [signalStatus, setSignalStatus] = useState('')

  const { data: account, isLoading: accountLoading } = useQuery<PaperAccount>({
    queryKey: ['paper-account', accountId],
    queryFn: () => paperAccountAPI.get(accountId).then((response) => response.data as PaperAccount),
    enabled: isValidAccountId,
  })

  const { data: analytics } = useQuery<PaperAnalytics>({
    queryKey: ['paper-account-analytics', accountId],
    queryFn: () => paperAccountAPI.getAnalytics(accountId).then((response) => response.data as PaperAnalytics),
    enabled: isValidAccountId,
    refetchInterval: 15_000,
  })

  const { data: curve = [] } = useQuery<EquityPoint[]>({
    queryKey: ['paper-account-curve', accountId],
    queryFn: () => paperAccountAPI.getEquityCurve(accountId).then((response) => unwrapArray<EquityPoint>(response.data, 'curve')),
    enabled: isValidAccountId,
    refetchInterval: 30_000,
  })

  const { data: deployments = [] } = useQuery<PaperDeployment[]>({
    queryKey: ['paper-account-deployments', accountId],
    queryFn: () => paperTradingAPI.listDeployments({ paper_account_id: accountId }).then((response) => unwrapArray<PaperDeployment>(response.data, 'deployments')),
    enabled: isValidAccountId,
    refetchInterval: 10_000,
  })

  const { data: positions = [] } = useQuery<PaperPosition[]>({
    queryKey: ['paper-account-positions', accountId],
    queryFn: () => paperTradingAPI.getPaperPositions({ paper_account_id: accountId }).then((response) => unwrapArray<PaperPosition>(response.data, 'positions')),
    enabled: isValidAccountId,
    refetchInterval: 10_000,
  })

  const { data: orders = [] } = useQuery<PaperOrder[]>({
    queryKey: ['paper-account-orders', accountId],
    queryFn: () =>
      paperTradingAPI
        .listPaperOrders({ paper_account_id: accountId, page: 1, page_size: 50 })
        .then((response) => unwrapArray<PaperOrder>(response.data, 'orders')),
    enabled: isValidAccountId,
    refetchInterval: 10_000,
  })

  const { data: signals = [] } = useQuery<PaperSignal[]>({
    queryKey: ['paper-account-signals', accountId],
    queryFn: () => paperTradingAPI.listSignals({ paper_account_id: accountId }).then((response) => unwrapArray<PaperSignal>(response.data, 'signals')),
    enabled: isValidAccountId,
    refetchInterval: 5_000,
  })

  const { data: strategies = [] } = useQuery<{ id: number; name: string }[]>({
    queryKey: ['strategies-list-paper'],
    queryFn: async () => unwrapArray<{ id: number; name: string }>((await strategiesAPI.list()).data, 'data'),
    enabled: deployModal,
  })

  const { data: compositeStrategies = [] } = useQuery<{ id: number; name: string }[]>({
    queryKey: ['composite-strategies-paper'],
    queryFn: () => compositeStrategiesAPI.list().then((response) => unwrapArray<{ id: number; name: string }>(response.data, 'items')),
    enabled: deployModal && deployForm.strategy_source_type === 'composite',
  })

  const invalidateAccountQueries = () => {
    queryClient.invalidateQueries({ queryKey: ['paper-accounts'] })
    queryClient.invalidateQueries({ queryKey: ['paper-account', accountId] })
    queryClient.invalidateQueries({ queryKey: ['paper-account-analytics', accountId] })
    queryClient.invalidateQueries({ queryKey: ['paper-account-curve', accountId] })
    queryClient.invalidateQueries({ queryKey: ['paper-account-deployments', accountId] })
    queryClient.invalidateQueries({ queryKey: ['paper-account-positions', accountId] })
    queryClient.invalidateQueries({ queryKey: ['paper-account-orders', accountId] })
    queryClient.invalidateQueries({ queryKey: ['paper-account-signals', accountId] })
  }

  const deployMutation = useMutation({
    mutationFn: () =>
      paperTradingAPI.deployStrategy({
        strategy_source_type: deployForm.strategy_source_type,
        strategy_id: deployForm.strategy_source_type === 'strategy' && deployForm.strategy_id ? Number(deployForm.strategy_id) : undefined,
        composite_strategy_id: deployForm.strategy_source_type === 'composite' && deployForm.composite_strategy_id ? Number(deployForm.composite_strategy_id) : undefined,
        vt_symbol: deployForm.vt_symbol.trim() || undefined,
        parameters: {},
        paper_account_id: accountId,
        execution_mode: deployForm.execution_mode,
      }),
    onSuccess: () => {
      showToast(t('paper.createSuccess'), 'success')
      setDeployModal(false)
      setDeployForm({ strategy_source_type: 'strategy', strategy_id: '', composite_strategy_id: '', vt_symbol: '', execution_mode: 'auto' })
      invalidateAccountQueries()
    },
    onError: () => showToast(t('paper.createFailed'), 'error'),
  })

  const createOrderMutation = useMutation({
    mutationFn: () =>
      paperTradingAPI.createPaperOrder({
        paper_account_id: accountId,
        symbol: orderForm.symbol,
        direction: orderForm.direction,
        order_type: orderForm.order_type,
        quantity: Number(orderForm.quantity),
        price: orderForm.price ? Number(orderForm.price) : undefined,
      }),
    onSuccess: () => {
      showToast(t('paper.orderCreated', 'Order submitted'), 'success')
      setOrderModal(false)
      setOrderForm({ symbol: '', direction: 'buy', order_type: 'market', quantity: '100', price: '' })
      invalidateAccountQueries()
    },
    onError: (error: { response?: { data?: { message?: string } } }) => {
      showToast(error?.response?.data?.message || t('paper.orderFailed', 'Order failed'), 'error')
    },
  })

  const stopMutation = useMutation({
    mutationFn: (deploymentId: number) => paperTradingAPI.stopDeployment(deploymentId),
    onSuccess: () => {
      showToast(t('paper.stopSuccess'), 'success')
      queryClient.invalidateQueries({ queryKey: ['paper-account-deployments', accountId] })
    },
  })

  const cancelOrderMutation = useMutation({
    mutationFn: (orderId: number) => paperTradingAPI.cancelPaperOrder(orderId),
    onSuccess: () => {
      showToast(t('paper.orderCancelled', 'Order cancelled'), 'success')
      invalidateAccountQueries()
    },
  })

  const confirmSignalMutation = useMutation({
    mutationFn: (signalId: number) => paperTradingAPI.confirmSignal(signalId),
    onSuccess: () => {
      showToast(t('paper.confirmSuccess', 'Signal confirmed'), 'success')
      invalidateAccountQueries()
    },
    onError: (error: { response?: { data?: { message?: string } } }) => {
      showToast(error?.response?.data?.message || t('paper.confirmFailed', 'Confirm failed'), 'error')
    },
  })

  const rejectSignalMutation = useMutation({
    mutationFn: (signalId: number) => paperTradingAPI.rejectSignal(signalId),
    onSuccess: () => {
      showToast(t('paper.rejectSuccess', 'Signal rejected'), 'success')
      invalidateAccountQueries()
    },
  })

  const deploymentColumns: Column<PaperDeployment>[] = [
    { key: 'strategy_name', label: t('paper.columns.strategy', 'Strategy') },
    {
      key: 'strategy_source_type',
      label: t('paper.columns.source', 'Source'),
      render: (deployment) => (
        <Badge variant={deployment.strategy_source_type === 'composite' ? 'warning' : 'primary'}>
          {deployment.strategy_source_type === 'composite' ? t('paper.source.composite', 'Composite Strategy') : t('paper.source.strategy', 'CTA Strategy')}
        </Badge>
      ),
    },
    { key: 'vt_symbol', label: t('paper.columns.symbol', 'Symbol') },
    {
      key: 'status',
      label: t('paper.columns.status', 'Status'),
      render: (deployment) => <Badge variant={deployment.status === 'running' ? 'success' : 'muted'}>{deployment.status}</Badge>,
    },
    {
      key: 'started_at',
      label: t('paper.columns.createdAt', 'Created At'),
      render: (deployment) => formatDateTime(deployment.started_at || deployment.created_at),
    },
    {
      key: 'id',
      label: t('paper.columns.actions', 'Actions'),
      render: (deployment) =>
        deployment.status === 'running' ? (
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation()
              stopMutation.mutate(deployment.id)
            }}
            className="inline-flex items-center gap-1 text-xs text-red-500 hover:text-red-700"
          >
            <Square size={12} />
            {t('paper.deployment.stop', 'Stop')}
          </button>
        ) : null,
    },
  ]

  const positionColumns: Column<PaperPosition>[] = [
    { key: 'symbol', label: t('paper.columns.symbol', 'Symbol') },
    {
      key: 'direction',
      label: t('paper.columns.direction', 'Direction'),
      render: (position) => <Badge variant={position.direction === 'buy' ? 'success' : 'destructive'}>{position.direction}</Badge>,
    },
    { key: 'quantity', label: t('paper.columns.quantity', 'Quantity') },
    { key: 'avg_cost', label: t('paper.columns.avgCost', 'Avg Cost'), render: (position) => position.avg_cost.toFixed(2) },
    { key: 'current_price', label: t('paper.columns.currentPrice', 'Current Price'), render: (position) => position.current_price.toFixed(2) },
    {
      key: 'pnl',
      label: t('paper.columns.pnl', 'P&L'),
      render: (position) => (
        <span className={position.pnl >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-500'}>
          {position.pnl >= 0 ? '+' : ''}
          {position.pnl.toLocaleString()}
        </span>
      ),
    },
    {
      key: 'pnl_pct',
      label: t('paper.columns.pnlPct', 'Return'),
      render: (position) => (
        <span className={position.pnl_pct >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-500'}>
          {formatPercent(position.pnl_pct * 100)}
        </span>
      ),
    },
  ]

  const orderColumns: Column<PaperOrder>[] = [
    { key: 'symbol', label: t('paper.columns.symbol', 'Symbol') },
    {
      key: 'direction',
      label: t('paper.columns.direction', 'Direction'),
      render: (order) => <Badge variant={order.direction === 'buy' ? 'success' : 'destructive'}>{order.direction}</Badge>,
    },
    { key: 'order_type', label: t('paper.columns.orderType', 'Type') },
    { key: 'quantity', label: t('paper.columns.quantity', 'Quantity') },
    {
      key: 'price',
      label: t('paper.columns.price', 'Price'),
      render: (order) => (order.avg_fill_price || order.price ? Number(order.avg_fill_price || order.price).toFixed(2) : '-'),
    },
    {
      key: 'status',
      label: t('paper.columns.status', 'Status'),
      render: (order) => <Badge variant={order.status === 'filled' ? 'success' : order.status === 'cancelled' ? 'muted' : 'primary'}>{order.status}</Badge>,
    },
    { key: 'created_at', label: t('paper.columns.time', 'Time'), render: (order) => formatDateTime(order.created_at) },
    {
      key: 'id',
      label: t('paper.columns.actions', 'Actions'),
      render: (order) =>
        order.status === 'submitted' || order.status === 'created' ? (
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation()
              cancelOrderMutation.mutate(order.id)
            }}
            className="text-xs text-red-500 hover:text-red-700"
          >
            {t('paper.order.cancel', 'Cancel')}
          </button>
        ) : null,
    },
  ]

  const signalColumns: Column<PaperSignal>[] = [
    { key: 'symbol', label: t('paper.columns.symbol', 'Symbol') },
    {
      key: 'direction',
      label: t('paper.columns.direction', 'Direction'),
      render: (signal) => <Badge variant={signal.direction === 'buy' ? 'success' : 'destructive'}>{signal.direction}</Badge>,
    },
    { key: 'quantity', label: t('paper.columns.quantity', 'Quantity') },
    {
      key: 'suggested_price',
      label: t('paper.columns.price', 'Price'),
      render: (signal) => (signal.suggested_price ? signal.suggested_price.toFixed(2) : '-'),
    },
    {
      key: 'reason',
      label: t('paper.columns.reason', 'Reason'),
      render: (signal) => <span className="text-xs text-muted-foreground">{signal.reason || '-'}</span>,
    },
    {
      key: 'status',
      label: t('paper.columns.status', 'Status'),
      render: (signal) => <Badge variant={signal.status === 'pending' ? 'warning' : signal.status === 'confirmed' ? 'success' : 'muted'}>{signal.status}</Badge>,
    },
    {
      key: 'id',
      label: t('paper.columns.actions', 'Actions'),
      render: (signal) =>
        signal.status === 'pending' ? (
          <div className="flex gap-2">
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation()
                confirmSignalMutation.mutate(signal.id)
              }}
              className="inline-flex items-center gap-1 text-xs text-green-600 hover:text-green-800"
            >
              <CheckCircle2 size={12} />
              {t('paper.signals.confirm', 'Confirm')}
            </button>
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation()
                rejectSignalMutation.mutate(signal.id)
              }}
              className="inline-flex items-center gap-1 text-xs text-red-500 hover:text-red-700"
            >
              <XCircle size={12} />
              {t('paper.signals.reject', 'Reject')}
            </button>
          </div>
        ) : null,
    },
  ]

  const filteredDeployments = useMemo(
    () =>
      deployments.filter((deployment) => {
        const matchesQuery = matchesSearch(
          [deployment.strategy_name, deployment.vt_symbol, deployment.strategy_source_type, deployment.execution_mode],
          deploymentSearch,
        )
        const matchesStatus = !deploymentStatus || deployment.status === deploymentStatus
        return matchesQuery && matchesStatus
      }),
    [deployments, deploymentSearch, deploymentStatus],
  )

  const filteredPositions = useMemo(
    () =>
      positions.filter((position) =>
        matchesSearch([position.symbol, position.direction, position.quantity], positionSearch)
      ),
    [positions, positionSearch],
  )

  const filteredOrders = useMemo(
    () =>
      orders.filter((order) => {
        const matchesQuery = matchesSearch([order.symbol, order.direction, order.order_type], orderSearch)
        const matchesStatus = !orderStatus || order.status === orderStatus
        return matchesQuery && matchesStatus
      }),
    [orders, orderSearch, orderStatus],
  )

  const filteredSignals = useMemo(
    () =>
      signals.filter((signal) => {
        const matchesQuery = matchesSearch([signal.symbol, signal.direction, signal.reason, signal.strategy_name], signalSearch)
        const matchesStatus = !signalStatus || signal.status === signalStatus
        return matchesQuery && matchesStatus
      }),
    [signals, signalSearch, signalStatus],
  )

  const deploymentPagination = usePagination(filteredDeployments, { initialPageSize: 5 })
  const positionPagination = usePagination(filteredPositions, { initialPageSize: 5 })
  const orderPagination = usePagination(filteredOrders, { initialPageSize: 8 })
  const signalPagination = usePagination(filteredSignals, { initialPageSize: 5 })

  if (!isValidAccountId) {
    return (
      <div className="space-y-4">
        <button type="button" onClick={() => navigate('/paper-trading')} className="inline-flex items-center gap-1 text-sm text-primary hover:opacity-80">
          <ArrowLeft size={14} />
          {t('paper.detail.back', 'Back to accounts')}
        </button>
        <div className="rounded-2xl border border-border bg-card p-6 text-sm text-muted-foreground">
          {t('paper.detail.invalidAccount', 'Invalid paper account.')}
        </div>
      </div>
    )
  }

  if (!account && accountLoading) {
    return <div className="text-sm text-muted-foreground">{t('paper.detail.loading', 'Loading paper account...')}</div>
  }

  if (!account) {
    return (
      <div className="space-y-4">
        <button type="button" onClick={() => navigate('/paper-trading')} className="inline-flex items-center gap-1 text-sm text-primary hover:opacity-80">
          <ArrowLeft size={14} />
          {t('paper.detail.back', 'Back to accounts')}
        </button>
        <div className="rounded-2xl border border-border bg-card p-6 text-sm text-muted-foreground">
          {t('paper.detail.notFound', 'Paper account not found.')}
        </div>
      </div>
    )
  }

  const curveDates = curve.map((point) => point.date)
  const curveValues = curve.map((point) => point.equity ?? point.total_equity ?? 0)
  const pendingSignals = signals.filter((signal) => signal.status === 'pending').length
  const sectionShellClass = 'rounded-2xl border border-border bg-card p-5 shadow-sm'
  const filterOptions = {
    deploymentStatus: [
      { value: '', label: t('paper.filters.allStatuses', 'All statuses') },
      { value: 'running', label: t('paper.filters.running', 'Running') },
      { value: 'stopped', label: t('paper.filters.stopped', 'Stopped') },
      { value: 'pending', label: t('paper.filters.pending', 'Pending') },
      { value: 'error', label: t('paper.filters.error', 'Error') },
    ],
    orderStatus: [
      { value: '', label: t('paper.filters.allStatuses', 'All statuses') },
      { value: 'created', label: t('paper.filters.created', 'Created') },
      { value: 'submitted', label: t('paper.filters.submitted', 'Submitted') },
      { value: 'filled', label: t('paper.filters.filled', 'Filled') },
      { value: 'cancelled', label: t('paper.filters.cancelled', 'Cancelled') },
    ],
    signalStatus: [
      { value: '', label: t('paper.filters.allStatuses', 'All statuses') },
      { value: 'pending', label: t('paper.filters.pending', 'Pending') },
      { value: 'confirmed', label: t('paper.filters.confirmed', 'Confirmed') },
      { value: 'rejected', label: t('paper.filters.rejected', 'Rejected') },
      { value: 'expired', label: t('paper.filters.expired', 'Expired') },
    ],
  }

  return (
    <div className="space-y-6" data-testid="paper-account-detail">
      <div className="rounded-[28px] border border-border bg-[radial-gradient(circle_at_top_left,_rgba(34,197,94,0.12),_transparent_35%),linear-gradient(135deg,rgba(255,255,255,0.98),rgba(249,250,251,0.94))] p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <button type="button" onClick={() => navigate('/paper-trading')} className="mb-2 inline-flex items-center gap-1 text-sm text-primary hover:opacity-80">
            <ArrowLeft size={14} />
            {t('paper.detail.back', 'Back to accounts')}
          </button>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold text-foreground">{account.name}</h1>
            <Badge variant="primary">{account.market}</Badge>
            <Badge variant={account.status === 'active' ? 'success' : 'muted'}>{account.status}</Badge>
          </div>
          <p className="text-sm text-muted-foreground">{t('paper.detail.subtitle', 'Review deployed strategies, positions, orders, performance, and signals for this paper account.')}</p>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={() => setOrderModal(true)} className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-2 text-sm hover:bg-muted">
            <ShoppingCart size={16} />
            {t('paper.newOrder', 'New Order')}
          </button>
          <button type="button" onClick={() => setDeployModal(true)} className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-sm text-white hover:opacity-90">
            <Play size={16} />
            {t('paper.newSimulation', 'New Paper Deployment')}
          </button>
        </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 xl:grid-cols-6">
        <StatCard label={t('paper.columns.balance', 'Balance')} value={formatMoney(account.balance, account.currency)} />
        <StatCard label={t('paper.detail.frozen', 'Frozen Funds')} value={formatMoney(account.frozen, account.currency)} />
        <StatCard label={t('paper.accounts.marketValue', 'Market Value')} value={formatMoney(account.market_value, account.currency)} />
        <StatCard label={t('paper.stats.totalEquity', 'Total Equity')} value={formatMoney(account.total_equity, account.currency)} />
        <StatCard label={t('paper.stats.totalPnl', 'Total P&L')} value={formatMoney(account.total_pnl, account.currency)} changeType={account.total_pnl >= 0 ? 'positive' : 'negative'} />
        <StatCard label={t('paper.stats.pendingSignals', 'Pending Signals')} value={pendingSignals} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.5fr)_minmax(320px,0.8fr)]">
        <section className={sectionShellClass}>
          <div className="mb-4 flex items-center gap-2">
            <TrendingUp size={18} className="text-muted-foreground" />
            <div>
              <h2 className="font-semibold text-card-foreground">{t('paper.detail.performance', 'Equity Curve')}</h2>
              <p className="text-sm text-muted-foreground">{t('paper.detail.performanceSubtitle', 'Track the account equity path and summary analytics.')}</p>
            </div>
          </div>
          {curveDates.length > 0 ? (
            <LineChart xData={curveDates} series={[{ name: t('paper.detail.equitySeries', 'Equity'), data: curveValues }]} height={280} />
          ) : (
            <p className="py-8 text-center text-sm text-muted-foreground">{t('paper.empty.performance', 'No performance data')}</p>
          )}
        </section>

        <section className={sectionShellClass}>
          <h2 className="font-semibold text-card-foreground">{t('paper.detail.accountOverview', 'Account Overview')}</h2>
          <div className="mt-4 space-y-3 text-sm">
            <div className="flex items-center justify-between gap-4"><span className="text-muted-foreground">{t('paper.detail.createdAt', 'Created At')}</span><span>{formatDateTime(account.created_at)}</span></div>
            <div className="flex items-center justify-between gap-4"><span className="text-muted-foreground">{t('paper.detail.updatedAt', 'Updated At')}</span><span>{formatDateTime(account.updated_at)}</span></div>
            <div className="flex items-center justify-between gap-4"><span className="text-muted-foreground">{t('paper.detail.totalTrades', 'Total Trades')}</span><span>{analytics?.total_trades ?? 0}</span></div>
            <div className="flex items-center justify-between gap-4"><span className="text-muted-foreground">{t('paper.detail.winRate', 'Win Rate')}</span><span>{formatPercent(analytics?.win_rate)}</span></div>
            <div className="flex items-center justify-between gap-4"><span className="text-muted-foreground">{t('paper.detail.sharpe', 'Sharpe')}</span><span>{analytics?.sharpe_ratio == null ? '-' : analytics.sharpe_ratio.toFixed(2)}</span></div>
            <div className="flex items-center justify-between gap-4"><span className="text-muted-foreground">{t('paper.detail.profitFactor', 'Profit Factor')}</span><span>{analytics?.profit_factor == null ? '-' : analytics.profit_factor.toFixed(2)}</span></div>
            <div className="flex items-center justify-between gap-4"><span className="text-muted-foreground">{t('paper.detail.maxDrawdown', 'Max Drawdown')}</span><span>{formatPercent(analytics?.max_drawdown_pct)}</span></div>
            <div className="flex items-center justify-between gap-4"><span className="text-muted-foreground">{t('paper.columns.pnlPct', 'Return')}</span><span>{formatPercent(account.return_pct)}</span></div>
          </div>
        </section>
      </div>

      <section className={`${sectionShellClass} space-y-4`}>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold text-foreground">{t('paper.detail.deployments', 'Deployed Strategies')}</h2>
              <Badge variant="muted">{filteredDeployments.length}</Badge>
            </div>
            <p className="text-sm text-muted-foreground">{t('paper.detail.deploymentsSubtitle', 'Track strategy runtime state and narrow the list by status or keyword.')}</p>
          </div>
        </div>
        <FilterBar
          searchValue={deploymentSearch}
          onSearchChange={setDeploymentSearch}
          searchPlaceholder={t('paper.detail.searchDeployments', 'Search strategy or symbol')}
          filters={[
            {
              key: 'deployment-status',
              value: deploymentStatus,
              options: filterOptions.deploymentStatus,
              onChange: setDeploymentStatus,
            },
          ]}
        />
        <DataTable columns={deploymentColumns} data={deploymentPagination.paginatedItems} emptyText={t('paper.empty.deployments', 'No paper deployments')} />
        <Pagination
          page={deploymentPagination.page}
          pageSize={deploymentPagination.pageSize}
          total={deploymentPagination.total}
          onPageChange={deploymentPagination.onPageChange}
          onPageSizeChange={deploymentPagination.onPageSizeChange}
        />
      </section>

      <section className={`${sectionShellClass} space-y-4`}>
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold text-foreground">{t('paper.detail.positions', 'Positions')}</h2>
            <Badge variant="muted">{filteredPositions.length}</Badge>
          </div>
          <p className="text-sm text-muted-foreground">{t('paper.detail.positionsSubtitle', 'Search held symbols and scan unrealized P&L across the account.')}</p>
        </div>
        <FilterBar
          searchValue={positionSearch}
          onSearchChange={setPositionSearch}
          searchPlaceholder={t('paper.detail.searchPositions', 'Search held symbol')}
        />
        <DataTable columns={positionColumns} data={positionPagination.paginatedItems} emptyText={t('paper.empty.positions', 'No paper positions')} />
        <Pagination
          page={positionPagination.page}
          pageSize={positionPagination.pageSize}
          total={positionPagination.total}
          onPageChange={positionPagination.onPageChange}
          onPageSizeChange={positionPagination.onPageSizeChange}
        />
      </section>

      <section className={`${sectionShellClass} space-y-4`}>
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold text-foreground">{t('paper.detail.orders', 'Order History')}</h2>
            <Badge variant="muted">{filteredOrders.length}</Badge>
          </div>
          <p className="text-sm text-muted-foreground">{t('paper.detail.ordersSubtitle', 'Filter execution records by symbol, side, or lifecycle status.')}</p>
        </div>
        <FilterBar
          searchValue={orderSearch}
          onSearchChange={setOrderSearch}
          searchPlaceholder={t('paper.detail.searchOrders', 'Search symbol or order type')}
          filters={[
            {
              key: 'order-status',
              value: orderStatus,
              options: filterOptions.orderStatus,
              onChange: setOrderStatus,
            },
          ]}
        />
        <DataTable columns={orderColumns} data={orderPagination.paginatedItems} emptyText={t('paper.empty.orders', 'No paper orders')} />
        <Pagination
          page={orderPagination.page}
          pageSize={orderPagination.pageSize}
          total={orderPagination.total}
          onPageChange={orderPagination.onPageChange}
          onPageSizeChange={orderPagination.onPageSizeChange}
        />
      </section>

      <section className={`${sectionShellClass} space-y-4`}>
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold text-foreground">{t('paper.detail.signals', 'Pending Signals')}</h2>
            <Badge variant="muted">{filteredSignals.length}</Badge>
          </div>
          <p className="text-sm text-muted-foreground">{t('paper.detail.signalsSubtitle', 'Review confirmation queue and narrow by symbol or signal status.')}</p>
        </div>
        <FilterBar
          searchValue={signalSearch}
          onSearchChange={setSignalSearch}
          searchPlaceholder={t('paper.detail.searchSignals', 'Search symbol or reason')}
          filters={[
            {
              key: 'signal-status',
              value: signalStatus,
              options: filterOptions.signalStatus,
              onChange: setSignalStatus,
            },
          ]}
        />
        <DataTable columns={signalColumns} data={signalPagination.paginatedItems} emptyText={t('paper.signals.noSignals', 'No signals')} />
        <Pagination
          page={signalPagination.page}
          pageSize={signalPagination.pageSize}
          total={signalPagination.total}
          onPageChange={signalPagination.onPageChange}
          onPageSizeChange={signalPagination.onPageSizeChange}
        />
      </section>

      <Modal
        open={orderModal}
        onClose={() => setOrderModal(false)}
        title={t('paper.modal.newOrder', 'Submit Paper Order')}
        footer={(
          <>
            <button onClick={() => setOrderModal(false)} className="rounded-md border border-border px-4 py-2 text-sm hover:bg-muted">{t('paper.modal.cancel')}</button>
            <button onClick={() => createOrderMutation.mutate()} disabled={!orderForm.symbol || !orderForm.quantity} className="rounded-md bg-primary px-4 py-2 text-sm text-white hover:opacity-90 disabled:opacity-50">{t('paper.modal.submit')}</button>
          </>
        )}
      >
        <div className="flex flex-col gap-4">
          <div>
            <label className="mb-1 block text-sm font-medium">{t('paper.columns.symbol', 'Symbol')}</label>
            <input value={orderForm.symbol} onChange={(event) => setOrderForm({ ...orderForm, symbol: event.target.value.toUpperCase() })} placeholder="600519.SH" className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium">{t('paper.columns.direction', 'Direction')}</label>
              <select value={orderForm.direction} onChange={(event) => setOrderForm({ ...orderForm, direction: event.target.value })} className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm">
                <option value="buy">{t('paper.side.buy', 'Buy')}</option>
                <option value="sell">{t('paper.side.sell', 'Sell')}</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">{t('paper.columns.orderType', 'Order Type')}</label>
              <select value={orderForm.order_type} onChange={(event) => setOrderForm({ ...orderForm, order_type: event.target.value })} className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm">
                <option value="market">Market</option>
                <option value="limit">Limit</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium">{t('paper.columns.quantity', 'Quantity')}</label>
              <input type="number" value={orderForm.quantity} onChange={(event) => setOrderForm({ ...orderForm, quantity: event.target.value })} className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm" />
            </div>
            {orderForm.order_type !== 'market' && (
              <div>
                <label className="mb-1 block text-sm font-medium">{t('paper.columns.price', 'Price')}</label>
                <input type="number" step="0.01" value={orderForm.price} onChange={(event) => setOrderForm({ ...orderForm, price: event.target.value })} className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm" />
              </div>
            )}
          </div>
        </div>
      </Modal>

      <Modal
        open={deployModal}
        onClose={() => setDeployModal(false)}
        title={t('paper.modal.title', 'Create Paper Deployment')}
        footer={(
          <>
            <button onClick={() => setDeployModal(false)} className="rounded-md border border-border px-4 py-2 text-sm hover:bg-muted">{t('paper.modal.cancel')}</button>
            <button onClick={() => deployMutation.mutate()} disabled={deployForm.strategy_source_type === 'strategy' ? !deployForm.strategy_id : !deployForm.composite_strategy_id} className="rounded-md bg-primary px-4 py-2 text-sm text-white hover:opacity-90 disabled:opacity-50">{t('paper.modal.submit', 'Create Deployment')}</button>
          </>
        )}
      >
        <div className="flex flex-col gap-4">
          <div>
            <label className="mb-1 block text-sm font-medium">{t('paper.modal.sourceType', 'Strategy Source')}</label>
            <select value={deployForm.strategy_source_type} onChange={(event) => setDeployForm({ ...deployForm, strategy_source_type: event.target.value, strategy_id: '', composite_strategy_id: '' })} className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm">
              <option value="strategy">{t('paper.source.strategy', 'CTA Strategy')}</option>
              <option value="composite">{t('paper.source.composite', 'Composite Strategy')}</option>
            </select>
          </div>
          {deployForm.strategy_source_type === 'strategy' ? (
            <div>
              <label className="mb-1 block text-sm font-medium">{t('paper.modal.strategy', 'Select Strategy')}</label>
              <select value={deployForm.strategy_id} onChange={(event) => setDeployForm({ ...deployForm, strategy_id: event.target.value })} className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm">
                <option value="">{t('paper.modal.strategyPlaceholder', 'Select strategy...')}</option>
                {strategies.map((strategy) => <option key={strategy.id} value={strategy.id}>{strategy.name}</option>)}
              </select>
            </div>
          ) : (
            <div>
              <label className="mb-1 block text-sm font-medium">{t('paper.modal.compositeStrategy', 'Select Composite Strategy')}</label>
              <select value={deployForm.composite_strategy_id} onChange={(event) => setDeployForm({ ...deployForm, composite_strategy_id: event.target.value })} className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm">
                <option value="">{t('paper.modal.compositeStrategyPlaceholder', 'Select composite strategy...')}</option>
                {compositeStrategies.map((strategy) => <option key={strategy.id} value={strategy.id}>{strategy.name}</option>)}
              </select>
            </div>
          )}
          <div>
            <label className="mb-1 block text-sm font-medium">{t('paper.modal.vtSymbol', 'VT Symbol')}</label>
            <input value={deployForm.vt_symbol} onChange={(event) => setDeployForm({ ...deployForm, vt_symbol: event.target.value })} placeholder={deployForm.strategy_source_type === 'composite' ? '600519.SH,000858.SZ' : '600519.SH'} className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm" />
            <p className="mt-1 text-xs text-muted-foreground">{t('paper.modal.vtSymbolHint', 'Optional for composite strategies with explicit universe symbols. Use comma-separated symbols when needed.')}</p>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">{t('paper.modal.executionMode', 'Execution Mode')}</label>
            <select value={deployForm.execution_mode} onChange={(event) => setDeployForm({ ...deployForm, execution_mode: event.target.value })} className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm">
              <option value="auto">{t('paper.mode.auto', 'Auto (signal → order)')}</option>
              <option value="semi_auto">{t('paper.mode.semiAuto', 'Semi-auto (confirm signals)')}</option>
            </select>
          </div>
        </div>
      </Modal>
    </div>
  )
}