import { useMutation, useQuery } from '@tanstack/react-query'
import {
  Calendar,
  CheckCircle2,
  Gauge,
  LineChart as LineChartIcon,
  List,
  Loader2,
  Play,
  RefreshCw,
  XCircle,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

import CandlestickChart from '../components/charts/CandlestickChart'
import TabPanel from '../components/ui/TabPanel'
import { showToast } from '../components/ui/toast-service'
import { datasyncAPI, marketDataAPI } from '../lib/api'
import type { MarketSymbol, OHLCBar } from '../types'

type QuoteMarket = 'CN' | 'HK' | 'US' | 'CRYPTO' | 'FUTURES' | 'CN_INDEX'

type Quote = {
  symbol?: string
  name?: string
  price?: number
  change?: number
  change_percent?: number
  open?: number
  high?: number
  low?: number
  prev_close?: number
  volume?: number
  amount?: number
  market?: string
  currency?: string
  source?: string
  asof?: string
  delayed?: boolean
}

type MarketCard = {
  id: string
  market: QuoteMarket
  symbol: string
  labelKey: string
}

const OVERVIEW_CARDS: MarketCard[] = [
  { id: 'cn', market: 'CN_INDEX', symbol: '000300.SH', labelKey: 'page.marketCards.cn' },
  { id: 'hk', market: 'HK', symbol: '00700', labelKey: 'page.marketCards.hk' },
  { id: 'us', market: 'US', symbol: 'AAPL', labelKey: 'page.marketCards.us' },
  { id: 'crypto', market: 'CRYPTO', symbol: 'BTCUSDT', labelKey: 'page.marketCards.crypto' },
]

const KLINE_MARKET_OPTIONS: Array<{ value: QuoteMarket; labelKey: string }> = [
  { value: 'CN', labelKey: 'realtime.markets.cn' },
  { value: 'HK', labelKey: 'realtime.markets.hk' },
  { value: 'US', labelKey: 'realtime.markets.us' },
  { value: 'CRYPTO', labelKey: 'realtime.markets.crypto' },
]

const YEAR_RANGES = [1, 2, 5, 10] as const

type YearRange = (typeof YEAR_RANGES)[number]

const QUICK_SYMBOLS: Record<QuoteMarket, string[]> = {
  CN: ['600519', '000001', '000858', '601318', '300750'],
  HK: ['00700', '09988', '03690', '01810', '00941'],
  US: ['AAPL', 'MSFT', 'NVDA', 'TSLA', 'AMZN'],
  CRYPTO: ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT', 'DOGEUSDT'],
  FUTURES: ['RB2410', 'AU2408', 'CU2409', 'IF2409', 'SC2409'],
  CN_INDEX: ['000300.SH', '000001.SH', '399001.SZ', '399006.SZ'],
}

function unwrapList<T>(value: unknown): T[] {
  if (Array.isArray(value)) return value as T[]
  if (value && typeof value === 'object') {
    const container = value as Record<string, unknown>
    if (Array.isArray(container.data)) return container.data as T[]
    if (container.data && typeof container.data === 'object') {
      const nested = container.data as Record<string, unknown>
      if (Array.isArray(nested.data)) return nested.data as T[]
      if (Array.isArray(nested.items)) return nested.items as T[]
    }
  }
  return []
}

function toNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string') {
    const parsed = Number(value)
    if (Number.isFinite(parsed)) return parsed
  }
  return null
}

function formatDate(d: Date): string {
  return d.toISOString().slice(0, 10)
}

function subtractYears(end: string, years: number): string {
  const d = new Date(`${end}T00:00:00`)
  d.setFullYear(d.getFullYear() - years)
  return formatDate(d)
}

function normalizeQuoteSymbol(symbol: string, market: QuoteMarket): string {
  const raw = symbol.trim().toUpperCase()
  if (!raw) return ''

  if (market === 'CN' || market === 'CN_INDEX') {
    const code = raw.split('.')[0].replace(/^SH|^SZ/, '')
    return code
  }

  if (market === 'HK') {
    const code = raw.split('.')[0].replace(/^HK/, '')
    return code.padStart(5, '0')
  }

  return raw.replace(/[^A-Z0-9]/g, '')
}

function toCnVtSymbol(input: string): string | null {
  const raw = input.trim().toUpperCase()
  if (!raw) return null

  if (raw.includes('.')) {
    const [codePart, suffixPart] = raw.split('.')
    const code = codePart.replace(/[^0-9]/g, '')
    const suffix = suffixPart.trim()
    if (!code) return null
    if (suffix === 'SSE' || suffix === 'SH') return `${code}.SSE`
    if (suffix === 'SZSE' || suffix === 'SZ') return `${code}.SZSE`
  }

  const codeOnly = raw.replace(/[^0-9]/g, '')
  if (!codeOnly) return null
  const isShanghai = codeOnly.startsWith('5') || codeOnly.startsWith('6') || codeOnly.startsWith('9')
  return `${codeOnly}.${isShanghai ? 'SSE' : 'SZSE'}`
}

function parseQuotePayload(value: unknown): Quote {
  if (value && typeof value === 'object') {
    return value as Quote
  }
  return {}
}

function quoteFromSeriesFallback(
  points: Array<{ ts: number; price: number }>,
  market: QuoteMarket,
  symbol: string
): Quote | null {
  if (!Array.isArray(points) || points.length === 0) return null
  const latest = points[points.length - 1]
  return {
    symbol,
    market,
    price: toNumber(latest.price) ?? undefined,
    source: 'cache:series',
    delayed: true,
    asof: new Date((latest.ts || 0) * 1000).toISOString(),
  }
}

async function fetchQuoteFast(params: { symbol: string; market: QuoteMarket }): Promise<Quote | null> {
  try {
    const timeoutMs = params.market === 'CN' || params.market === 'CN_INDEX' ? 5000 : 3000
    const response = await marketDataAPI.quote(params, { timeoutMs })
    const quote = parseQuotePayload(response.data)
    if (toNumber(quote.price) !== null) return quote
  } catch {
    // Fall through to cache fallback
  }

  try {
    const seriesResponse = await marketDataAPI.quoteSeries(params, { timeoutMs: 2500 })
    const seriesPoints = ((seriesResponse.data as { points?: Array<{ ts: number; price: number }> })?.points || [])
      .filter((point) => typeof point?.ts === 'number' && typeof point?.price === 'number')
    return quoteFromSeriesFallback(seriesPoints, params.market, params.symbol)
  } catch {
    return null
  }
}

function mergeRealtimeIntoDailyBars(bars: OHLCBar[], quote: Quote | undefined, tradeDate: string): OHLCBar[] {
  if (!quote || toNumber(quote.price) === null) return bars

  const price = toNumber(quote.price) as number
  const open = toNumber(quote.open) ?? toNumber(quote.prev_close) ?? price
  const high = Math.max(toNumber(quote.high) ?? price, price, open)
  const low = Math.min(toNumber(quote.low) ?? price, price, open)
  const volume = toNumber(quote.volume) ?? 0

  const merged = [...bars].sort((a, b) => String(a.datetime).localeCompare(String(b.datetime)))
  const currentBar: OHLCBar = {
    datetime: `${tradeDate}T15:00:00`,
    open,
    high,
    low,
    close: price,
    volume,
  }

  if (merged.length === 0) {
    return [currentBar]
  }

  const last = merged[merged.length - 1]
  const lastDate = String(last.datetime).slice(0, 10)
  if (lastDate === tradeDate) {
    merged[merged.length - 1] = {
      ...last,
      open: toNumber(last.open) ?? open,
      high: Math.max(toNumber(last.high) ?? high, high),
      low: Math.min(toNumber(last.low) ?? low, low),
      close: price,
      volume: Math.max(toNumber(last.volume) ?? 0, volume),
    }
    return merged
  }

  merged.push(currentBar)
  return merged
}

function quoteChangeClass(change: number | null): string {
  if (change === null) return 'text-muted-foreground'
  return change >= 0 ? 'text-green-600' : 'text-red-600'
}

function formatPrice(value: number | null): string {
  if (value === null) return '--'
  if (Math.abs(value) >= 1000) return value.toLocaleString(undefined, { maximumFractionDigits: 2 })
  return value.toFixed(4)
}

// ---------------------------------------------------------------------------
// SyncStatusPanel — Data Synchronization tab
// ---------------------------------------------------------------------------

type SyncLatestItem = {
  source: string
  interface_key: string
  status: string
  rows_synced: number
  error_message: string | null
  retry_count: number
  started_at: string | null
  finished_at: string | null
}

type SyncSummary = {
  days: number
  overall: Record<string, number>
  by_date: Record<string, Record<string, Record<string, number>>>
}

function StatusBadge({ status }: { status: string }) {
  const cls: Record<string, string> = {
    success: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400',
    error: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400',
    pending: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400',
    running: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400',
    partial: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-400',
  }
  const icon: Record<string, React.ReactNode> = {
    success: <CheckCircle2 size={12} />,
    error: <XCircle size={12} />,
    running: <Loader2 size={12} className="animate-spin" />,
  }
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${cls[status] || 'bg-muted text-muted-foreground'}`}>
      {icon[status]}
      {status}
    </span>
  )
}

function SyncStatusPanel() {
  const { t } = useTranslation('market')

  const { data: latestData, isLoading: latestLoading, refetch: refetchLatest, error: latestError } = useQuery<{
    latest_date: string | null
    items: SyncLatestItem[]
  }>({
    queryKey: ['datasync', 'latest'],
    queryFn: () => datasyncAPI.latest().then((r) => r.data),
    refetchInterval: 30000,
  })

  const { data: summaryData, isLoading: summaryLoading } = useQuery<SyncSummary>({
    queryKey: ['datasync', 'summary'],
    queryFn: () => datasyncAPI.summary(7).then((r) => r.data),
    refetchInterval: 60000,
  })

  const triggerMutation = useMutation({
    mutationFn: () => datasyncAPI.trigger(),
    onSuccess: () => {
      showToast(t('page.sync.triggered'), 'success')
      void refetchLatest()
    },
    onError: () => showToast(t('page.sync.triggerFailed'), 'error'),
  })

  const handleTrigger = () => {
    if (window.confirm(t('page.sync.triggerConfirm'))) {
      triggerMutation.mutate()
    }
  }

  if (latestLoading && summaryLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="animate-spin text-muted-foreground" size={24} />
      </div>
    )
  }

  if (latestError) {
    return <p className="py-8 text-center text-destructive">{t('page.sync.loadFailed')}</p>
  }

  const items = latestData?.items ?? []
  const overall = summaryData?.overall ?? {}

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">{t('page.sync.title')}</h2>
          <p className="text-sm text-muted-foreground">{t('page.sync.subtitle')}</p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-sm hover:bg-muted"
            onClick={() => void refetchLatest()}
          >
            <RefreshCw size={14} />
          </button>
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm text-white hover:opacity-90 disabled:opacity-50"
            onClick={handleTrigger}
            disabled={triggerMutation.isPending}
          >
            {triggerMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
            {t('page.sync.triggerSync')}
          </button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-5">
        <div className="rounded-lg border border-border bg-card p-3">
          <div className="text-xs text-muted-foreground">{t('page.sync.latestDate')}</div>
          <div className="mt-1 text-lg font-semibold text-foreground">{latestData?.latest_date ?? '--'}</div>
        </div>
        {(['success', 'error', 'pending', 'running'] as const).map((s) => (
          <div key={s} className="rounded-lg border border-border bg-card p-3">
            <div className="text-xs text-muted-foreground">{t(`page.sync.${s}`)}</div>
            <div className="mt-1 text-lg font-semibold text-foreground">{overall[s] ?? 0}</div>
          </div>
        ))}
      </div>

      {/* Latest sync table */}
      {items.length === 0 ? (
        <p className="py-8 text-center text-muted-foreground">{t('page.sync.noRecords')}</p>
      ) : (
        <div className="overflow-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-xs text-muted-foreground">
              <tr>
                <th className="px-3 py-2">{t('page.sync.source')}</th>
                <th className="px-3 py-2">{t('page.sync.interface')}</th>
                <th className="px-3 py-2">{t('common:status')}</th>
                <th className="px-3 py-2 text-right">{t('page.sync.rows')}</th>
                <th className="px-3 py-2 text-right">{t('page.sync.retries')}</th>
                <th className="px-3 py-2">{t('page.sync.finishedAt')}</th>
                <th className="px-3 py-2">{t('page.sync.errorMessage')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {items.map((item) => (
                <tr key={`${item.source}/${item.interface_key}`} className="hover:bg-muted/30">
                  <td className="px-3 py-2 font-medium">{item.source}</td>
                  <td className="px-3 py-2">{item.interface_key}</td>
                  <td className="px-3 py-2"><StatusBadge status={item.status} /></td>
                  <td className="px-3 py-2 text-right tabular-nums">{item.rows_synced.toLocaleString()}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{item.retry_count}</td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">
                    {item.finished_at ? new Date(item.finished_at).toLocaleString() : '--'}
                  </td>
                  <td className="max-w-[200px] truncate px-3 py-2 text-xs text-destructive" title={item.error_message ?? ''}>
                    {item.error_message ?? ''}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}


// ---------------------------------------------------------------------------
// Main MarketData page
// ---------------------------------------------------------------------------

export default function MarketData() {
  const { t, i18n } = useTranslation(['market', 'common'])
  const currentLanguage = i18n.resolvedLanguage ?? i18n.language

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

  const today = useMemo(() => formatDate(new Date()), [])

  const {
    data: overviewQuotes = [],
    isLoading: overviewLoading,
    refetch: refetchOverview,
    isFetching: overviewFetching,
  } = useQuery({
    queryKey: ['market', 'overview-multi'],
    enabled: activeTab === 'quotes',
    refetchInterval: 20000,
    queryFn: async () => {
      const rows = await Promise.all(
        OVERVIEW_CARDS.map(async (card) => {
          const quote = await fetchQuoteFast({ symbol: card.symbol, market: card.market })
          return { ...card, quote, error: quote ? null : t('page.quoteTimeoutHint') }
        })
      )
      return rows
    },
  })

  const [klineMarket, setKlineMarket] = useState<QuoteMarket>('CN')
  const [klineSymbolInput, setKlineSymbolInput] = useState('600519')
  const [debouncedKlineSymbol, setDebouncedKlineSymbol] = useState('600519')
  const [historyYears, setHistoryYears] = useState<YearRange>(1)
  const [showMA, setShowMA] = useState(true)
  const [showVol, setShowVol] = useState(true)

  useEffect(() => {
    const handle = window.setTimeout(() => {
      setDebouncedKlineSymbol(klineSymbolInput.trim())
    }, 300)
    return () => window.clearTimeout(handle)
  }, [klineSymbolInput])

  const quoteSymbol = useMemo(
    () => normalizeQuoteSymbol(debouncedKlineSymbol, klineMarket),
    [debouncedKlineSymbol, klineMarket]
  )

  const cnVtSymbol = useMemo(() => {
    if (klineMarket !== 'CN') return null
    return toCnVtSymbol(debouncedKlineSymbol)
  }, [debouncedKlineSymbol, klineMarket])

  const historyStartDate = useMemo(() => subtractYears(today, historyYears), [historyYears, today])

  const { data: symbols = [] } = useQuery<MarketSymbol[]>({
    queryKey: ['market', 'symbols', 'cn'],
    enabled: activeTab === 'kline' && klineMarket === 'CN',
    queryFn: () =>
      marketDataAPI.symbols(undefined, undefined, 500).then((response) => unwrapList<MarketSymbol>(response.data)),
  })

  const klineSuggestions = useMemo(() => {
    if (klineMarket !== 'CN') {
      return QUICK_SYMBOLS[klineMarket].filter((item) =>
        item.toLowerCase().includes(klineSymbolInput.trim().toLowerCase())
      )
    }

    const q = klineSymbolInput.trim().toLowerCase()
    const cnFromDb = symbols
      .filter((item) => {
        if (!q) return true
        return item.symbol.toLowerCase().includes(q) || item.name.toLowerCase().includes(q)
      })
      .slice(0, 20)
      .map((item) => item.symbol)

    const fallback = QUICK_SYMBOLS.CN.filter((item) => item.includes(q))
    return Array.from(new Set([...cnFromDb, ...fallback])).slice(0, 20)
  }, [klineMarket, klineSymbolInput, symbols])

  const {
    data: klineQuote,
    isLoading: quoteLoading,
    refetch: refetchQuote,
  } = useQuery<Quote>({
    queryKey: ['market', 'kline-quote', klineMarket, quoteSymbol],
    enabled: activeTab === 'kline' && quoteSymbol.length >= 2,
    refetchInterval: 15000,
    queryFn: async () => {
      const quote = await fetchQuoteFast({ symbol: quoteSymbol, market: klineMarket })
      return quote || {}
    },
  })

  const {
    data: historyBars = [],
    isLoading: historyLoading,
    error: historyError,
    refetch: refetchHistory,
  } = useQuery<OHLCBar[]>({
    queryKey: ['market', 'kline-history', cnVtSymbol, historyStartDate, today],
    enabled: activeTab === 'kline' && !!cnVtSymbol,
    queryFn: () =>
      marketDataAPI
        .history(cnVtSymbol as string, historyStartDate, today, { pageSize: 5000 })
        .then((response) => unwrapList<OHLCBar>(response.data)),
  })

  const mergedKlineBars = useMemo(
    () => mergeRealtimeIntoDailyBars(historyBars, klineQuote, today),
    [historyBars, klineQuote, today]
  )

  const klineDates = useMemo(
    () => mergedKlineBars.map((bar) => String(bar.datetime).slice(0, 10)),
    [mergedKlineBars]
  )

  const klineOhlc: [number, number, number, number][] = useMemo(
    () =>
      mergedKlineBars.map((bar) => [
        toNumber(bar.open) ?? 0,
        toNumber(bar.close) ?? 0,
        toNumber(bar.low) ?? 0,
        toNumber(bar.high) ?? 0,
      ]),
    [mergedKlineBars]
  )

  const klineVolumes = useMemo(
    () => (showVol ? mergedKlineBars.map((bar) => toNumber(bar.volume) ?? 0) : undefined),
    [mergedKlineBars, showVol]
  )

  const maIndicators = useMemo(() => {
    if (!showMA || mergedKlineBars.length === 0) return []
    const closes = mergedKlineBars.map((bar) => toNumber(bar.close) ?? 0)
    const ma = (period: number) =>
      closes.map((_, index) => {
        if (index < period - 1) return Number.NaN
        let sum = 0
        for (let j = index - period + 1; j <= index; j++) sum += closes[j]
        return +(sum / period).toFixed(2)
      })

    return [
      { name: 'MA5', data: ma(5), color: '#eab308' },
      { name: 'MA10', data: ma(10), color: '#3b82f6' },
      { name: 'MA20', data: ma(20), color: '#a855f7' },
    ]
  }, [mergedKlineBars, showMA])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">{t('title')}</h1>
        <p className="text-sm text-muted-foreground">{t('subtitle')}</p>
      </div>

      <TabPanel tabs={tabs} activeTab={activeTab} onChange={setActiveTab}>
        {activeTab === 'quotes' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-foreground">{t('page.quoteBoardTitle')}</h2>
                <p className="text-sm text-muted-foreground">{t('page.quoteBoardSubtitle')}</p>
              </div>
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-sm hover:bg-muted"
                onClick={() => void refetchOverview()}
                disabled={overviewFetching}
              >
                <RefreshCw size={14} className={overviewFetching ? 'animate-spin' : ''} />
                {t('common:refresh')}
              </button>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {(overviewQuotes || []).map((card) => {
                const quote = card.quote
                const change = toNumber(quote?.change)
                const changePct = toNumber(quote?.change_percent)
                const price = toNumber(quote?.price)
                const high = toNumber(quote?.high)
                const low = toNumber(quote?.low)
                const volume = toNumber(quote?.volume)

                return (
                  <article key={card.id} className="rounded-xl border border-border bg-card p-4">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <div className="text-sm font-medium text-foreground">{t(card.labelKey)}</div>
                        <div className="text-xs text-muted-foreground">{quote?.symbol || card.symbol}</div>
                      </div>
                      {quote?.delayed && <span className="rounded bg-amber-100 px-2 py-0.5 text-[10px] text-amber-700">{t('realtime.delayed')}</span>}
                    </div>

                    <div className="mt-3 text-2xl font-semibold text-foreground">{formatPrice(price)}</div>
                    <div className={`mt-1 text-sm ${quoteChangeClass(change)}`}>
                      {change !== null ? `${change >= 0 ? '+' : ''}${change.toFixed(2)}` : '--'}
                      {changePct !== null ? ` (${changePct >= 0 ? '+' : ''}${changePct.toFixed(2)}%)` : ''}
                    </div>

                    <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                      <div>{t('overview.high')}: {high !== null ? high.toFixed(2) : '--'}</div>
                      <div>{t('overview.low')}: {low !== null ? low.toFixed(2) : '--'}</div>
                      <div className="col-span-2">{t('overview.volume')}: {volume !== null ? volume.toLocaleString() : '--'}</div>
                    </div>

                    <div className="mt-2 text-[11px] text-muted-foreground">
                      {quote?.asof
                        ? t('realtime.asOf', {
                            time: new Intl.DateTimeFormat(currentLanguage.startsWith('zh') ? 'zh-CN' : 'en-US', {
                              hour: '2-digit',
                              minute: '2-digit',
                              second: '2-digit',
                            }).format(new Date(quote.asof)),
                          })
                        : t('realtime.asOfNow')}
                    </div>

                    {!quote && card.error && (
                      <div className="mt-2 text-xs text-destructive">{card.error}</div>
                    )}
                  </article>
                )
              })}

              {overviewLoading && overviewQuotes.length === 0 && (
                Array.from({ length: 4 }).map((_, index) => (
                  <div key={index} className="h-36 animate-pulse rounded-xl border border-border bg-muted/30" />
                ))
              )}
            </div>
          </div>
        )}

        {activeTab === 'kline' && (
          <div className="space-y-4">
            <div className="grid gap-3 rounded-xl border border-border bg-card p-4 md:grid-cols-[180px_minmax(0,1fr)] xl:grid-cols-[180px_minmax(0,1fr)_auto]">
              <div>
                <label className="mb-1 block text-sm text-muted-foreground">{t('realtime.market')}</label>
                <select
                  value={klineMarket}
                  onChange={(event) => {
                    const nextMarket = event.target.value as QuoteMarket
                    setKlineMarket(nextMarket)
                    const fallback = QUICK_SYMBOLS[nextMarket][0] || ''
                    setKlineSymbolInput(fallback)
                  }}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                >
                  {KLINE_MARKET_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>{t(option.labelKey)}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm text-muted-foreground">{t('page.stockLabel')}</label>
                <input
                  value={klineSymbolInput}
                  onChange={(event) => setKlineSymbolInput(event.target.value)}
                  list="kline-symbol-suggestions"
                  placeholder={t('page.klineSymbolPlaceholder')}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                />
                <datalist id="kline-symbol-suggestions">
                  {klineSuggestions.map((symbol) => (
                    <option key={symbol} value={symbol} />
                  ))}
                </datalist>
              </div>

              <div>
                <label className="mb-1 block text-sm text-muted-foreground">{t('page.historyRangeLabel')}</label>
                <div className="flex flex-wrap gap-1">
                  {YEAR_RANGES.map((years) => (
                    <button
                      key={years}
                      type="button"
                      onClick={() => setHistoryYears(years)}
                      className={`rounded px-3 py-1 text-xs ${historyYears === years ? 'bg-primary text-white' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}
                    >
                      {t('page.historyYears', { years })}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
              <div className="rounded-lg border border-border bg-card p-3">
                <div className="text-xs text-muted-foreground">{t('realtime.lastPrice')}</div>
                <div className="mt-1 text-lg font-semibold text-foreground">{formatPrice(toNumber(klineQuote?.price))}</div>
              </div>
              <div className="rounded-lg border border-border bg-card p-3">
                <div className="text-xs text-muted-foreground">{t('overview.changePercent')}</div>
                <div className={`mt-1 text-lg font-semibold ${quoteChangeClass(toNumber(klineQuote?.change))}`}>
                  {toNumber(klineQuote?.change_percent) !== null
                    ? `${(toNumber(klineQuote?.change_percent) as number).toFixed(2)}%`
                    : '--'}
                </div>
              </div>
              <div className="rounded-lg border border-border bg-card p-3">
                <div className="text-xs text-muted-foreground">{t('overview.high')}</div>
                <div className="mt-1 text-lg font-semibold text-foreground">{formatPrice(toNumber(klineQuote?.high))}</div>
              </div>
              <div className="rounded-lg border border-border bg-card p-3">
                <div className="text-xs text-muted-foreground">{t('overview.low')}</div>
                <div className="mt-1 text-lg font-semibold text-foreground">{formatPrice(toNumber(klineQuote?.low))}</div>
              </div>
              <div className="rounded-lg border border-border bg-card p-3">
                <div className="text-xs text-muted-foreground">{t('overview.volume')}</div>
                <div className="mt-1 text-lg font-semibold text-foreground">
                  {toNumber(klineQuote?.volume) !== null
                    ? (toNumber(klineQuote?.volume) as number).toLocaleString()
                    : '--'}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <label className="flex items-center gap-2 text-xs text-muted-foreground">
                <input type="checkbox" checked={showMA} onChange={(event) => setShowMA(event.target.checked)} className="rounded" />
                {t('page.movingAverage')}
              </label>
              <label className="flex items-center gap-2 text-xs text-muted-foreground">
                <input type="checkbox" checked={showVol} onChange={(event) => setShowVol(event.target.checked)} className="rounded" />
                {t('page.volume')}
              </label>
              <button
                type="button"
                className="ml-auto inline-flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-sm hover:bg-muted"
                onClick={() => {
                  void refetchQuote()
                  void refetchHistory()
                }}
              >
                <RefreshCw size={14} />
                {t('common:refresh')}
              </button>
            </div>

            <div className="rounded-lg border border-border bg-card p-4">
              <CandlestickChart
                dates={klineDates}
                ohlc={klineOhlc}
                volumes={klineVolumes}
                indicators={maIndicators}
                height={500}
                loading={historyLoading || quoteLoading}
              />
            </div>

            {historyError && (
              <p className="text-sm text-destructive">{t('loadFailed')}</p>
            )}
            {!historyLoading && mergedKlineBars.length === 0 && (
              <p className="text-sm text-muted-foreground">{t('dataView.noDataFor', { symbol: debouncedKlineSymbol || '-' })}</p>
            )}
          </div>
        )}

        {activeTab === 'sync' && <SyncStatusPanel />}

        {activeTab === 'calendar' && (
          <p className="py-8 text-center text-muted-foreground">{t('page.empty.calendar')}</p>
        )}

        {activeTab === 'sentiment' && (
          <p className="py-8 text-center text-muted-foreground">{t('page.empty.sentiment')}</p>
        )}
      </TabPanel>
    </div>
  )
}
