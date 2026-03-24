import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowDownUp, History, ListOrdered, Plus, Settings, X } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import Badge from '../components/ui/Badge'
import DataTable, { type Column } from '../components/ui/DataTable'
import FilterBar from '../components/ui/FilterBar'
import Modal from '../components/ui/Modal'
import StatCard from '../components/ui/StatCard'
import TabPanel from '../components/ui/TabPanel'
import { showToast } from '../components/ui/toast-service'
import { tradingAPI } from '../lib/api'

interface Order {
  id: string
  symbol: string
  direction: string
  order_type: string
  price: number
  quantity: number
  filled_qty?: number
  status: string
  strategy?: string
  created_at: string
  updated_at?: string
}

export default function Trading() {
  const { t } = useTranslation('trading')
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState('pending')
  const [orderModal, setOrderModal] = useState(false)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [form, setForm] = useState({
    symbol: '',
    direction: 'buy',
    order_type: 'limit',
    price: '',
    quantity: '',
    strategy: '',
  })

  const tabs = [
    { key: 'pending', label: t('management.tabs.pending'), icon: <ListOrdered size={16} /> },
    { key: 'filled', label: t('management.tabs.filled'), icon: <ArrowDownUp size={16} /> },
    { key: 'history', label: t('management.tabs.history'), icon: <History size={16} /> },
    { key: 'algo', label: t('management.tabs.algo'), icon: <Settings size={16} /> },
  ]

  const statusMap: Record<
    string,
    { label: string; variant: 'success' | 'warning' | 'destructive' | 'primary' | 'muted' }
  > = {
    filled: { label: t('management.status.filled'), variant: 'success' },
    partial: { label: t('management.status.partial'), variant: 'warning' },
    pending: { label: t('management.status.pending'), variant: 'primary' },
    cancelled: { label: t('management.status.cancelled'), variant: 'muted' },
    rejected: { label: t('management.status.rejected'), variant: 'destructive' },
  }

  const { data: orders = [] } = useQuery<Order[]>({
    queryKey: ['orders', activeTab],
    queryFn: () =>
      tradingAPI.listOrders({ status: activeTab === 'history' ? undefined : activeTab }).then((r) => {
        const d = r.data
        return Array.isArray(d) ? d : d?.data ?? []
      }),
    refetchInterval: 10_000,
  })

  const cancelMutation = useMutation({
    mutationFn: (id: string) => tradingAPI.cancelOrder(Number(id)),
    onSuccess: () => {
      showToast(t('management.cancelSuccess'), 'success')
      queryClient.invalidateQueries({ queryKey: ['orders'] })
    },
    onError: () => showToast(t('management.cancelFailed'), 'error'),
  })

  const submitMutation = useMutation({
    mutationFn: () =>
      tradingAPI.createOrder({
        symbol: form.symbol,
        direction: form.direction,
        order_type: form.order_type,
        price: Number(form.price),
        quantity: Number(form.quantity),
      }),
    onSuccess: () => {
      showToast(t('management.submitSuccess'), 'success')
      setOrderModal(false)
      setForm({ symbol: '', direction: 'buy', order_type: 'limit', price: '', quantity: '', strategy: '' })
      queryClient.invalidateQueries({ queryKey: ['orders'] })
    },
    onError: () => showToast(t('management.submitFailed'), 'error'),
  })

  const filtered = orders.filter((order) => (!search || order.symbol?.toLowerCase().includes(search.toLowerCase())) && (!statusFilter || order.status === statusFilter))

  const todayStats = {
    total: orders.length,
    filled: orders.filter((order) => order.status === 'filled').length,
    pending: orders.filter((order) => order.status === 'pending' || order.status === 'partial').length,
    cancelled: orders.filter((order) => order.status === 'cancelled').length,
  }

  const pendingCols: Column<Order>[] = [
    { key: 'symbol', label: t('management.columns.symbol') },
    {
      key: 'direction',
      label: t('management.columns.direction'),
      render: (order) => <Badge variant={order.direction === 'buy' ? 'success' : 'destructive'}>{order.direction === 'buy' ? t('management.buy') : t('management.sell')}</Badge>,
    },
    { key: 'order_type', label: t('management.columns.type') },
    { key: 'price', label: t('management.columns.orderPrice'), render: (order) => `?${order.price.toFixed(2)}` },
    { key: 'quantity', label: t('management.columns.quantity') },
    { key: 'filled_qty', label: t('management.columns.filledQty'), render: (order) => order.filled_qty ?? 0 },
    {
      key: 'status',
      label: t('management.columns.status'),
      render: (order) => {
        const mapped = statusMap[order.status]
        return mapped ? <Badge variant={mapped.variant}>{mapped.label}</Badge> : order.status
      },
    },
    { key: 'strategy', label: t('management.columns.strategy'), render: (order) => order.strategy || '-' },
    { key: 'created_at', label: t('management.columns.time'), render: (order) => new Date(order.created_at).toLocaleTimeString() },
    {
      key: 'id',
      label: t('management.columns.actions'),
      render: (order) =>
        order.status === 'pending' || order.status === 'partial' ? (
          <button onClick={() => cancelMutation.mutate(order.id)} className="text-red-500 hover:text-red-700 text-xs">
            <X size={14} className="inline mr-0.5" />
            {t('management.cancel')}
          </button>
        ) : null,
    },
  ]

  const filledCols: Column<Order>[] = [
    { key: 'symbol', label: t('management.columns.symbol') },
    {
      key: 'direction',
      label: t('management.columns.direction'),
      render: (order) => <Badge variant={order.direction === 'buy' ? 'success' : 'destructive'}>{order.direction === 'buy' ? t('management.buy') : t('management.sell')}</Badge>,
    },
    { key: 'price', label: t('management.columns.tradePrice'), render: (order) => `?${order.price.toFixed(2)}` },
    { key: 'quantity', label: t('management.columns.tradeQty') },
    { key: 'strategy', label: t('management.columns.strategy'), render: (order) => order.strategy || '-' },
    { key: 'created_at', label: t('management.columns.tradeTime'), render: (order) => new Date(order.created_at).toLocaleTimeString() },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t('management.title')}</h1>
          <p className="text-sm text-muted-foreground">{t('management.subtitle')}</p>
        </div>
        <button onClick={() => setOrderModal(true)} className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md bg-primary text-white hover:opacity-90">
          <Plus size={16} />
          {t('management.newOrder')}
        </button>
      </div>

      <TabPanel tabs={tabs} activeTab={activeTab} onChange={setActiveTab}>
        {activeTab === 'pending' && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <StatCard label={t('management.stats.total')} value={todayStats.total} />
              <StatCard label={t('management.stats.filled')} value={todayStats.filled} changeType="positive" />
              <StatCard label={t('management.stats.pending')} value={todayStats.pending} changeType="neutral" />
              <StatCard label={t('management.stats.cancelled')} value={todayStats.cancelled} />
            </div>
            <FilterBar
              searchValue={search}
              onSearchChange={setSearch}
            />
            <DataTable columns={pendingCols} data={filtered} emptyText={t('management.empty.pending')} />
          </div>
        )}

        {activeTab === 'filled' && (
          <div className="space-y-4">
            <FilterBar
              searchValue={search}
              onSearchChange={setSearch}
            />
            <DataTable columns={filledCols} data={filtered.filter((order) => order.status === 'filled')} emptyText={t('management.empty.filled')} />
          </div>
        )}

        {activeTab === 'history' && (
          <div className="space-y-4">
            <FilterBar
              searchValue={search}
              onSearchChange={setSearch}
              filters={[
                {
                  key: 'status',
                  value: statusFilter,
                  options: [
                    { label: t('management.all'), value: '' },
                    { label: t('management.status.filled'), value: 'filled' },
                    { label: t('management.status.cancelled'), value: 'cancelled' },
                  ],
                  onChange: setStatusFilter,
                  placeholder: t('management.columns.status'),
                },
              ]}
            />
            <DataTable columns={pendingCols} data={filtered} emptyText={t('management.empty.history')} />
          </div>
        )}

        {activeTab === 'algo' && (
          <div className="space-y-4">
            <div className="rounded-lg border border-border bg-card p-5">
              <h3 className="font-semibold text-card-foreground mb-4">{t('management.algo.title')}</h3>
              <p className="text-center text-muted-foreground py-8">{t('management.empty.algo')}</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="rounded-lg border border-border bg-card p-5">
                <h3 className="font-semibold text-card-foreground mb-3">{t('management.algo.twap')}</h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div><label className="block text-muted-foreground mb-1">{t('management.algo.interval')}</label><input type="number" defaultValue={30} className="w-full px-3 py-1.5 rounded-md border border-border bg-background" /></div>
                  <div><label className="block text-muted-foreground mb-1">{t('management.algo.ratio')}</label><input type="number" defaultValue={5} className="w-full px-3 py-1.5 rounded-md border border-border bg-background" /></div>
                </div>
              </div>
              <div className="rounded-lg border border-border bg-card p-5">
                <h3 className="font-semibold text-card-foreground mb-3">{t('management.algo.vwap')}</h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div><label className="block text-muted-foreground mb-1">{t('management.algo.participation')}</label><input type="number" defaultValue={20} className="w-full px-3 py-1.5 rounded-md border border-border bg-background" /></div>
                  <div><label className="block text-muted-foreground mb-1">{t('management.algo.deviation')}</label><input type="number" defaultValue={5} className="w-full px-3 py-1.5 rounded-md border border-border bg-background" /></div>
                </div>
              </div>
            </div>
          </div>
        )}
      </TabPanel>

      <Modal
        open={orderModal}
        onClose={() => setOrderModal(false)}
        title={t('management.modal.title')}
        footer={
          <>
            <button onClick={() => setOrderModal(false)} className="px-4 py-2 text-sm rounded-md border border-border hover:bg-muted">
              {t('management.modal.cancel')}
            </button>
            <button onClick={() => submitMutation.mutate()} disabled={!form.symbol || !form.quantity} className="px-4 py-2 text-sm rounded-md bg-primary text-white hover:opacity-90 disabled:opacity-50">
              {t('management.modal.submit')}
            </button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <div><label className="block text-sm font-medium mb-1">{t('management.modal.symbol')}</label><input value={form.symbol} onChange={(event) => setForm({ ...form, symbol: event.target.value })} className="w-full px-3 py-2 text-sm rounded-md border border-border bg-background" placeholder={t('management.modal.symbolPlaceholder')} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-sm font-medium mb-1">{t('management.modal.direction')}</label>
              <select value={form.direction} onChange={(event) => setForm({ ...form, direction: event.target.value })} className="w-full px-3 py-2 text-sm rounded-md border border-border bg-background">
                <option value="buy">{t('management.buy')}</option><option value="sell">{t('management.sell')}</option>
              </select></div>
            <div><label className="block text-sm font-medium mb-1">{t('management.modal.type')}</label>
              <select value={form.order_type} onChange={(event) => setForm({ ...form, order_type: event.target.value })} className="w-full px-3 py-2 text-sm rounded-md border border-border bg-background">
                <option value="limit">{t('management.modal.limit')}</option><option value="market">{t('management.modal.market')}</option>
              </select></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-sm font-medium mb-1">{t('management.modal.price')}</label><input type="number" value={form.price} onChange={(event) => setForm({ ...form, price: event.target.value })} className="w-full px-3 py-2 text-sm rounded-md border border-border bg-background" /></div>
            <div><label className="block text-sm font-medium mb-1">{t('management.modal.quantity')}</label><input type="number" value={form.quantity} onChange={(event) => setForm({ ...form, quantity: event.target.value })} className="w-full px-3 py-2 text-sm rounded-md border border-border bg-background" /></div>
          </div>
          <div><label className="block text-sm font-medium mb-1">{t('management.modal.strategy')}</label><input value={form.strategy} onChange={(event) => setForm({ ...form, strategy: event.target.value })} className="w-full px-3 py-2 text-sm rounded-md border border-border bg-background" placeholder={t('management.modal.strategyPlaceholder')} /></div>
        </div>
      </Modal>
    </div>
  )
}
