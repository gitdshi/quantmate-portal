import { useQuery } from '@tanstack/react-query'
import { Loader, TrendingDown, TrendingUp } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { marketDataAPI } from '../lib/api'

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

const MARKET_OPTIONS = [
  { value: 'CN', label: 'CN A-shares' },
  { value: 'HK', label: 'HK stocks (delayed)' },
  { value: 'US', label: 'US stocks (delayed)' },
  { value: 'FUTURES', label: 'Futures (CN)' },
  { value: 'FX', label: 'FX' },
  { value: 'CRYPTO', label: 'Crypto' },
]

function inferMarketFromSymbol(symbol: string): string | null {
  const upper = symbol.toUpperCase()
  if (upper.endsWith('.HK')) return 'HK'
  if (upper.endsWith('.US') || upper.endsWith('.NASDAQ') || upper.endsWith('.NYSE')) return 'US'
  if (upper.endsWith('.SH') || upper.endsWith('.SZ') || upper.endsWith('.SSE') || upper.endsWith('.SZSE')) return 'CN'
  return null
}

export default function RealtimeQuotePanel({ defaultSymbol }: { defaultSymbol?: string }) {
  const [market, setMarket] = useState<string>('CN')
  const [symbol, setSymbol] = useState<string>('')

  useEffect(() => {
    if (!defaultSymbol) return
    setSymbol(defaultSymbol)
    const inferred = inferMarketFromSymbol(defaultSymbol)
    if (inferred) setMarket(inferred)
  }, [defaultSymbol])

  const {
    data,
    isFetching,
    error,
    refetch,
  } = useQuery({
    queryKey: ['realtime-quote', market, symbol],
    queryFn: () => marketDataAPI.quote({ symbol, market }),
    enabled: !!symbol,
    refetchInterval: 15000,
  })

  const quote: Quote | undefined = data?.data
  const {
    data: seriesData,
  } = useQuery({
    queryKey: ['realtime-quote-series', market, symbol],
    queryFn: () => marketDataAPI.quoteSeries({ symbol, market }),
    enabled: !!symbol,
    refetchInterval: 15000,
  })

  const series = (seriesData?.data?.points || []) as Array<{ ts: number; price: number }>

  const changeClass = useMemo(() => {
    if (!quote || typeof quote.change !== 'number') return 'text-muted-foreground'
    return quote.change >= 0 ? 'text-green-500' : 'text-red-500'
  }, [quote])

  const errorMessage = useMemo(() => {
    const anyError: any = error
    return anyError?.response?.data?.error?.message || anyError?.message || 'Failed to fetch quote'
  }, [error])

  const sparklinePath = useMemo(() => {
    if (!series || series.length < 2) return ''
    const prices = series.map((p) => p.price)
    const min = Math.min(...prices)
    const max = Math.max(...prices)
    const range = max - min || 1
    return series
      .map((p, idx) => {
        const x = (idx / (series.length - 1)) * 100
        const y = 40 - ((p.price - min) / range) * 40
        return `${idx === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`
      })
      .join(' ')
  }, [series])

  return (
    <div className="bg-card border border-border rounded-lg p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Real-time Quote</h2>
          <p className="text-xs text-muted-foreground">
            Free public sources via AkShare; HK/US quotes may be delayed.
          </p>
        </div>
        <button
          type="button"
          onClick={() => refetch()}
          className="px-3 py-1.5 text-xs rounded-md border border-border hover:bg-muted transition-colors"
          disabled={!symbol || isFetching}
        >
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div>
          <label className="block text-xs font-medium mb-1">Market</label>
          <select
            className="w-full px-3 py-2 border border-input rounded-md bg-background"
            value={market}
            onChange={(e) => setMarket(e.target.value)}
          >
            {MARKET_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
        <div className="md:col-span-2">
          <label className="block text-xs font-medium mb-1">Symbol</label>
          <input
            value={symbol}
            onChange={(e) => setSymbol(e.target.value)}
            placeholder="000001 / AAPL / BTCUSD / USDCNH / RB2409"
            className="w-full px-3 py-2 border border-input rounded-md bg-background"
          />
        </div>
      </div>

      {!symbol ? (
        <div className="text-sm text-muted-foreground">Enter a symbol to fetch a quote.</div>
      ) : error ? (
        <div className="text-sm text-red-500">{errorMessage}</div>
      ) : !quote && isFetching ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader className="h-4 w-4 animate-spin" />
          Loading quote...
        </div>
      ) : quote ? (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-background border border-border rounded-md p-3">
              <div className="text-xs text-muted-foreground mb-1">Price</div>
              <div className="text-xl font-semibold">
                {typeof quote.price === 'number' ? quote.price.toFixed(4) : 'N/A'}
                {quote.currency ? <span className="text-xs text-muted-foreground ml-1">{quote.currency}</span> : null}
              </div>
              <div className={`text-xs flex items-center gap-1 mt-1 ${changeClass}`}>
                {typeof quote.change === 'number' ? (
                  <>
                    {quote.change >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                    {quote.change >= 0 ? '+' : ''}{quote.change.toFixed(4)}
                    {typeof quote.change_percent === 'number'
                      ? ` (${quote.change_percent.toFixed(2)}%)`
                      : ''}
                  </>
                ) : (
                  <span>Change N/A</span>
                )}
              </div>
            </div>

            <div className="bg-background border border-border rounded-md p-3">
              <div className="text-xs text-muted-foreground mb-1">Range</div>
              <div className="text-sm">
                <div>High: {typeof quote.high === 'number' ? quote.high.toFixed(4) : 'N/A'}</div>
                <div>Low: {typeof quote.low === 'number' ? quote.low.toFixed(4) : 'N/A'}</div>
                <div>Open: {typeof quote.open === 'number' ? quote.open.toFixed(4) : 'N/A'}</div>
              </div>
            </div>

            <div className="bg-background border border-border rounded-md p-3">
              <div className="text-xs text-muted-foreground mb-1">Volume</div>
              <div className="text-sm">
                <div>Volume: {typeof quote.volume === 'number' ? quote.volume.toLocaleString() : 'N/A'}</div>
                <div>Amount: {typeof quote.amount === 'number' ? quote.amount.toLocaleString() : 'N/A'}</div>
              </div>
            </div>

            <div className="bg-background border border-border rounded-md p-3">
              <div className="text-xs text-muted-foreground mb-1">Source</div>
              <div className="text-sm">
                <div>{quote.source || 'Unknown'}</div>
                <div className="text-xs text-muted-foreground mt-1">
                  {quote.asof ? `As of ${quote.asof}` : 'As of now'}
                </div>
                {quote.delayed ? (
                  <div className="text-xs text-amber-600 mt-1">Delayed</div>
                ) : null}
              </div>
            </div>
          </div>

          <div className="bg-background border border-border rounded-md p-3">
            <div className="text-xs text-muted-foreground mb-2">Intraday (last 24h)</div>
            {series.length > 1 && sparklinePath ? (
              <svg viewBox="0 0 100 40" className="w-full h-20" preserveAspectRatio="none">
                <path d={sparklinePath} fill="none" stroke="currentColor" strokeWidth="1.5" />
              </svg>
            ) : (
              <div className="text-xs text-muted-foreground">No cached series yet.</div>
            )}
          </div>
        </div>
      ) : (
        <div className="text-sm text-muted-foreground">No quote available.</div>
      )}
    </div>
  )
}
