import { useQuery } from '@tanstack/react-query'
import {
  Calendar,
  Gauge,
  LineChart as LineChartIcon,
  List,
  RefreshCw,
} from 'lucide-react'
import { useCallback, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

import CandlestickChart from '../components/charts/CandlestickChart'
import DataTable, { type Column } from '../components/ui/DataTable'
import FilterBar from '../components/ui/FilterBar'
import TabPanel from '../components/ui/TabPanel'
import { marketDataAPI } from '../lib/api'
import type { MarketSymbol, OHLCBar } from '../types'

const TABS = [
  { key: 'quotes', label: '实时行情', icon: <List size={16} /> },
  { key: 'kline', label: 'K线图', icon: <LineChartIcon size={16} /> },
  { key: 'sync', label: '数据同步', icon: <RefreshCw size={16} /> },
  { key: 'calendar', label: '财经日历', icon: <Calendar size={16} /> },
  { key: 'sentiment', label: '市场情绪', icon: <Gauge size={16} /> },
]

const KLINE_PERIODS = ['日K', '周K', '月K'] as const
const INDUSTRIES = ['全部行业', '白酒', '银行', '光伏', '新能源', '半导体', '医药', '地产', '科技']

export default function MarketData() {
  const { t } = useTranslation('market')
  const [activeTab, setActiveTab] = useState('quotes')

  // ── Quotes tab state ───────────────────────────────────────────────
  const [search, setSearch] = useState('')
  const [industry, setIndustry] = useState('')

  const { data: symbols = [], isLoading: symbolsLoading } = useQuery<MarketSymbol[]>({
    queryKey: ['market', 'symbols'],
    queryFn: () => marketDataAPI.symbols(undefined, undefined, 500).then((r) => {
      const d = r.data
      return Array.isArray(d) ? d : d?.data ?? []
    }),
  })

  const filteredSymbols = useMemo(() => {
    let list = symbols
    if (search) {
      const q = search.toLowerCase()
      list = list.filter((s) => s.symbol.toLowerCase().includes(q) || s.name.toLowerCase().includes(q))
    }
    if (industry && industry !== '全部行业') {
      list = list.filter((s) => s.industry?.includes(industry))
    }
    return list
  }, [symbols, search, industry])

  const symbolColumns: Column<MarketSymbol>[] = [
    { key: 'symbol', label: '代码', sortable: true, className: 'font-mono' },
    { key: 'name', label: '名称', sortable: true },
    { key: 'exchange', label: '交易所' },
    { key: 'industry', label: '行业' },
    { key: 'list_date', label: '上市日期', render: (r) => r.list_date || '-' },
  ]

  // ── K-line tab state ───────────────────────────────────────────────
  const [klineSymbol, setKlineSymbol] = useState('600519.SH')
  const [klinePeriod, setKlinePeriod] = useState<string>('日K')
  const [showMA, setShowMA] = useState(true)
  const [showVol, setShowVol] = useState(true)

  const endDate = useMemo(() => {
    const d = new Date()
    return d.toISOString().slice(0, 10)
  }, [])
  const startDate = useMemo(() => {
    const d = new Date()
    d.setMonth(d.getMonth() - 6)
    return d.toISOString().slice(0, 10)
  }, [])

  const { data: klineData, isLoading: klineLoading } = useQuery<OHLCBar[]>({
    queryKey: ['market', 'kline', klineSymbol, startDate, endDate],
    queryFn: () => marketDataAPI.history(klineSymbol, startDate, endDate).then((r) => {
      const d = r.data
      return Array.isArray(d) ? d : d?.data ?? []
    }),
    enabled: activeTab === 'kline' && !!klineSymbol,
  })

  const klineDates = (klineData ?? []).map((b) => b.datetime.slice(0, 10))
  const klineOhlc: [number, number, number, number][] = (klineData ?? []).map((b) => [b.open, b.close, b.low, b.high])
  const klineVolumes = showVol ? (klineData ?? []).map((b) => b.volume) : undefined

  // Simple MA indicators
  const maIndicators = useMemo(() => {
    if (!showMA || !klineData?.length) return []
    const closes = klineData.map((b) => b.close)
    const ma = (period: number) => closes.map((_, i) => {
      if (i < period - 1) return NaN
      let sum = 0
      for (let j = i - period + 1; j <= i; j++) sum += closes[j]
      return +(sum / period).toFixed(2)
    })
    return [
      { name: 'MA5', data: ma(5), color: '#eab308' },
      { name: 'MA10', data: ma(10), color: '#3b82f6' },
      { name: 'MA20', data: ma(20), color: '#a855f7' },
    ]
  }, [klineData, showMA])

  const handleSelectSymbol = useCallback((row: MarketSymbol) => {
    setKlineSymbol(row.vt_symbol || `${row.symbol}.${row.exchange}`)
    setActiveTab('kline')
  }, [])

  // ── Render ─────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">{t('title')}</h1>
        <p className="text-sm text-muted-foreground">{t('subtitle')}</p>
      </div>

      <TabPanel tabs={TABS} activeTab={activeTab} onChange={setActiveTab}>
        {/* ── Quotes Tab ──────────────────────────────── */}
        {activeTab === 'quotes' && (
          <div className="space-y-4">
            <FilterBar
              searchValue={search}
              onSearchChange={setSearch}
              searchPlaceholder="搜索股票代码或名称..."
              filters={[
                {
                  key: 'industry',
                  value: industry,
                  options: INDUSTRIES.map((i) => ({ value: i === '全部行业' ? '' : i, label: i })),
                  onChange: setIndustry,
                  placeholder: '全部行业',
                },
              ]}
            />
            <DataTable
              columns={symbolColumns}
              data={filteredSymbols.slice(0, 100)}
              keyField="symbol"
              emptyText="暂无数据"
              onRowClick={handleSelectSymbol}
            />
            {filteredSymbols.length > 100 && (
              <p className="text-xs text-muted-foreground text-center">
                显示前 100 条，共 {filteredSymbols.length} 条
              </p>
            )}
          </div>
        )}

        {/* ── K-line Tab ──────────────────────────────── */}
        {activeTab === 'kline' && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <label className="text-sm text-muted-foreground">股票:</label>
                <input
                  type="text"
                  value={klineSymbol}
                  onChange={(e) => setKlineSymbol(e.target.value)}
                  className="px-3 py-1.5 text-sm rounded-md border border-border bg-background text-foreground w-36"
                />
              </div>

              <div className="flex gap-1">
                {KLINE_PERIODS.map((p) => (
                  <button
                    key={p}
                    onClick={() => setKlinePeriod(p)}
                    className={`px-2.5 py-1 text-xs rounded ${klinePeriod === p ? 'bg-primary text-white' : 'text-muted-foreground hover:bg-muted'}`}
                  >
                    {p}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-3 ml-auto">
                <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer">
                  <input type="checkbox" checked={showMA} onChange={(e) => setShowMA(e.target.checked)} className="rounded" />
                  均线
                </label>
                <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer">
                  <input type="checkbox" checked={showVol} onChange={(e) => setShowVol(e.target.checked)} className="rounded" />
                  成交量
                </label>
              </div>
            </div>

            <div className="rounded-lg border border-border bg-card p-4">
              <CandlestickChart
                dates={klineDates}
                ohlc={klineOhlc}
                volumes={klineVolumes}
                indicators={maIndicators}
                height={500}
                loading={klineLoading}
              />
            </div>
          </div>
        )}

        {/* ── Sync Tab ──────────────────────────────── */}
        {activeTab === 'sync' && (
          <p className="text-center text-muted-foreground py-8">暂无数据同步任务信息</p>
        )}

        {/* ── Calendar Tab ──────────────────────────── */}
        {activeTab === 'calendar' && (
          <p className="text-center text-muted-foreground py-8">暂无财经日历数据</p>
        )}

        {/* ── Sentiment Tab ─────────────────────────── */}
        {activeTab === 'sentiment' && (
          <p className="text-center text-muted-foreground py-8">暂无市场情绪数据</p>
        )}
      </TabPanel>
    </div>
  )
}
