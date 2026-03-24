import { useQuery } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

import Badge from '../components/ui/Badge'
import DataTable, { type Column } from '../components/ui/DataTable'
import FilterBar from '../components/ui/FilterBar'
import StatCard from '../components/ui/StatCard'
import { showConfirm, showToast } from '../components/ui/toast-service'
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
    const ok = await showConfirm(t('page.modals.closeConfirmTitle'), t('page.modals.closeConfirmMessage', { name: pos.name || pos.symbol }))
    if (ok) {
      try {
        await portfolioAPI.close({ symbol: pos.symbol, quantity: pos.quantity, price: pos.market_price })
        showToast(t('page.modals.closeSuccess'), 'success')
      } catch {
        showToast(t('page.modals.closeFailed'), 'error')
      }
    }
  }

  const columns: Column<Position>[] = useMemo(() => [
    { key: 'symbol', label: t('page.table.symbol'), sortable: true, className: 'font-mono' },
    { key: 'name', label: t('page.table.name') },
    { key: 'strategy', label: t('page.table.strategy') },
    { key: 'direction', label: t('page.table.direction'), render: (r) => <Badge variant={r.direction === 'short' ? 'destructive' : 'success'}>{r.direction === 'short' ? t('page.direction.short') : t('page.direction.long')}</Badge> },
    { key: 'quantity', label: t('page.table.quantity'), sortable: true },
    { key: 'avg_cost', label: t('page.table.avgCost'), render: (r) => `¥${r.avg_cost.toFixed(2)}` },
    { key: 'market_price', label: t('page.table.marketPrice'), render: (r) => `¥${r.market_price.toFixed(2)}` },
    { key: 'market_value', label: t('page.table.marketValue'), sortable: true, render: (r) => `¥${r.market_value.toLocaleString()}` },
    { key: 'pnl', label: t('page.table.pnl'), sortable: true, render: (r) => <span className={r.pnl >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>{r.pnl >= 0 ? '+' : ''}¥{Math.abs(r.pnl).toLocaleString()}</span> },
    { key: 'pnl_pct', label: t('page.table.pnlPct'), sortable: true, render: (r) => <span className={r.pnl_pct >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>{r.pnl_pct >= 0 ? '+' : ''}{r.pnl_pct.toFixed(2)}%</span> },
    { key: 'actions', label: t('page.table.actions'), render: (r) => (
      <button onClick={() => handleClose(r)} className="px-2 py-1 text-xs rounded border border-border hover:bg-muted">{t('page.actions.closePosition')}</button>
    )},
  ], [t])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">{t('positions.title')}</h1>
        <p className="text-sm text-muted-foreground">{t('positions.subtitle')}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard label={t('page.stats.positionCount')} value={positions.length} />
        <StatCard label={t('page.stats.positionValue')} value={`¥${totalMV.toLocaleString()}`} />
        <StatCard label={t('page.stats.floatingPnl')} value={`${totalPnl >= 0 ? '+' : ''}¥${totalPnl.toLocaleString()}`} changeType={totalPnl >= 0 ? 'positive' : 'negative'} />
      </div>

      <FilterBar
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder={t('page.filters.searchPositions')}
        filters={[{
          key: 'strategy',
          value: strategyFilter,
          options: strategies.map((s) => ({ value: s, label: s })),
          onChange: setStrategyFilter,
          placeholder: t('page.filters.allStrategies'),
        }]}
      />

      <DataTable columns={columns} data={filtered} keyField="symbol" emptyText={t('page.empty.positions')} />
    </div>
  )
}
