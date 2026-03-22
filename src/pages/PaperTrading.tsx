import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  BarChart3,
  ListOrdered,
  Play,
  Plus,
  ShoppingCart,
  Square,
  TrendingUp,
} from 'lucide-react'
import { useState } from 'react'

import LineChart from '../components/charts/LineChart'
import Badge from '../components/ui/Badge'
import DataTable, { type Column } from '../components/ui/DataTable'
import FilterBar from '../components/ui/FilterBar'
import Modal from '../components/ui/Modal'
import StatCard from '../components/ui/StatCard'
import TabPanel from '../components/ui/TabPanel'
import { showToast } from '../components/ui/Toast'
import { paperTradingAPI, strategiesAPI } from '../lib/api'

interface Deployment {
  id: string
  strategy_name: string
  status: string
  capital: number
  pnl: number
  pnl_pct: number
  positions: number
  created_at: string
}

interface PaperOrder {
  id: string
  symbol: string
  direction: string
  price: number
  quantity: number
  status: string
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

const TABS = [
  { key: 'deployments', label: '模拟部署', icon: <Play size={16} /> },
  { key: 'orders', label: '模拟委托', icon: <ShoppingCart size={16} /> },
  { key: 'positions', label: '模拟持仓', icon: <ListOrdered size={16} /> },
  { key: 'performance', label: '绩效概览', icon: <TrendingUp size={16} /> },
]

export default function PaperTrading() {
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState('deployments')
  const [newModal, setNewModal] = useState(false)
  const [search, setSearch] = useState('')
  const [form, setForm] = useState({ strategy: '', capital: '1000000' })

  const { data: deployments = [] } = useQuery<Deployment[]>({
    queryKey: ['paper-deployments'],
    queryFn: () => paperTradingAPI.listDeployments().then((r) => {
      const d = r.data
      return Array.isArray(d) ? d : d?.data ?? []
    }),
    refetchInterval: 10_000,
  })

  const { data: strategies = [] } = useQuery<{ id: string; name: string }[]>({
    queryKey: ['strategies-list-paper'],
    queryFn: () => strategiesAPI.list().then((r) => {
      const d = r.data
      return Array.isArray(d) ? d : d?.data ?? []
    }),
    enabled: newModal,
  })

  const createMutation = useMutation({
    mutationFn: () => paperTradingAPI.deployStrategy({ strategy_id: Number(form.strategy), vt_symbol: '', parameters: {} }),
    onSuccess: () => {
      showToast('模拟部署已创建', 'success')
      setNewModal(false)
      queryClient.invalidateQueries({ queryKey: ['paper-deployments'] })
    },
    onError: () => showToast('创建失败', 'error'),
  })

  const stopMutation = useMutation({
    mutationFn: (id: string) => paperTradingAPI.stopDeployment(Number(id)),
    onSuccess: () => {
      showToast('已停止', 'success')
      queryClient.invalidateQueries({ queryKey: ['paper-deployments'] })
    },
  })

  // ── Real data queries for orders/positions/performance ──
  const { data: paperOrders = [] } = useQuery<PaperOrder[]>({
    queryKey: ['paper-orders'],
    queryFn: () => paperTradingAPI.listPaperOrders().then((r) => {
      const d = r.data
      return Array.isArray(d) ? d : d?.data ?? []
    }),
    enabled: activeTab === 'orders',
  })

  const { data: paperPositions = [] } = useQuery<PaperPosition[]>({
    queryKey: ['paper-positions'],
    queryFn: () => paperTradingAPI.getPaperPositions().then((r) => {
      const d = r.data
      return Array.isArray(d) ? d : d?.data ?? []
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

  const perfDates = perfData?.dates ?? []
  const perfNav = perfData?.nav ?? []

  const depCols: Column<Deployment>[] = [
    { key: 'strategy_name', label: '策略' },
    { key: 'status', label: '状态', render: (d) => <Badge variant={d.status === 'running' ? 'success' : d.status === 'stopped' ? 'muted' : 'warning'}>{d.status === 'running' ? '运行中' : d.status === 'stopped' ? '已停止' : d.status}</Badge> },
    { key: 'capital', label: '初始资金', render: (d) => `¥${d.capital.toLocaleString()}` },
    { key: 'pnl', label: '盈亏', render: (d) => <span className={d.pnl >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-500'}>{d.pnl >= 0 ? '+' : ''}¥{d.pnl.toLocaleString()}</span> },
    { key: 'pnl_pct', label: '收益率', render: (d) => <span className={d.pnl_pct >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-500'}>{d.pnl_pct >= 0 ? '+' : ''}{d.pnl_pct.toFixed(2)}%</span> },
    { key: 'positions', label: '持仓数' },
    { key: 'created_at', label: '创建时间', render: (d) => new Date(d.created_at).toLocaleDateString() },
    { key: 'id', label: '操作', render: (d) => d.status === 'running' ? <button onClick={() => stopMutation.mutate(d.id)} className="text-red-500 hover:text-red-700 text-xs"><Square size={12} className="inline mr-0.5" />停止</button> : null },
  ]

  const orderCols: Column<PaperOrder>[] = [
    { key: 'symbol', label: '代码' },
    { key: 'direction', label: '方向', render: (o) => <Badge variant={o.direction === 'buy' ? 'success' : 'danger'}>{o.direction === 'buy' ? '买入' : '卖出'}</Badge> },
    { key: 'price', label: '价格', render: (o) => `¥${o.price.toFixed(2)}` },
    { key: 'quantity', label: '数量' },
    { key: 'status', label: '状态', render: (o) => <Badge variant={o.status === 'filled' ? 'success' : 'primary'}>{o.status === 'filled' ? '已成交' : '待成交'}</Badge> },
    { key: 'created_at', label: '时间', render: (o) => new Date(o.created_at).toLocaleTimeString() },
  ]

  const posCols: Column<PaperPosition>[] = [
    { key: 'symbol', label: '代码' },
    { key: 'direction', label: '方向', render: (p) => <Badge variant="success">{p.direction === 'long' ? '多' : '空'}</Badge> },
    { key: 'quantity', label: '持仓量' },
    { key: 'avg_cost', label: '成本价', render: (p) => `¥${p.avg_cost.toFixed(2)}` },
    { key: 'current_price', label: '现价', render: (p) => `¥${p.current_price.toFixed(2)}` },
    { key: 'pnl', label: '浮动盈亏', render: (p) => <span className={p.pnl >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-500'}>{p.pnl >= 0 ? '+' : ''}¥{p.pnl.toLocaleString()}</span> },
    { key: 'pnl_pct', label: '收益率', render: (p) => <span className={p.pnl_pct >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-500'}>{p.pnl_pct >= 0 ? '+' : ''}{p.pnl_pct.toFixed(2)}%</span> },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">模拟交易</h1>
          <p className="text-sm text-muted-foreground">策略模拟部署 · 虚拟资金 · 实时行情驱动</p>
        </div>
        <button onClick={() => setNewModal(true)} className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md bg-primary text-white hover:opacity-90"><Plus size={16} />新建模拟</button>
      </div>

      <TabPanel tabs={TABS} activeTab={activeTab} onChange={setActiveTab}>
        {activeTab === 'deployments' && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <StatCard label="模拟部署" value={deployments.length} />
              <StatCard label="运行中" value={deployments.filter((d) => d.status === 'running').length} changeType="positive" />
              <StatCard label="总盈亏" value={deployments.length > 0 ? `${deployments.reduce((s, d) => s + d.pnl, 0) >= 0 ? '+' : ''}¥${deployments.reduce((s, d) => s + d.pnl, 0).toLocaleString()}` : '-'} changeType="positive" />
              <StatCard label="平均收益率" value={deployments.length > 0 ? `${(deployments.reduce((s, d) => s + d.pnl_pct, 0) / deployments.length).toFixed(2)}%` : '-'} />
            </div>
            <DataTable columns={depCols} data={deployments} emptyText="暂无模拟部署" />
          </div>
        )}

        {activeTab === 'orders' && (
          <div className="space-y-4">
            <FilterBar
              filters={[{ key: 'search', label: '搜索代码', type: 'search' as const }]}
              values={{ search }}
              onChange={(v) => setSearch((v.search as string) || '')}
            />
            <DataTable columns={orderCols} data={search ? paperOrders.filter((o) => o.symbol.includes(search)) : paperOrders} emptyText="暂无模拟委托" />
          </div>
        )}

        {activeTab === 'positions' && (
          <DataTable columns={posCols} data={paperPositions} emptyText="暂无模拟持仓" />
        )}

        {activeTab === 'performance' && (
          <div className="space-y-4">
            {perfDates.length > 0 ? (
              <>
                <div className="rounded-lg border border-border bg-card p-5">
                  <h3 className="font-semibold text-card-foreground mb-4">模拟净值曲线</h3>
                  <LineChart xData={perfDates} series={[{ name: '净值', data: perfNav }]} height={280} />
                </div>
              </>
            ) : (
              <p className="text-center text-muted-foreground py-8">暂无绩效数据</p>
            )}
          </div>
        )}
      </TabPanel>

      <Modal open={newModal} onClose={() => setNewModal(false)} title="新建模拟部署" footer={
        <>
          <button onClick={() => setNewModal(false)} className="px-4 py-2 text-sm rounded-md border border-border hover:bg-muted">取消</button>
          <button onClick={() => createMutation.mutate()} disabled={!form.strategy} className="px-4 py-2 text-sm rounded-md bg-primary text-white hover:opacity-90 disabled:opacity-50">创建部署</button>
        </>
      }>
        <div className="flex flex-col gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">选择策略</label>
            <select value={form.strategy} onChange={(e) => setForm({ ...form, strategy: e.target.value })} className="w-full px-3 py-2 text-sm rounded-md border border-border bg-background">
              <option value="">请选择策略...</option>
              {strategies.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">初始资金</label>
            <input type="number" value={form.capital} onChange={(e) => setForm({ ...form, capital: e.target.value })} className="w-full px-3 py-2 text-sm rounded-md border border-border bg-background" />
          </div>
        </div>
      </Modal>
    </div>
  )
}
