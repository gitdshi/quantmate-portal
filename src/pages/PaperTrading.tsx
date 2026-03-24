import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
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
import { useTranslation } from 'react-i18next'

import LineChart from '../components/charts/LineChart'
import Badge from '../components/ui/Badge'
import DataTable, { type Column } from '../components/ui/DataTable'
import FilterBar from '../components/ui/FilterBar'
import Modal from '../components/ui/Modal'
import StatCard from '../components/ui/StatCard'
import TabPanel from '../components/ui/TabPanel'
import { showToast } from '../components/ui/toast-service'
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

export default function PaperTrading() {
  const { t } = useTranslation('trading')
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState('deployments')
  const [newModal, setNewModal] = useState(false)
  const [search, setSearch] = useState('')
  const [form, setForm] = useState({ strategy: '', capital: '1000000' })

  const tabs = [
    { key: 'deployments', label: t('paper.tabs.deployments'), icon: <Play size={16} /> },
    { key: 'orders', label: t('paper.tabs.orders'), icon: <ShoppingCart size={16} /> },
    { key: 'positions', label: t('paper.tabs.positions'), icon: <ListOrdered size={16} /> },
    { key: 'performance', label: t('paper.tabs.performance'), icon: <TrendingUp size={16} /> },
  ]

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
      showToast(t('paper.createSuccess'), 'success')
      setNewModal(false)
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
    { key: 'strategy_name', label: t('paper.columns.strategy') },
    {
      key: 'status',
      label: t('paper.columns.status'),
      render: (deployment) => <Badge variant={deployment.status === 'running' ? 'success' : deployment.status === 'stopped' ? 'muted' : 'warning'}>{deployment.status === 'running' ? t('paper.deployment.running') : deployment.status === 'stopped' ? t('paper.deployment.stopped') : deployment.status}</Badge>,
    },
    { key: 'capital', label: t('paper.columns.capital'), render: (deployment) => `?${deployment.capital.toLocaleString()}` },
    { key: 'pnl', label: t('paper.columns.pnl'), render: (deployment) => <span className={deployment.pnl >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-500'}>{deployment.pnl >= 0 ? '+' : ''}?{deployment.pnl.toLocaleString()}</span> },
    { key: 'pnl_pct', label: t('paper.columns.pnlPct'), render: (deployment) => <span className={deployment.pnl_pct >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-500'}>{deployment.pnl_pct >= 0 ? '+' : ''}{deployment.pnl_pct.toFixed(2)}%</span> },
    { key: 'positions', label: t('paper.columns.positions') },
    { key: 'created_at', label: t('paper.columns.createdAt'), render: (deployment) => new Date(deployment.created_at).toLocaleDateString() },
    { key: 'id', label: t('paper.columns.actions'), render: (deployment) => deployment.status === 'running' ? <button onClick={() => stopMutation.mutate(deployment.id)} className="text-red-500 hover:text-red-700 text-xs"><Square size={12} className="inline mr-0.5" />{t('paper.deployment.stop')}</button> : null },
  ]

  const orderCols: Column<PaperOrder>[] = [
    { key: 'symbol', label: t('paper.columns.symbol') },
    { key: 'direction', label: t('paper.columns.direction'), render: (order) => <Badge variant={order.direction === 'buy' ? 'success' : 'destructive'}>{order.direction === 'buy' ? t('paper.side.buy') : t('paper.side.sell')}</Badge> },
    { key: 'price', label: t('paper.columns.price'), render: (order) => `?${order.price.toFixed(2)}` },
    { key: 'quantity', label: t('paper.columns.quantity') },
    { key: 'status', label: t('paper.columns.status'), render: (order) => <Badge variant={order.status === 'filled' ? 'success' : 'primary'}>{order.status === 'filled' ? t('management.status.filled') : t('management.status.pending')}</Badge> },
    { key: 'created_at', label: t('paper.columns.time'), render: (order) => new Date(order.created_at).toLocaleTimeString() },
  ]

  const posCols: Column<PaperPosition>[] = [
    { key: 'symbol', label: t('paper.columns.symbol') },
    { key: 'direction', label: t('paper.columns.direction'), render: (position) => <Badge variant="success">{position.direction === 'long' ? t('paper.side.long') : t('paper.side.short')}</Badge> },
    { key: 'quantity', label: t('paper.columns.positions') },
    { key: 'avg_cost', label: t('paper.columns.avgCost'), render: (position) => `?${position.avg_cost.toFixed(2)}` },
    { key: 'current_price', label: t('paper.columns.currentPrice'), render: (position) => `?${position.current_price.toFixed(2)}` },
    { key: 'pnl', label: t('paper.columns.pnl'), render: (position) => <span className={position.pnl >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-500'}>{position.pnl >= 0 ? '+' : ''}?{position.pnl.toLocaleString()}</span> },
    { key: 'pnl_pct', label: t('paper.columns.pnlPct'), render: (position) => <span className={position.pnl_pct >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-500'}>{position.pnl_pct >= 0 ? '+' : ''}{position.pnl_pct.toFixed(2)}%</span> },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t('paper.title')}</h1>
          <p className="text-sm text-muted-foreground">{t('paper.subtitle')}</p>
        </div>
        <button onClick={() => setNewModal(true)} className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md bg-primary text-white hover:opacity-90"><Plus size={16} />{t('paper.newSimulation')}</button>
      </div>

      <TabPanel tabs={tabs} activeTab={activeTab} onChange={setActiveTab}>
        {activeTab === 'deployments' && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <StatCard label={t('paper.deployments.count')} value={deployments.length} />
              <StatCard label={t('paper.deployments.running')} value={deployments.filter((deployment) => deployment.status === 'running').length} changeType="positive" />
              <StatCard label={t('paper.deployments.totalPnl')} value={deployments.length > 0 ? `${deployments.reduce((sum, deployment) => sum + deployment.pnl, 0) >= 0 ? '+' : ''}?${deployments.reduce((sum, deployment) => sum + deployment.pnl, 0).toLocaleString()}` : '-'} changeType="positive" />
              <StatCard label={t('paper.deployments.avgReturn')} value={deployments.length > 0 ? `${(deployments.reduce((sum, deployment) => sum + deployment.pnl_pct, 0) / deployments.length).toFixed(2)}%` : '-'} />
            </div>
            <DataTable columns={depCols} data={deployments} emptyText={t('paper.empty.deployments')} />
          </div>
        )}

        {activeTab === 'orders' && (
          <div className="space-y-4">
            <FilterBar
              searchValue={search}
              onSearchChange={setSearch}
            />
            <DataTable columns={orderCols} data={search ? paperOrders.filter((order) => order.symbol.includes(search)) : paperOrders} emptyText={t('paper.empty.orders')} />
          </div>
        )}

        {activeTab === 'positions' && (
          <DataTable columns={posCols} data={paperPositions} emptyText={t('paper.empty.positions')} />
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

      <Modal open={newModal} onClose={() => setNewModal(false)} title={t('paper.modal.title')} footer={
        <>
          <button onClick={() => setNewModal(false)} className="px-4 py-2 text-sm rounded-md border border-border hover:bg-muted">{t('paper.modal.cancel')}</button>
          <button onClick={() => createMutation.mutate()} disabled={!form.strategy} className="px-4 py-2 text-sm rounded-md bg-primary text-white hover:opacity-90 disabled:opacity-50">{t('paper.modal.submit')}</button>
        </>
      }>
        <div className="flex flex-col gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">{t('paper.modal.strategy')}</label>
            <select value={form.strategy} onChange={(event) => setForm({ ...form, strategy: event.target.value })} className="w-full px-3 py-2 text-sm rounded-md border border-border bg-background">
              <option value="">{t('paper.modal.strategyPlaceholder')}</option>
              {strategies.map((strategy) => <option key={strategy.id} value={strategy.id}>{strategy.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">{t('paper.modal.capital')}</label>
            <input type="number" value={form.capital} onChange={(event) => setForm({ ...form, capital: event.target.value })} className="w-full px-3 py-2 text-sm rounded-md border border-border bg-background" />
          </div>
        </div>
      </Modal>
    </div>
  )
}
