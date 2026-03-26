import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  AlertCircle,
  BarChart3,
  CheckCircle2,
  ListOrdered,
  Play,
  Plus,
  ShoppingCart,
  Square,
  TrendingUp,
  Wallet,
  XCircle,
} from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import LineChart from '../components/charts/LineChart'
import Badge from '../components/ui/Badge'
import DataTable, { type Column } from '../components/ui/DataTable'
import FilterBar from '../components/ui/FilterBar'
import Modal from '../components/ui/Modal'
import StatCard from '../components/ui/StatCard'
import TabPanel from '../components/ui/TabPanel'
import { showToast } from '../components/ui/toast-service'
import { paperTradingAPI, paperAccountAPI, strategiesAPI } from '../lib/api'
import type { PaperAccount, PaperSignal } from '../types'

interface Deployment {
  id: string
  strategy_name: string
  status: string
  capital: number
  pnl: number
  pnl_pct: number
  positions: number
  paper_account_id?: number
  execution_mode?: string
  created_at: string
}

interface PaperOrder {
  id: string
  symbol: string
  direction: string
  order_type: string
  price: number
  quantity: number
  filled_quantity: number
  avg_fill_price: number
  fee: number
  status: string
  paper_account_id: number
  created_at: string
}

interface PaperPosition {
  id: string
  symbol: string
  direction: string
  quantity: number
  avg_cost: number
  current_price: number
  pnl: number
  pnl_pct: number
}

const CURRENCY_MAP: Record<string, string> = { CNY: '¥', HKD: 'HK$', USD: '$' }

function fmtMoney(value: number, currency: string = 'CNY') {
  const prefix = CURRENCY_MAP[currency] || '¥'
  return `${prefix}${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export default function PaperTrading() {
  const { t } = useTranslation('trading')
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState('accounts')
  const [newAccountModal, setNewAccountModal] = useState(false)
  const [orderModal, setOrderModal] = useState(false)
  const [deployModal, setDeployModal] = useState(false)
  const [search, setSearch] = useState('')
  const [accountForm, setAccountForm] = useState({ name: '', capital: '1000000', market: 'CN' })
  const [orderForm, setOrderForm] = useState({ paper_account_id: '', symbol: '', direction: 'buy', order_type: 'market', quantity: '100', price: '' })
  const [deployForm, setDeployForm] = useState({ strategy: '', vt_symbol: '', paper_account_id: '', execution_mode: 'auto' })

  const tabs = [
    { key: 'accounts', label: t('paper.tabs.accounts', 'Accounts'), icon: <Wallet size={16} /> },
    { key: 'deployments', label: t('paper.tabs.deployments'), icon: <Play size={16} /> },
    { key: 'orders', label: t('paper.tabs.orders'), icon: <ShoppingCart size={16} /> },
    { key: 'positions', label: t('paper.tabs.positions'), icon: <ListOrdered size={16} /> },
    { key: 'signals', label: t('paper.tabs.signals', 'Signals'), icon: <AlertCircle size={16} /> },
    { key: 'performance', label: t('paper.tabs.performance'), icon: <TrendingUp size={16} /> },
  ]

  // ── Paper Accounts ─────────────────────────────────────
  const { data: accounts = [] } = useQuery<PaperAccount[]>({
    queryKey: ['paper-accounts'],
    queryFn: () => paperAccountAPI.list().then((r) => {
      const d = r.data
      return Array.isArray(d) ? d : d?.accounts ?? d?.data ?? []
    }),
    refetchInterval: 15_000,
  })

  const createAccountMutation = useMutation({
    mutationFn: () => paperAccountAPI.create({
      name: accountForm.name || `Paper ${accountForm.market}`,
      initial_capital: Number(accountForm.capital),
      market: accountForm.market,
    }),
    onSuccess: () => {
      showToast(t('paper.accountCreated', 'Account created'), 'success')
      setNewAccountModal(false)
      setAccountForm({ name: '', capital: '1000000', market: 'CN' })
      queryClient.invalidateQueries({ queryKey: ['paper-accounts'] })
    },
    onError: () => showToast(t('paper.accountCreateFailed', 'Create failed'), 'error'),
  })

  const closeAccountMutation = useMutation({
    mutationFn: (id: number) => paperAccountAPI.close(id),
    onSuccess: () => {
      showToast(t('paper.accountClosed', 'Account closed'), 'success')
      queryClient.invalidateQueries({ queryKey: ['paper-accounts'] })
    },
  })

  // ── Deployments ────────────────────────────────────────
  const { data: deployments = [] } = useQuery<Deployment[]>({
    queryKey: ['paper-deployments'],
    queryFn: () => paperTradingAPI.listDeployments().then((r) => {
      const d = r.data
      return Array.isArray(d) ? d : d?.deployments ?? d?.data ?? []
    }),
    refetchInterval: 10_000,
  })

  const { data: strategies = [] } = useQuery<{ id: string; name: string }[]>({
    queryKey: ['strategies-list-paper'],
    queryFn: () => strategiesAPI.list().then((r) => {
      const d = r.data
      return Array.isArray(d) ? d : d?.data ?? []
    }),
    enabled: deployModal,
  })

  const deployMutation = useMutation({
    mutationFn: () => paperTradingAPI.deployStrategy({
      strategy_id: Number(deployForm.strategy),
      vt_symbol: deployForm.vt_symbol,
      parameters: {},
      paper_account_id: deployForm.paper_account_id ? Number(deployForm.paper_account_id) : undefined,
      execution_mode: deployForm.execution_mode,
    }),
    onSuccess: () => {
      showToast(t('paper.createSuccess'), 'success')
      setDeployModal(false)
      queryClient.invalidateQueries({ queryKey: ['paper-deployments'] })
    },
    onError: () => showToast(t('paper.createFailed'), 'error'),
  })

  const stopMutation = useMutation({
    mutationFn: (id: string) => paperTradingAPI.stopDeployment(Number(id)),
    onSuccess: () => {
      showToast(t('paper.stopSuccess'), 'success')
      queryClient.invalidateQueries({ queryKey: ['paper-deployments'] })
    },
  })

  // ── Orders ─────────────────────────────────────────────
  const { data: paperOrders = [] } = useQuery<PaperOrder[]>({
    queryKey: ['paper-orders'],
    queryFn: () => paperTradingAPI.listPaperOrders().then((r) => {
      const d = r.data
      return Array.isArray(d) ? d : d?.orders ?? d?.data ?? []
    }),
    enabled: activeTab === 'orders',
  })

  const createOrderMutation = useMutation({
    mutationFn: () => paperTradingAPI.createPaperOrder({
      paper_account_id: Number(orderForm.paper_account_id),
      symbol: orderForm.symbol,
      direction: orderForm.direction,
      order_type: orderForm.order_type,
      quantity: Number(orderForm.quantity),
      price: orderForm.price ? Number(orderForm.price) : undefined,
    }),
    onSuccess: () => {
      showToast(t('paper.orderCreated', 'Order submitted'), 'success')
      setOrderModal(false)
      queryClient.invalidateQueries({ queryKey: ['paper-orders'] })
      queryClient.invalidateQueries({ queryKey: ['paper-accounts'] })
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message || t('paper.orderFailed', 'Order failed')
      showToast(msg, 'error')
    },
  })

  const cancelOrderMutation = useMutation({
    mutationFn: (id: string) => paperTradingAPI.cancelPaperOrder(Number(id)),
    onSuccess: () => {
      showToast(t('paper.orderCancelled', 'Order cancelled'), 'success')
      queryClient.invalidateQueries({ queryKey: ['paper-orders'] })
      queryClient.invalidateQueries({ queryKey: ['paper-accounts'] })
    },
  })

  // ── Positions & Performance ────────────────────────────
  const { data: paperPositions = [] } = useQuery<PaperPosition[]>({
    queryKey: ['paper-positions'],
    queryFn: () => paperTradingAPI.getPaperPositions().then((r) => {
      const d = r.data
      return Array.isArray(d) ? d : d?.positions ?? d?.data ?? []
    }),
    enabled: activeTab === 'positions',
  })

  const { data: perfData } = useQuery<{ dates: string[]; nav: number[] }>({
    queryKey: ['paper-performance'],
    queryFn: () => paperTradingAPI.getPaperPerformance().then((r) => {
      const d = r.data
      return { dates: d?.dates ?? [], nav: d?.nav ?? [] }
    }),
    enabled: activeTab === 'performance',
  })

  // ── Signals ────────────────────────────────────────────
  const { data: signals = [] } = useQuery<PaperSignal[]>({
    queryKey: ['paper-signals'],
    queryFn: () => paperTradingAPI.listSignals().then((r) => {
      const d = r.data
      return Array.isArray(d) ? d : d?.signals ?? d?.data ?? []
    }),
    enabled: activeTab === 'signals',
    refetchInterval: 5_000,
  })

  const confirmSignalMutation = useMutation({
    mutationFn: (id: number) => paperTradingAPI.confirmSignal(id),
    onSuccess: () => {
      showToast(t('paper.signalConfirmed', 'Signal confirmed'), 'success')
      queryClient.invalidateQueries({ queryKey: ['paper-signals'] })
      queryClient.invalidateQueries({ queryKey: ['paper-orders'] })
      queryClient.invalidateQueries({ queryKey: ['paper-accounts'] })
    },
    onError: (err: any) => showToast(err?.response?.data?.message || 'Failed', 'error'),
  })

  const rejectSignalMutation = useMutation({
    mutationFn: (id: number) => paperTradingAPI.rejectSignal(id),
    onSuccess: () => {
      showToast(t('paper.signalRejected', 'Signal rejected'), 'success')
      queryClient.invalidateQueries({ queryKey: ['paper-signals'] })
    },
  })

  const perfDates = perfData?.dates ?? []
  const perfNav = perfData?.nav ?? []
  const activeAccounts = accounts.filter((a) => a.status === 'active')

  // ── Column definitions ─────────────────────────────────

  const acctCols: Column<PaperAccount>[] = [
    { key: 'name', label: t('paper.columns.name', 'Name') },
    { key: 'market', label: t('paper.columns.market', 'Market'), render: (a) => <Badge variant="primary">{a.market}</Badge> },
    { key: 'initial_capital', label: t('paper.columns.capital'), render: (a) => fmtMoney(a.initial_capital, a.currency) },
    { key: 'balance', label: t('paper.columns.balance', 'Balance'), render: (a) => fmtMoney(a.balance, a.currency) },
    { key: 'total_equity', label: t('paper.columns.equity', 'Equity'), render: (a) => fmtMoney(a.total_equity, a.currency) },
    { key: 'return_pct', label: t('paper.columns.pnlPct'), render: (a) => <span className={a.return_pct >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-500'}>{a.return_pct >= 0 ? '+' : ''}{a.return_pct.toFixed(2)}%</span> },
    { key: 'status', label: t('paper.columns.status'), render: (a) => <Badge variant={a.status === 'active' ? 'success' : 'muted'}>{a.status}</Badge> },
    { key: 'id', label: t('paper.columns.actions'), render: (a) => a.status === 'active' ? <button onClick={() => closeAccountMutation.mutate(a.id)} className="text-red-500 hover:text-red-700 text-xs">{t('paper.account.close', 'Close')}</button> : null },
  ]

  const depCols: Column<Deployment>[] = [
    { key: 'strategy_name', label: t('paper.columns.strategy') },
    { key: 'status', label: t('paper.columns.status'), render: (d) => <Badge variant={d.status === 'running' ? 'success' : d.status === 'stopped' ? 'muted' : 'warning'}>{d.status}</Badge> },
    { key: 'execution_mode', label: t('paper.columns.mode', 'Mode'), render: (d) => <Badge variant={d.execution_mode === 'auto' ? 'primary' : 'warning'}>{d.execution_mode === 'auto' ? 'Auto' : 'Semi-auto'}</Badge> },
    { key: 'created_at', label: t('paper.columns.createdAt'), render: (d) => new Date(d.created_at).toLocaleDateString() },
    { key: 'id', label: t('paper.columns.actions'), render: (d) => d.status === 'running' ? <button onClick={() => stopMutation.mutate(d.id)} className="text-red-500 hover:text-red-700 text-xs"><Square size={12} className="inline mr-0.5" />{t('paper.deployment.stop')}</button> : null },
  ]

  const orderCols: Column<PaperOrder>[] = [
    { key: 'symbol', label: t('paper.columns.symbol') },
    { key: 'direction', label: t('paper.columns.direction'), render: (o) => <Badge variant={o.direction === 'buy' ? 'success' : 'destructive'}>{o.direction === 'buy' ? t('paper.side.buy') : t('paper.side.sell')}</Badge> },
    { key: 'order_type', label: t('paper.columns.orderType', 'Type'), render: (o) => o.order_type },
    { key: 'quantity', label: t('paper.columns.quantity') },
    { key: 'price', label: t('paper.columns.price'), render: (o) => o.avg_fill_price ? o.avg_fill_price.toFixed(2) : o.price?.toFixed(2) ?? '-' },
    { key: 'fee', label: t('paper.columns.fee', 'Fee'), render: (o) => o.fee?.toFixed(2) ?? '-' },
    { key: 'status', label: t('paper.columns.status'), render: (o) => <Badge variant={o.status === 'filled' ? 'success' : o.status === 'cancelled' ? 'muted' : 'primary'}>{o.status}</Badge> },
    { key: 'created_at', label: t('paper.columns.time'), render: (o) => new Date(o.created_at).toLocaleString() },
    { key: 'id', label: '', render: (o) => (o.status === 'submitted' || o.status === 'created') ? <button onClick={() => cancelOrderMutation.mutate(o.id)} className="text-red-500 text-xs">{t('paper.order.cancel', 'Cancel')}</button> : null },
  ]

  const posCols: Column<PaperPosition>[] = [
    { key: 'symbol', label: t('paper.columns.symbol') },
    { key: 'direction', label: t('paper.columns.direction'), render: (p) => <Badge variant="success">{p.direction}</Badge> },
    { key: 'quantity', label: t('paper.columns.positions') },
    { key: 'avg_cost', label: t('paper.columns.avgCost'), render: (p) => p.avg_cost.toFixed(2) },
    { key: 'current_price', label: t('paper.columns.currentPrice'), render: (p) => p.current_price.toFixed(2) },
    { key: 'pnl', label: t('paper.columns.pnl'), render: (p) => <span className={p.pnl >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-500'}>{p.pnl >= 0 ? '+' : ''}{p.pnl.toLocaleString()}</span> },
    { key: 'pnl_pct', label: t('paper.columns.pnlPct'), render: (p) => <span className={p.pnl_pct >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-500'}>{p.pnl_pct >= 0 ? '+' : ''}{p.pnl_pct.toFixed(2)}%</span> },
  ]

  const signalCols: Column<PaperSignal>[] = [
    { key: 'symbol', label: t('paper.columns.symbol') },
    { key: 'direction', label: t('paper.columns.direction'), render: (s) => <Badge variant={s.direction === 'buy' ? 'success' : 'destructive'}>{s.direction}</Badge> },
    { key: 'quantity', label: t('paper.columns.quantity') },
    { key: 'suggested_price', label: t('paper.columns.price'), render: (s) => s.suggested_price?.toFixed(2) ?? '-' },
    { key: 'reason', label: t('paper.columns.reason', 'Reason'), render: (s) => <span className="text-xs text-muted-foreground truncate max-w-[200px] inline-block">{s.reason || '-'}</span> },
    { key: 'status', label: t('paper.columns.status'), render: (s) => <Badge variant={s.status === 'pending' ? 'warning' : s.status === 'confirmed' ? 'success' : 'muted'}>{s.status}</Badge> },
    { key: 'created_at', label: t('paper.columns.time'), render: (s) => new Date(s.created_at).toLocaleString() },
    { key: 'id', label: '', render: (s) => s.status === 'pending' ? (
      <div className="flex gap-1">
        <button onClick={() => confirmSignalMutation.mutate(s.id)} className="text-green-600 hover:text-green-800 text-xs flex items-center gap-0.5"><CheckCircle2 size={12} />{t('paper.signal.confirm', 'Confirm')}</button>
        <button onClick={() => rejectSignalMutation.mutate(s.id)} className="text-red-500 hover:text-red-700 text-xs flex items-center gap-0.5"><XCircle size={12} />{t('paper.signal.reject', 'Reject')}</button>
      </div>
    ) : null },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t('paper.title')}</h1>
          <p className="text-sm text-muted-foreground">{t('paper.subtitle')}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setNewAccountModal(true)} className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md border border-border hover:bg-muted"><Wallet size={16} />{t('paper.newAccount', 'New Account')}</button>
          <button onClick={() => setOrderModal(true)} className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md border border-border hover:bg-muted"><ShoppingCart size={16} />{t('paper.newOrder', 'New Order')}</button>
          <button onClick={() => setDeployModal(true)} className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md bg-primary text-white hover:opacity-90"><Plus size={16} />{t('paper.newSimulation')}</button>
        </div>
      </div>

      {/* Account summary cards */}
      {activeAccounts.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatCard label={t('paper.stats.accounts', 'Active Accounts')} value={activeAccounts.length} />
          <StatCard label={t('paper.stats.totalEquity', 'Total Equity')} value={fmtMoney(activeAccounts.reduce((s, a) => s + a.total_equity, 0))} />
          <StatCard label={t('paper.stats.totalPnl', 'Total P&L')} value={fmtMoney(activeAccounts.reduce((s, a) => s + a.total_pnl, 0))} changeType={activeAccounts.reduce((s, a) => s + a.total_pnl, 0) >= 0 ? 'positive' : 'negative'} />
          <StatCard label={t('paper.stats.pendingSignals', 'Pending Signals')} value={signals.filter((s) => s.status === 'pending').length} />
        </div>
      )}

      <TabPanel tabs={tabs} activeTab={activeTab} onChange={setActiveTab}>
        {activeTab === 'accounts' && (
          <DataTable columns={acctCols} data={accounts} emptyText={t('paper.empty.accounts', 'No paper accounts. Create one to start.')} />
        )}

        {activeTab === 'deployments' && (
          <DataTable columns={depCols} data={deployments} emptyText={t('paper.empty.deployments')} />
        )}

        {activeTab === 'orders' && (
          <div className="space-y-4">
            <FilterBar searchValue={search} onSearchChange={setSearch} />
            <DataTable columns={orderCols} data={search ? paperOrders.filter((o) => o.symbol.includes(search.toUpperCase())) : paperOrders} emptyText={t('paper.empty.orders')} />
          </div>
        )}

        {activeTab === 'positions' && (
          <DataTable columns={posCols} data={paperPositions} emptyText={t('paper.empty.positions')} />
        )}

        {activeTab === 'signals' && (
          <DataTable columns={signalCols} data={signals} emptyText={t('paper.empty.signals', 'No strategy signals yet.')} />
        )}

        {activeTab === 'performance' && (
          <div className="space-y-4">
            {perfDates.length > 0 ? (
              <div className="rounded-lg border border-border bg-card p-5">
                <h3 className="font-semibold text-card-foreground mb-4">{t('paper.performanceTitle')}</h3>
                <LineChart xData={perfDates} series={[{ name: t('paper.tabs.performance'), data: perfNav }]} height={280} />
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-8">{t('paper.empty.performance')}</p>
            )}
          </div>
        )}
      </TabPanel>

      {/* ── New Account Modal ────────────────────────────── */}
      <Modal open={newAccountModal} onClose={() => setNewAccountModal(false)} title={t('paper.modal.newAccount', 'Create Paper Account')} footer={
        <>
          <button onClick={() => setNewAccountModal(false)} className="px-4 py-2 text-sm rounded-md border border-border hover:bg-muted">{t('paper.modal.cancel')}</button>
          <button onClick={() => createAccountMutation.mutate()} className="px-4 py-2 text-sm rounded-md bg-primary text-white hover:opacity-90">{t('paper.modal.submit')}</button>
        </>
      }>
        <div className="flex flex-col gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">{t('paper.modal.accountName', 'Account Name')}</label>
            <input value={accountForm.name} onChange={(e) => setAccountForm({ ...accountForm, name: e.target.value })} placeholder={t('paper.modal.accountNamePlaceholder', 'e.g. A-share Test')} className="w-full px-3 py-2 text-sm rounded-md border border-border bg-background" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">{t('paper.modal.market', 'Market')}</label>
            <select value={accountForm.market} onChange={(e) => setAccountForm({ ...accountForm, market: e.target.value })} className="w-full px-3 py-2 text-sm rounded-md border border-border bg-background">
              <option value="CN">A股 (CN)</option>
              <option value="HK">港股 (HK)</option>
              <option value="US">美股 (US)</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">{t('paper.modal.capital')}</label>
            <input type="number" value={accountForm.capital} onChange={(e) => setAccountForm({ ...accountForm, capital: e.target.value })} className="w-full px-3 py-2 text-sm rounded-md border border-border bg-background" />
          </div>
        </div>
      </Modal>

      {/* ── New Order Modal ──────────────────────────────── */}
      <Modal open={orderModal} onClose={() => setOrderModal(false)} title={t('paper.modal.newOrder', 'Submit Paper Order')} footer={
        <>
          <button onClick={() => setOrderModal(false)} className="px-4 py-2 text-sm rounded-md border border-border hover:bg-muted">{t('paper.modal.cancel')}</button>
          <button onClick={() => createOrderMutation.mutate()} disabled={!orderForm.paper_account_id || !orderForm.symbol || !orderForm.quantity} className="px-4 py-2 text-sm rounded-md bg-primary text-white hover:opacity-90 disabled:opacity-50">{t('paper.modal.submit')}</button>
        </>
      }>
        <div className="flex flex-col gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">{t('paper.modal.account', 'Paper Account')}</label>
            <select value={orderForm.paper_account_id} onChange={(e) => setOrderForm({ ...orderForm, paper_account_id: e.target.value })} className="w-full px-3 py-2 text-sm rounded-md border border-border bg-background">
              <option value="">{t('paper.modal.selectAccount', 'Select account...')}</option>
              {activeAccounts.map((a) => <option key={a.id} value={a.id}>{a.name} ({a.market} - {fmtMoney(a.balance, a.currency)})</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">{t('paper.columns.symbol')}</label>
            <input value={orderForm.symbol} onChange={(e) => setOrderForm({ ...orderForm, symbol: e.target.value.toUpperCase() })} placeholder="600519" className="w-full px-3 py-2 text-sm rounded-md border border-border bg-background" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">{t('paper.columns.direction')}</label>
              <select value={orderForm.direction} onChange={(e) => setOrderForm({ ...orderForm, direction: e.target.value })} className="w-full px-3 py-2 text-sm rounded-md border border-border bg-background">
                <option value="buy">{t('paper.side.buy')}</option>
                <option value="sell">{t('paper.side.sell')}</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">{t('paper.columns.orderType', 'Order Type')}</label>
              <select value={orderForm.order_type} onChange={(e) => setOrderForm({ ...orderForm, order_type: e.target.value })} className="w-full px-3 py-2 text-sm rounded-md border border-border bg-background">
                <option value="market">Market</option>
                <option value="limit">Limit</option>
                <option value="stop">Stop</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">{t('paper.columns.quantity')}</label>
              <input type="number" value={orderForm.quantity} onChange={(e) => setOrderForm({ ...orderForm, quantity: e.target.value })} className="w-full px-3 py-2 text-sm rounded-md border border-border bg-background" />
            </div>
            {orderForm.order_type !== 'market' && (
              <div>
                <label className="block text-sm font-medium mb-1">{t('paper.columns.price')}</label>
                <input type="number" step="0.01" value={orderForm.price} onChange={(e) => setOrderForm({ ...orderForm, price: e.target.value })} placeholder={t('paper.modal.pricePlaceholder', 'Limit price')} className="w-full px-3 py-2 text-sm rounded-md border border-border bg-background" />
              </div>
            )}
          </div>
        </div>
      </Modal>

      {/* ── Deploy Strategy Modal ────────────────────────── */}
      <Modal open={deployModal} onClose={() => setDeployModal(false)} title={t('paper.modal.title')} footer={
        <>
          <button onClick={() => setDeployModal(false)} className="px-4 py-2 text-sm rounded-md border border-border hover:bg-muted">{t('paper.modal.cancel')}</button>
          <button onClick={() => deployMutation.mutate()} disabled={!deployForm.strategy} className="px-4 py-2 text-sm rounded-md bg-primary text-white hover:opacity-90 disabled:opacity-50">{t('paper.modal.submit')}</button>
        </>
      }>
        <div className="flex flex-col gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">{t('paper.modal.strategy')}</label>
            <select value={deployForm.strategy} onChange={(e) => setDeployForm({ ...deployForm, strategy: e.target.value })} className="w-full px-3 py-2 text-sm rounded-md border border-border bg-background">
              <option value="">{t('paper.modal.strategyPlaceholder')}</option>
              {strategies.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">{t('paper.modal.account', 'Paper Account')}</label>
            <select value={deployForm.paper_account_id} onChange={(e) => setDeployForm({ ...deployForm, paper_account_id: e.target.value })} className="w-full px-3 py-2 text-sm rounded-md border border-border bg-background">
              <option value="">{t('paper.modal.selectAccount', 'Select account...')}</option>
              {activeAccounts.map((a) => <option key={a.id} value={a.id}>{a.name} ({a.market})</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">{t('paper.modal.vtSymbol', 'VT Symbol')}</label>
            <input value={deployForm.vt_symbol} onChange={(e) => setDeployForm({ ...deployForm, vt_symbol: e.target.value })} placeholder="600519.SSE" className="w-full px-3 py-2 text-sm rounded-md border border-border bg-background" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">{t('paper.modal.executionMode', 'Execution Mode')}</label>
            <select value={deployForm.execution_mode} onChange={(e) => setDeployForm({ ...deployForm, execution_mode: e.target.value })} className="w-full px-3 py-2 text-sm rounded-md border border-border bg-background">
              <option value="auto">{t('paper.mode.auto', 'Auto (signal → order)')}</option>
              <option value="semi_auto">{t('paper.mode.semiAuto', 'Semi-auto (confirm signals)')}</option>
            </select>
          </div>
        </div>
      </Modal>
    </div>
  )
}
