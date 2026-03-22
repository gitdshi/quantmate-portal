import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  ArrowDownUp,
  Clock,
  History,
  ListOrdered,
  Plus,
  Settings,
  X,
} from 'lucide-react'
import { useState } from 'react'

import Badge from '../components/ui/Badge'
import DataTable, { type Column } from '../components/ui/DataTable'
import FilterBar from '../components/ui/FilterBar'
import Modal from '../components/ui/Modal'
import StatCard from '../components/ui/StatCard'
import TabPanel from '../components/ui/TabPanel'
import { showToast } from '../components/ui/Toast'
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

const TABS = [
  { key: 'pending', label: '当日委托', icon: <ListOrdered size={16} /> },
  { key: 'filled', label: '成交明细', icon: <ArrowDownUp size={16} /> },
  { key: 'history', label: '历史委托', icon: <History size={16} /> },
  { key: 'algo', label: '算法交易', icon: <Settings size={16} /> },
]

const STATUS_MAP: Record<string, { label: string; variant: 'success' | 'warning' | 'danger' | 'primary' | 'muted' }> = {
  filled: { label: '已成交', variant: 'success' },
  partial: { label: '部分成交', variant: 'warning' },
  pending: { label: '待成交', variant: 'primary' },
  cancelled: { label: '已撤单', variant: 'muted' },
  rejected: { label: '已拒绝', variant: 'danger' },
}

export default function Trading() {
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState('pending')
  const [orderModal, setOrderModal] = useState(false)
  const [search, setSearch] = useState('')

  // ── Form state ──
  const [form, setForm] = useState({
    symbol: '',
    direction: 'buy',
    order_type: 'limit',
    price: '',
    quantity: '',
    strategy: '',
  })

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
      showToast('撤单成功', 'success')
      queryClient.invalidateQueries({ queryKey: ['orders'] })
    },
    onError: () => showToast('撤单失败', 'error'),
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
      showToast('委托已提交', 'success')
      setOrderModal(false)
      setForm({ symbol: '', direction: 'buy', order_type: 'limit', price: '', quantity: '', strategy: '' })
      queryClient.invalidateQueries({ queryKey: ['orders'] })
    },
    onError: () => showToast('委托提交失败', 'error'),
  })

  const filtered = orders.filter(
    (o) => !search || o.symbol?.toLowerCase().includes(search.toLowerCase()),
  )

  const todayStats = {
    total: orders.length,
    filled: orders.filter((o) => o.status === 'filled').length,
    pending: orders.filter((o) => o.status === 'pending' || o.status === 'partial').length,
    cancelled: orders.filter((o) => o.status === 'cancelled').length,
  }

  const pendingCols: Column<Order>[] = [
    { key: 'symbol', label: '代码' },
    { key: 'direction', label: '方向', render: (o) => <Badge variant={o.direction === 'buy' ? 'success' : 'danger'}>{o.direction === 'buy' ? '买入' : '卖出'}</Badge> },
    { key: 'order_type', label: '类型' },
    { key: 'price', label: '委托价', render: (o) => `¥${o.price.toFixed(2)}` },
    { key: 'quantity', label: '委托量' },
    { key: 'filled_qty', label: '已成交', render: (o) => o.filled_qty ?? 0 },
    { key: 'status', label: '状态', render: (o) => { const s = STATUS_MAP[o.status]; return s ? <Badge variant={s.variant}>{s.label}</Badge> : o.status } },
    { key: 'strategy', label: '策略', render: (o) => o.strategy || '-' },
    { key: 'created_at', label: '时间', render: (o) => new Date(o.created_at).toLocaleTimeString() },
    {
      key: 'id',
      label: '操作',
      render: (o) =>
        o.status === 'pending' || o.status === 'partial' ? (
          <button onClick={() => cancelMutation.mutate(o.id)} className="text-red-500 hover:text-red-700 text-xs"><X size={14} className="inline mr-0.5" />撤单</button>
        ) : null,
    },
  ]

  const filledCols: Column<Order>[] = [
    { key: 'symbol', label: '代码' },
    { key: 'direction', label: '方向', render: (o) => <Badge variant={o.direction === 'buy' ? 'success' : 'danger'}>{o.direction === 'buy' ? '买入' : '卖出'}</Badge> },
    { key: 'price', label: '成交价', render: (o) => `¥${o.price.toFixed(2)}` },
    { key: 'quantity', label: '成交量' },
    { key: 'strategy', label: '策略', render: (o) => o.strategy || '-' },
    { key: 'created_at', label: '成交时间', render: (o) => new Date(o.created_at).toLocaleTimeString() },
  ]



  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">交易管理</h1>
          <p className="text-sm text-muted-foreground">委托下单 · 成交明细 · 算法交易</p>
        </div>
        <button onClick={() => setOrderModal(true)} className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md bg-primary text-white hover:opacity-90"><Plus size={16} />新委托</button>
      </div>

      <TabPanel tabs={TABS} activeTab={activeTab} onChange={setActiveTab}>
        {/* ── Pending ──────────────────────────────────── */}
        {activeTab === 'pending' && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <StatCard label="今日委托" value={todayStats.total} />
              <StatCard label="已成交" value={todayStats.filled} changeType="positive" />
              <StatCard label="待成交" value={todayStats.pending} changeType="neutral" />
              <StatCard label="已撤单" value={todayStats.cancelled} />
            </div>
            <FilterBar
              filters={[{ key: 'search', label: '搜索代码', type: 'search' as const }]}
              values={{ search }}
              onChange={(v) => setSearch((v.search as string) || '')}
            />
            <DataTable columns={pendingCols} data={filtered} emptyText="暂无委托" />
          </div>
        )}

        {/* ── Filled ──────────────────────────────────── */}
        {activeTab === 'filled' && (
          <div className="space-y-4">
            <FilterBar
              filters={[{ key: 'search', label: '搜索代码', type: 'search' as const }]}
              values={{ search }}
              onChange={(v) => setSearch((v.search as string) || '')}
            />
            <DataTable columns={filledCols} data={filtered.filter((o) => o.status === 'filled')} emptyText="暂无成交" />
          </div>
        )}

        {/* ── History ─────────────────────────────────── */}
        {activeTab === 'history' && (
          <div className="space-y-4">
            <FilterBar
              filters={[
                { key: 'search', label: '搜索代码', type: 'search' as const },
                { key: 'status', label: '状态', type: 'select' as const, options: [{ label: '全部', value: '' }, { label: '已成交', value: 'filled' }, { label: '已撤单', value: 'cancelled' }] },
              ]}
              values={{ search }}
              onChange={(v) => setSearch((v.search as string) || '')}
            />
            <DataTable columns={pendingCols} data={filtered} emptyText="暂无历史委托" />
          </div>
        )}

        {/* ── Algo Trading ────────────────────────────── */}
        {activeTab === 'algo' && (
          <div className="space-y-4">
            <div className="rounded-lg border border-border bg-card p-5">
              <h3 className="font-semibold text-card-foreground mb-4">算法订单</h3>
              <p className="text-center text-muted-foreground py-8">暂无算法委托</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="rounded-lg border border-border bg-card p-5">
                <h3 className="font-semibold text-card-foreground mb-3">TWAP 配置</h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div><label className="block text-muted-foreground mb-1">拆单间隔 (秒)</label><input type="number" defaultValue={30} className="w-full px-3 py-1.5 rounded-md border border-border bg-background" /></div>
                  <div><label className="block text-muted-foreground mb-1">子单比例 (%)</label><input type="number" defaultValue={5} className="w-full px-3 py-1.5 rounded-md border border-border bg-background" /></div>
                </div>
              </div>
              <div className="rounded-lg border border-border bg-card p-5">
                <h3 className="font-semibold text-card-foreground mb-3">VWAP 配置</h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div><label className="block text-muted-foreground mb-1">参与率上限 (%)</label><input type="number" defaultValue={20} className="w-full px-3 py-1.5 rounded-md border border-border bg-background" /></div>
                  <div><label className="block text-muted-foreground mb-1">最大偏离 (bp)</label><input type="number" defaultValue={5} className="w-full px-3 py-1.5 rounded-md border border-border bg-background" /></div>
                </div>
              </div>
            </div>
          </div>
        )}
      </TabPanel>

      {/* Order Modal */}
      <Modal open={orderModal} onClose={() => setOrderModal(false)} title="新委托" footer={
        <>
          <button onClick={() => setOrderModal(false)} className="px-4 py-2 text-sm rounded-md border border-border hover:bg-muted">取消</button>
          <button onClick={() => submitMutation.mutate()} disabled={!form.symbol || !form.quantity} className="px-4 py-2 text-sm rounded-md bg-primary text-white hover:opacity-90 disabled:opacity-50">提交委托</button>
        </>
      }>
        <div className="flex flex-col gap-4">
          <div><label className="block text-sm font-medium mb-1">证券代码</label><input value={form.symbol} onChange={(e) => setForm({ ...form, symbol: e.target.value })} className="w-full px-3 py-2 text-sm rounded-md border border-border bg-background" placeholder="例如: 600519.SH" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-sm font-medium mb-1">方向</label>
              <select value={form.direction} onChange={(e) => setForm({ ...form, direction: e.target.value })} className="w-full px-3 py-2 text-sm rounded-md border border-border bg-background">
                <option value="buy">买入</option><option value="sell">卖出</option>
              </select></div>
            <div><label className="block text-sm font-medium mb-1">类型</label>
              <select value={form.order_type} onChange={(e) => setForm({ ...form, order_type: e.target.value })} className="w-full px-3 py-2 text-sm rounded-md border border-border bg-background">
                <option value="limit">限价</option><option value="market">市价</option>
              </select></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-sm font-medium mb-1">委托价</label><input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} className="w-full px-3 py-2 text-sm rounded-md border border-border bg-background" /></div>
            <div><label className="block text-sm font-medium mb-1">数量</label><input type="number" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} className="w-full px-3 py-2 text-sm rounded-md border border-border bg-background" /></div>
          </div>
          <div><label className="block text-sm font-medium mb-1">策略 (可选)</label><input value={form.strategy} onChange={(e) => setForm({ ...form, strategy: e.target.value })} className="w-full px-3 py-2 text-sm rounded-md border border-border bg-background" placeholder="关联策略名称" /></div>
        </div>
      </Modal>
    </div>
  )
}
