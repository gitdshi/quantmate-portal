import { useQuery } from '@tanstack/react-query'
import { Activity, TrendingDown, TrendingUp } from 'lucide-react'
import { marketDataAPI } from '../lib/api'

export default function MarketOverview() {
  const { data: overviewData, isLoading } = useQuery({
    queryKey: ['market-overview'],
    queryFn: () => marketDataAPI.overview(),
    refetchInterval: 60000, // Refresh every minute
  })

  const overview = overviewData?.data || {}

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-card border border-border rounded-lg p-4 animate-pulse">
            <div className="h-4 bg-muted rounded w-24 mb-2" />
            <div className="h-8 bg-muted rounded w-32" />
          </div>
        ))}
      </div>
    )
  }

  const markets = [
    {
      name: 'S&P 500',
      value: overview.sp500?.value || 0,
      change: overview.sp500?.change || 0,
      changePercent: overview.sp500?.changePercent || 0,
    },
    {
      name: 'NASDAQ',
      value: overview.nasdaq?.value || 0,
      change: overview.nasdaq?.change || 0,
      changePercent: overview.nasdaq?.changePercent || 0,
    },
    {
      name: 'DOW JONES',
      value: overview.dow?.value || 0,
      change: overview.dow?.change || 0,
      changePercent: overview.dow?.changePercent || 0,
    },
  ]

  return (
    <div>
      <h2 className="text-lg font-semibold mb-4">Market Overview</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {markets.map((market) => (
          <div key={market.name} className="bg-card border border-border rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">{market.name}</span>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="text-2xl font-bold mb-1">
              {market.value > 0 ? market.value.toLocaleString() : 'N/A'}
            </div>
            {market.value > 0 && (
              <div className={`text-sm flex items-center gap-1 ${
                market.change >= 0 ? 'text-green-500' : 'text-red-500'
              }`}>
                {market.change >= 0 ? (
                  <TrendingUp className="h-3 w-3" />
                ) : (
                  <TrendingDown className="h-3 w-3" />
                )}
                {market.change >= 0 ? '+' : ''}{market.change.toFixed(2)} (
                {market.changePercent.toFixed(2)}%)
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
