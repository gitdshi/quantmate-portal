import { useQuery } from '@tanstack/react-query'
import { Loader, TrendingDown, TrendingUp } from 'lucide-react'
import { useState } from 'react'
import { marketDataAPI } from '../lib/api'

interface MarketDataViewProps {
  symbol: string
}

export default function MarketDataView({ symbol }: MarketDataViewProps) {
  const [startDate, setStartDate] = useState(() => {
    const date = new Date()
    date.setMonth(date.getMonth() - 1)
    return date.toISOString().split('T')[0]
  })
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0])

  const { data: historyData, isLoading } = useQuery({
    queryKey: ['market-data', symbol, startDate, endDate],
    queryFn: () => marketDataAPI.history(symbol, startDate, endDate),
    enabled: !!symbol,
  })

  const history = historyData?.data || []
  const getDateValue = (row: { date?: string; datetime?: string }) => row.date || row.datetime || ''

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!history.length) {
    return (
      <div className="bg-card border border-border rounded-lg p-8 text-center">
        <p className="text-muted-foreground">No data available for {symbol}</p>
      </div>
    )
  }

  // Calculate summary stats
  const latestPrice = history[history.length - 1]?.close || 0
  const firstPrice = history[0]?.close || 0
  const priceChange = latestPrice - firstPrice
  const priceChangePercent = ((priceChange / firstPrice) * 100).toFixed(2)
  const highPrice = Math.max(...history.map((d: { high: number }) => d.high || 0))
  const lowPrice = Math.min(...history.map((d: { low: number }) => d.low || 0))
  const avgVolume = history.reduce((sum: number, d: { volume: number }) => sum + (d.volume || 0), 0) / history.length

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="text-sm text-muted-foreground mb-1">Current Price</div>
          <div className="text-2xl font-bold">${latestPrice.toFixed(2)}</div>
          <div className={`text-sm flex items-center gap-1 mt-1 ${
            priceChange >= 0 ? 'text-green-500' : 'text-red-500'
          }`}>
            {priceChange >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            {priceChange >= 0 ? '+' : ''}{priceChange.toFixed(2)} ({priceChangePercent}%)
          </div>
        </div>

        <div className="bg-card border border-border rounded-lg p-4">
          <div className="text-sm text-muted-foreground mb-1">High</div>
          <div className="text-2xl font-bold">${highPrice.toFixed(2)}</div>
        </div>

        <div className="bg-card border border-border rounded-lg p-4">
          <div className="text-sm text-muted-foreground mb-1">Low</div>
          <div className="text-2xl font-bold">${lowPrice.toFixed(2)}</div>
        </div>

        <div className="bg-card border border-border rounded-lg p-4">
          <div className="text-sm text-muted-foreground mb-1">Avg Volume</div>
          <div className="text-2xl font-bold">{(avgVolume / 1000000).toFixed(2)}M</div>
        </div>
      </div>

      {/* Date Range Selector */}
      <div className="flex items-center gap-3">
        <div>
          <label className="block text-sm font-medium mb-1">Start Date</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="px-3 py-2 border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">End Date</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="px-3 py-2 border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
      </div>

      {/* Simple Chart Visualization */}
      <div className="bg-card border border-border rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4">Price Chart</h3>
        <div className="h-64 flex items-end gap-1">
          {history.slice(-30).map((dataPoint: { date?: string; datetime?: string; close: number }, index: number) => {
            const height = ((dataPoint.close - lowPrice) / (highPrice - lowPrice)) * 100
            return (
              <div
                key={index}
                className="flex-1 bg-primary hover:bg-primary/80 transition-colors relative group cursor-pointer"
                style={{ height: `${height}%`, minHeight: '2px' }}
              >
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block bg-background border border-border rounded px-2 py-1 text-xs whitespace-nowrap z-10">
                  <div className="font-medium">${dataPoint.close.toFixed(2)}</div>
                  <div className="text-muted-foreground">{new Date(getDateValue(dataPoint)).toLocaleDateString()}</div>
                </div>
              </div>
            )
          })}
        </div>
        <div className="text-xs text-muted-foreground text-center mt-2">
          Last 30 trading days
        </div>
      </div>

      {/* Data Table */}
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <h3 className="text-lg font-semibold p-4 border-b border-border">Historical Data</h3>
        <div className="overflow-x-auto max-h-96 overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted sticky top-0">
              <tr>
                <th className="text-left p-3">Date</th>
                <th className="text-right p-3">Open</th>
                <th className="text-right p-3">High</th>
                <th className="text-right p-3">Low</th>
                <th className="text-right p-3">Close</th>
                <th className="text-right p-3">Volume</th>
              </tr>
            </thead>
            <tbody>
              {history.slice().reverse().map((row: {
                date?: string
                datetime?: string
                open: number
                high: number
                low: number
                close: number
                volume: number
              }, index: number) => (
                <tr key={index} className="border-t border-border hover:bg-muted/50">
                  <td className="p-3">{new Date(getDateValue(row)).toLocaleDateString()}</td>
                  <td className="p-3 text-right">${row.open.toFixed(2)}</td>
                  <td className="p-3 text-right">${row.high.toFixed(2)}</td>
                  <td className="p-3 text-right">${row.low.toFixed(2)}</td>
                  <td className="p-3 text-right font-medium">${row.close.toFixed(2)}</td>
                  <td className="p-3 text-right">{(row.volume / 1000000).toFixed(2)}M</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
