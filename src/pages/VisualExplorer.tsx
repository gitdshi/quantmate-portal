import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  BarChart3, Loader2, RefreshCw, Search, TrendingUp
} from 'lucide-react'
import { marketDataAPI } from '../lib/api'

type ChartData = { date: string; close: number; volume: number }

export default function VisualExplorer() {
  const { t } = useTranslation(['social', 'common'])
  const [symbol, setSymbol] = useState('')
  const [startDate, setStartDate] = useState('2023-01-01')
  const [endDate, setEndDate] = useState('2024-01-01')
  const [data, setData] = useState<ChartData[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [stats, setStats] = useState<Record<string, number | string>>({})

  const fetchData = useCallback(async () => {
    if (!symbol.trim()) return
    setLoading(true)
    setError(null)
    try {
      const { data: res } = await marketDataAPI.history(symbol, startDate, endDate)
      const rows = (res as any).data || res || []
      setData(rows.map((r: any) => ({
        date: r.trade_date || r.date,
        close: parseFloat(r.close),
        volume: parseInt(r.vol || r.volume || '0'),
      })))
      if (rows.length > 0) {
        const closes = rows.map((r: any) => parseFloat(r.close))
        const first = closes[0]
        const last = closes[closes.length - 1]
        const max = Math.max(...closes)
        const min = Math.min(...closes)
        const totalReturn = ((last - first) / first * 100).toFixed(2)
        setStats({
          'statDays': rows.length,
          'statStartPrice': first.toFixed(2),
          'statEndPrice': last.toFixed(2),
          'statHigh': max.toFixed(2),
          'statLow': min.toFixed(2),
          'statReturn': `${totalReturn}%`,
        })
      }
    } catch {
      setError(t('visualExplorer.loadFailed'))
    } finally {
      setLoading(false)
    }
  }, [symbol, startDate, endDate])

  const maxClose = data.length > 0 ? Math.max(...data.map(d => d.close)) : 0
  const minClose = data.length > 0 ? Math.min(...data.map(d => d.close)) : 0
  const range = maxClose - minClose || 1

  return (
    <div className="p-6" data-testid="visual-explorer-page">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <BarChart3 className="h-7 w-7" /> {t('visualExplorer.title')}
        </h1>
      </div>

      {/* Search Controls */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
        <div className="flex flex-wrap gap-3 items-end">
          <div>
            <label className="block text-xs text-gray-500 mb-1">{t('common:symbol')}</label>
            <input type="text" value={symbol} onChange={e => setSymbol(e.target.value)}
              placeholder={t('visualExplorer.symbolPlaceholder')} className="border border-gray-300 rounded px-3 py-1.5 text-sm w-40" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">{t('visualExplorer.start')}</label>
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
              className="border border-gray-300 rounded px-3 py-1.5 text-sm" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">{t('visualExplorer.end')}</label>
            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
              className="border border-gray-300 rounded px-3 py-1.5 text-sm" />
          </div>
          <button onClick={fetchData} disabled={loading || !symbol.trim()}
            className="flex items-center gap-1 px-4 py-1.5 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 disabled:opacity-50">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            {t('visualExplorer.load')}
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 px-3 py-2 bg-red-50 border border-red-200 rounded text-sm text-red-700">{error}</div>
      )}

      {/* Stats */}
      {Object.keys(stats).length > 0 && (
        <div className="grid grid-cols-3 md:grid-cols-6 gap-3 mb-6">
          {Object.entries(stats).map(([key, val]) => (
            <div key={key} className="bg-white rounded-lg border border-gray-200 p-3 text-center">
              <p className="text-xs text-gray-500">{t(`visualExplorer.${key}`)}</p>
              <p className="text-lg font-semibold text-gray-900">{val}</p>
            </div>
          ))}
        </div>
      )}

      {/* Simple SVG Chart */}
      {data.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <h3 className="font-semibold text-sm text-gray-700 mb-3 flex items-center gap-1">
            <TrendingUp className="h-4 w-4" /> {t('visualExplorer.priceChart')} — {symbol}
          </h3>
          <div className="overflow-x-auto">
            <svg viewBox={`0 0 ${Math.max(data.length, 100)} 200`} className="w-full h-64" preserveAspectRatio="none">
              {/* Price line */}
              <polyline
                fill="none"
                stroke="hsl(var(--primary, 221 83% 53%))"
                strokeWidth="1.5"
                points={data.map((d, i) => `${(i / (data.length - 1)) * Math.max(data.length, 100)},${200 - ((d.close - minClose) / range) * 180 - 10}`).join(' ')}
              />
              {/* Area fill */}
              <polygon
                fill="hsl(var(--primary, 221 83% 53%) / 0.1)"
                points={[
                  `0,200`,
                  ...data.map((d, i) => `${(i / (data.length - 1)) * Math.max(data.length, 100)},${200 - ((d.close - minClose) / range) * 180 - 10}`),
                  `${Math.max(data.length, 100)},200`,
                ].join(' ')}
              />
            </svg>
          </div>
          <div className="flex justify-between text-xs text-gray-400 mt-1">
            <span>{data[0]?.date}</span>
            <span>{data[data.length - 1]?.date}</span>
          </div>
        </div>
      )}

      {!loading && data.length === 0 && !error && (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center text-gray-400">
          <BarChart3 className="h-10 w-10 mx-auto mb-3" />
          <p>{t('visualExplorer.emptyState')}</p>
        </div>
      )}
    </div>
  )
}
