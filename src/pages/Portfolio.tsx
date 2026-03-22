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

const TABS = [
  { key: 'overview', label: '组合概览', icon: <Briefcase size={16} /> },
  { key: 'positions', label: '持仓明细', icon: <Wallet size={16} /> },
  { key: 'risk', label: '风险分析', icon: <Shield size={16} /> },
  { key: 'allocation', label: '资产配置', icon: <PieChartIcon size={16} /> },
]

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

  // ── Risk rules (placeholder) ───────────────────────────────────────
  const riskRules = [
    { rule: '单股最大仓位', threshold: '≤ 20%', current: holdingsDistrib[0]?.pct ? `${holdingsDistrib[0].pct}%` : '0%', ok: (holdingsDistrib[0]?.pct ?? 0) <= 20 },
    { rule: '总仓位上限', threshold: '≤ 80%', current: `${positionRatio}%`, ok: +positionRatio <= 80 },
    { rule: '单日最大亏损', threshold: '≤ 3%', current: `${Math.abs(stats?.daily_pnl_pct ?? 0).toFixed(1)}%`, ok: Math.abs(stats?.daily_pnl_pct ?? 0) <= 3 },
    { rule: '最大回撤限制', threshold: '≤ 15%', current: `${(riskData?.max_drawdown ?? dashData?.risk_metrics?.max_drawdown ?? 0).toFixed(1)}%`, ok: (riskData?.max_drawdown ?? dashData?.risk_metrics?.max_drawdown ?? 0) <= 15 },
    { rule: '行业集中度', threshold: '≤ 30%', current: `${(riskData?.concentration ?? 0).toFixed(1)}%`, ok: (riskData?.concentration ?? 0) <= 30 },
  ]

  // ── Columns ────────────────────────────────────────────────────────
  const posColumns: Column<Position>[] = [
    { key: 'symbol', label: '代码', sortable: true, className: 'font-mono' },
    { key: 'name', label: '名称' },
    { key: 'strategy', label: '策略' },
    { key: 'direction', label: '方向', render: (r) => <Badge variant={r.direction === 'short' ? 'destructive' : 'success'}>{r.direction === 'short' ? '空' : '多'}</Badge> },
    { key: 'quantity', label: '数量', sortable: true },
    { key: 'avg_cost', label: '成本价', render: (r) => `¥${r.avg_cost.toFixed(2)}` },
    { key: 'market_price', label: '现价', render: (r) => `¥${r.market_price.toFixed(2)}` },
    { key: 'market_value', label: '市值', sortable: true, render: (r) => `¥${r.market_value.toLocaleString()}` },
    {
      key: 'pnl', label: '盈亏', sortable: true,
      render: (r) => <span className={r.pnl >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>{r.pnl >= 0 ? '+' : ''}¥{Math.abs(r.pnl).toLocaleString()}</span>,
    },
    {
      key: 'pnl_pct', label: '盈亏%', sortable: true,
      render: (r) => <span className={r.pnl_pct >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>{r.pnl_pct >= 0 ? '+' : ''}{r.pnl_pct.toFixed(2)}%</span>,
    },
  ]

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
          <button onClick={() => setRiskModalOpen(true)} className="px-3 py-1.5 text-sm rounded-md border border-border hover:bg-muted">风控设置</button>
          <button onClick={() => setRebalanceModalOpen(true)} className="px-3 py-1.5 text-sm rounded-md bg-primary text-white hover:opacity-90">再平衡</button>
        </div>
      </div>

      <TabPanel tabs={TABS} activeTab={activeTab} onChange={setActiveTab}>
        {/* ── Overview ────────────────────────────────── */}
        {activeTab === 'overview' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard label="总市值" value={`¥${totalValue.toLocaleString()}`} icon={Wallet} iconColor="text-blue-500" />
              <StatCard label="持仓市值" value={`¥${positionVale.toLocaleString()}`} icon={Briefcase} iconColor="text-green-500" />
              <StatCard label="可用资金" value={`¥${cash.toLocaleString()}`} icon={BarChart3} iconColor="text-purple-500" />
              <StatCard label="仓位比例" value={`${positionRatio}%`} icon={PieChartIcon} iconColor="text-yellow-500" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard label="总盈亏" value={`${(stats?.total_pnl ?? 0) >= 0 ? '+' : ''}¥${(stats?.total_pnl ?? 0).toLocaleString()}`} changeType={(stats?.total_pnl ?? 0) >= 0 ? 'positive' : 'negative'} />
              <StatCard label="今日盈亏" value={`${(stats?.daily_pnl ?? 0) >= 0 ? '+' : ''}¥${(stats?.daily_pnl ?? 0).toLocaleString()}`} change={`${(stats?.daily_pnl_pct ?? 0) >= 0 ? '+' : ''}${(stats?.daily_pnl_pct ?? 0).toFixed(2)}%`} changeType={(stats?.daily_pnl ?? 0) >= 0 ? 'positive' : 'negative'} />
              <StatCard label="最大回撤" value={`-${(dashData?.risk_metrics?.max_drawdown ?? 0).toFixed(1)}%`} changeType="negative" />
              <StatCard label="Sharpe(30d)" value={(dashData?.risk_metrics?.sharpe_ratio ?? 0).toFixed(2)} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="rounded-lg border border-border bg-card p-5">
                <h3 className="font-semibold text-card-foreground mb-4">净值走势</h3>
                <LineChart xData={navDates} series={[{ name: '净值', data: navValues, areaStyle: true }]} height={220} loading={loading} />
              </div>

              <div className="rounded-lg border border-border bg-card p-5">
                <h3 className="font-semibold text-card-foreground mb-4">持仓分布</h3>
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
              searchPlaceholder="搜索持仓..."
              filters={[
                {
                  key: 'strategy',
                  value: strategyFilter,
                  options: strategies.map((s) => ({ value: s, label: s })),
                  onChange: setStrategyFilter,
                  placeholder: '全部策略',
                },
                {
                  key: 'direction',
                  value: dirFilter,
                  options: [{ value: 'long', label: '多' }, { value: 'short', label: '空' }],
                  onChange: setDirFilter,
                  placeholder: '全部方向',
                },
              ]}
            />
            <DataTable columns={posColumns} data={filteredPositions} keyField="symbol" emptyText="暂无持仓" />
          </div>
        )}

        {/* ── Risk ────────────────────────────────────── */}
        {activeTab === 'risk' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <StatCard label="VaR (95%, 1天)" value={`¥${(riskData?.value_at_risk ?? 0).toLocaleString()}`} subtitle={`占总资产 ${totalValue > 0 ? ((riskData?.value_at_risk ?? 0) / totalValue * 100).toFixed(2) : '0'}%`} changeType="negative" />
              <StatCard label="最大回撤" value={`${(riskData?.max_drawdown ?? 0).toFixed(1)}%`} changeType="negative" />
              <StatCard label="Beta (vs 沪深300)" value={(riskData?.beta ?? 0).toFixed(2)} subtitle={riskData?.beta && riskData.beta < 1 ? '低于市场风险' : '高于市场风险'} />
            </div>

            <div className="rounded-lg border border-border bg-card p-5">
              <h3 className="font-semibold text-card-foreground mb-4">风控规则</h3>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="px-4 py-2 text-left font-medium text-muted-foreground">规则</th>
                    <th className="px-4 py-2 text-left font-medium text-muted-foreground">阈值</th>
                    <th className="px-4 py-2 text-left font-medium text-muted-foreground">当前值</th>
                    <th className="px-4 py-2 text-left font-medium text-muted-foreground">状态</th>
                  </tr>
                </thead>
                <tbody>
                  {riskRules.map((r) => (
                    <tr key={r.rule} className="border-b border-border">
                      <td className="px-4 py-2">{r.rule}</td>
                      <td className="px-4 py-2">{r.threshold}</td>
                      <td className="px-4 py-2">{r.current}</td>
                      <td className="px-4 py-2"><Badge variant={r.ok ? 'success' : 'destructive'}>{r.ok ? '正常' : '超限'}</Badge></td>
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
                <h3 className="font-semibold text-card-foreground mb-4">当前配置</h3>
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
                <h3 className="font-semibold text-card-foreground mb-4">目标配置</h3>
                <div className="flex flex-col gap-3">
                  {[
                    { name: '白酒行业', target: 30, color: themeColors.primary },
                    { name: '银行行业', target: 25, color: '#22c55e' },
                    { name: '光伏行业', target: 20, color: '#eab308' },
                    { name: '科技行业', target: 25, color: '#ef4444' },
                  ].map((a) => (
                    <div key={a.name}>
                      <div className="flex justify-between text-[13px] mb-1">
                        <span>{a.name}</span>
                        <span>目标 {a.target}%</span>
                      </div>
                      <div className="h-2 rounded-full bg-muted overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${a.target}%`, background: a.color }} />
                      </div>
                    </div>
                  ))}
                </div>
                <button
                  onClick={() => showToast('目标配置已应用', 'success')}
                  className="mt-4 px-3 py-1.5 text-sm rounded-md bg-primary text-white hover:opacity-90"
                >
                  应用目标配置
                </button>
              </div>
            </div>
          </div>
        )}
      </TabPanel>

      {/* Risk Settings Modal */}
      <Modal open={riskModalOpen} onClose={() => setRiskModalOpen(false)} title="风控设置" footer={
        <>
          <button onClick={() => setRiskModalOpen(false)} className="px-4 py-2 text-sm rounded-md border border-border hover:bg-muted">取消</button>
          <button onClick={() => { setRiskModalOpen(false); showToast('风控设置已保存', 'success') }} className="px-4 py-2 text-sm rounded-md bg-primary text-white hover:opacity-90">保存</button>
        </>
      }>
        <div className="flex flex-col gap-4">
          {[
            { label: '单股最大仓位 (%)', defaultValue: 20 },
            { label: '总仓位上限 (%)', defaultValue: 80 },
            { label: '单日最大亏损 (%)', defaultValue: 3 },
            { label: '最大回撤限制 (%)', defaultValue: 15 },
            { label: '行业集中度上限 (%)', defaultValue: 30 },
          ].map((field) => (
            <div key={field.label}>
              <label className="block text-sm font-medium text-foreground mb-1">{field.label}</label>
              <input type="number" defaultValue={field.defaultValue} className="w-full px-3 py-2 text-sm rounded-md border border-border bg-background" />
            </div>
          ))}
        </div>
      </Modal>

      {/* Rebalance Modal */}
      <Modal open={rebalanceModalOpen} onClose={() => setRebalanceModalOpen(false)} title="组合再平衡" footer={
        <>
          <button onClick={() => setRebalanceModalOpen(false)} className="px-4 py-2 text-sm rounded-md border border-border hover:bg-muted">取消</button>
          <button onClick={() => { setRebalanceModalOpen(false); showToast('再平衡指令已发送，请稍候...', 'success') }} className="px-4 py-2 text-sm rounded-md bg-primary text-white hover:opacity-90">执行再平衡</button>
        </>
      }>
        <p className="text-sm text-muted-foreground mb-4">系统将根据目标配置权重，自动生成调仓建议。</p>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="px-3 py-2 text-left font-medium text-muted-foreground">调整项</th>
              <th className="px-3 py-2 text-left font-medium text-muted-foreground">操作</th>
              <th className="px-3 py-2 text-left font-medium text-muted-foreground">目标</th>
            </tr>
          </thead>
          <tbody>
            {[
              { name: '贵州茅台', action: '减持 62.2%', target: '30%', isReduce: true },
              { name: '银行 ETF', action: '买入 25%', target: '25%', isReduce: false },
              { name: '光伏 ETF', action: '增持 12.2%', target: '20%', isReduce: false },
              { name: '科技 ETF', action: '买入 25%', target: '25%', isReduce: false },
            ].map((item) => (
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
