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

export default function MarketData() {
  const { t } = useTranslation('market')
  const [activeTab, setActiveTab] = useState('quotes')
  const tabs = useMemo(
    () => [
      { key: 'quotes', label: t('page.tabs.quotes'), icon: <List size={16} /> },
      { key: 'kline', label: t('page.tabs.kline'), icon: <LineChartIcon size={16} /> },
      { key: 'sync', label: t('page.tabs.sync'), icon: <RefreshCw size={16} /> },
      { key: 'calendar', label: t('page.tabs.calendar'), icon: <Calendar size={16} /> },
      { key: 'sentiment', label: t('page.tabs.sentiment'), icon: <Gauge size={16} /> },
    ],
    [t]
  )
  const klinePeriods = useMemo(
    () => [t('page.periods.daily'), t('page.periods.weekly'), t('page.periods.monthly')],
    [t]
  )
  const industries = useMemo(
    () => [
      t('page.allIndustries'),
      t('page.industries.liquor'),
      t('page.industries.bank'),
      t('page.industries.solar'),
      t('page.industries.newEnergy'),
      t('page.industries.semiconductor'),
      t('page.industries.healthcare'),
      t('page.industries.property'),
      t('page.industries.technology'),
    ],
    [t]
  )

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
    if (industry && industry !== t('page.allIndustries')) {
      list = list.filter((s) => s.industry?.includes(industry))
    }
    return list
  }, [industry, search, symbols, t])

  const symbolColumns: Column<MarketSymbol>[] = [
    { key: 'symbol', label: t('page.columns.symbol'), sortable: true, className: 'font-mono' },
    { key: 'name', label: t('page.columns.name'), sortable: true },
    { key: 'exchange', label: t('page.columns.exchange') },
    { key: 'industry', label: t('page.columns.industry') },
    { key: 'list_date', label: t('page.columns.listDate'), render: (r) => r.list_date || '-' },
  ]

  // ── K-line tab state ───────────────────────────────────────────────
  const [klineSymbol, setKlineSymbol] = useState('600519.SH')
  const [klinePeriod, setKlinePeriod] = useState<string>(t('page.periods.daily'))
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

      <TabPanel tabs={tabs} activeTab={activeTab} onChange={setActiveTab}>
        {/* ── Quotes Tab ──────────────────────────────── */}
        {activeTab === 'quotes' && (
          <div className="space-y-4">
            <FilterBar
              searchValue={search}
              onSearchChange={setSearch}
              searchPlaceholder={t('page.quoteSearchPlaceholder')}
              filters={[
                {
                  key: 'industry',
                  value: industry,
                  options: industries.map((item) => ({ value: item === t('page.allIndustries') ? '' : item, label: item })),
                  onChange: setIndustry,
                  placeholder: t('page.allIndustries'),
                },
              ]}
            />
            <DataTable
              columns={symbolColumns}
              data={filteredSymbols.slice(0, 100)}
              keyField="symbol"
              emptyText={t('noData')}
              onRowClick={handleSelectSymbol}
            />
            {filteredSymbols.length > 100 && (
              <p className="text-xs text-muted-foreground text-center">
                {t('page.showingTop', { count: filteredSymbols.length })}
              </p>
            )}
          </div>
        )}

        {/* ── K-line Tab ──────────────────────────────── */}
        {activeTab === 'kline' && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <label className="text-sm text-muted-foreground">{t('page.stockLabel')}</label>
                <input
                  type="text"
                  value={klineSymbol}
                  onChange={(e) => setKlineSymbol(e.target.value)}
                  className="px-3 py-1.5 text-sm rounded-md border border-border bg-background text-foreground w-36"
                />
              </div>

              <div className="flex gap-1">
                {klinePeriods.map((p) => (
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
                  {t('page.movingAverage')}
                </label>
                <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer">
                  <input type="checkbox" checked={showVol} onChange={(e) => setShowVol(e.target.checked)} className="rounded" />
                  {t('page.volume')}
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
          <p className="text-center text-muted-foreground py-8">{t('page.empty.sync')}</p>
        )}

        {/* ── Calendar Tab ──────────────────────────── */}
        {activeTab === 'calendar' && (
          <p className="text-center text-muted-foreground py-8">{t('page.empty.calendar')}</p>
        )}

        {/* ── Sentiment Tab ─────────────────────────── */}
        {activeTab === 'sentiment' && (
          <p className="text-center text-muted-foreground py-8">{t('page.empty.sentiment')}</p>
        )}
      </TabPanel>
    </div>
  )
}
