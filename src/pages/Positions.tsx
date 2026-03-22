import { useQuery } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

import Badge from '../components/ui/Badge'
import DataTable, { type Column } from '../components/ui/DataTable'
import FilterBar from '../components/ui/FilterBar'
import StatCard from '../components/ui/StatCard'
import { showConfirm, showToast } from '../components/ui/Toast'
import { portfolioAPI } from '../lib/api'
import type { Position } from '../types'

export default function Positions() {
  const { t } = useTranslation('portfolio')
  const [search, setSearch] = useState('')
  const [strategyFilter, setStrategyFilter] = useState('')

  const { data: positions = [], isLoading } = useQuery<Position[]>({
    queryKey: ['portfolio', 'positions'],
    queryFn: () => portfolioAPI.positions().then((r) => r.data?.positions ?? r.data ?? []),
  })

  const strategies = useMemo(() => {
    const set = new Set(positions.map((p) => p.strategy).filter(Boolean))
    return Array.from(set) as string[]
  }, [positions])

  const filtered = useMemo(() => {
    let list = positions
    if (search) {
      const q = search.toLowerCase()
      list = list.filter((p) => p.symbol.toLowerCase().includes(q) || (p.name || '').toLowerCase().includes(q))
    }
    if (strategyFilter) list = list.filter((p) => p.strategy === strategyFilter)
    return list
  }, [positions, search, strategyFilter])

  const totalMV = positions.reduce((s, p) => s + p.market_value, 0)
  const totalPnl = positions.reduce((s, p) => s + p.pnl, 0)

  const handleClose = async (pos: Position) => {
    const ok = await showConfirm('确认平仓', `确定平仓 ${pos.name || pos.symbol}？`)
    if (ok) {
      try {
        await portfolioAPI.close({ symbol: pos.symbol, quantity: pos.quantity, price: pos.market_price })
        showToast('平仓指令已发送', 'success')
      } catch {
        showToast('平仓失败', 'error')
      }
    }
  }

  const columns: Column<Position>[] = [
    { key: 'symbol', label: '代码', sortable: true, className: 'font-mono' },
    { key: 'name', label: '名称' },
    { key: 'strategy', label: '策略' },
    { key: 'direction', label: '方向', render: (r) => <Badge variant={r.direction === 'short' ? 'destructive' : 'success'}>{r.direction === 'short' ? '空' : '多'}</Badge> },
    { key: 'quantity', label: '数量', sortable: true },
    { key: 'avg_cost', label: '成本价', render: (r) => `¥${r.avg_cost.toFixed(2)}` },
    { key: 'market_price', label: '现价', render: (r) => `¥${r.market_price.toFixed(2)}` },
    { key: 'market_value', label: '市值', sortable: true, render: (r) => `¥${r.market_value.toLocaleString()}` },
    { key: 'pnl', label: '盈亏', sortable: true, render: (r) => <span className={r.pnl >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>{r.pnl >= 0 ? '+' : ''}¥{Math.abs(r.pnl).toLocaleString()}</span> },
    { key: 'pnl_pct', label: '盈亏%', sortable: true, render: (r) => <span className={r.pnl_pct >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>{r.pnl_pct >= 0 ? '+' : ''}{r.pnl_pct.toFixed(2)}%</span> },
    { key: 'actions', label: '操作', render: (r) => (
      <button onClick={() => handleClose(r)} className="px-2 py-1 text-xs rounded border border-border hover:bg-muted">平仓</button>
    )},
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">持仓管理</h1>
        <p className="text-sm text-muted-foreground">实时持仓 · 盈亏分析</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard label="持仓数量" value={positions.length} />
        <StatCard label="持仓市值" value={`¥${totalMV.toLocaleString()}`} />
        <StatCard label="总浮动盈亏" value={`${totalPnl >= 0 ? '+' : ''}¥${totalPnl.toLocaleString()}`} changeType={totalPnl >= 0 ? 'positive' : 'negative'} />
      </div>

      <FilterBar
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="搜索持仓..."
        filters={[{
          key: 'strategy',
          value: strategyFilter,
          options: strategies.map((s) => ({ value: s, label: s })),
          onChange: setStrategyFilter,
          placeholder: '全部策略',
        }]}
      />

      <DataTable columns={columns} data={filtered} keyField="symbol" emptyText="暂无持仓" />
    </div>
  )
}
