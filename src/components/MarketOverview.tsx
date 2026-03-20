import { useQuery } from '@tanstack/react-query'
import { Activity, TrendingDown, TrendingUp } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { marketDataAPI } from '../lib/api'

export default function MarketOverview() {
  const { t } = useTranslation(['market', 'common'])
  const { data: overviewData, isLoading } = useQuery({
    queryKey: ['market-overview'],
    queryFn: () => marketDataAPI.overview(),
    refetchInterval: 60000, // Refresh every minute
  })

  const overview = overviewData?.data?.indexes || {}

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
      name: overview.csi300?.display_name || 'CSI 300',
      value: overview.csi300?.price || 0,
      change: overview.csi300?.change || 0,
      changePercent: overview.csi300?.change_percent || 0,
    },
    {
      name: overview.sse?.display_name || 'SSE Composite',
      value: overview.sse?.price || 0,
      change: overview.sse?.change || 0,
      changePercent: overview.sse?.change_percent || 0,
    },
    {
      name: overview.szse?.display_name || 'SZSE Component',
      value: overview.szse?.price || 0,
      change: overview.szse?.change || 0,
      changePercent: overview.szse?.change_percent || 0,
    },
    {
      name: overview.chinext?.display_name || 'ChiNext',
      value: overview.chinext?.price || 0,
      change: overview.chinext?.change || 0,
      changePercent: overview.chinext?.change_percent || 0,
    },
  ]

  return (
    <div>
      <h2 className="text-lg font-semibold mb-4">{t('overview.title')}</h2>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {markets.map((market) => (
          <div key={market.name} className="bg-card border border-border rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">{market.name}</span>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="text-2xl font-bold mb-1">
              {market.value > 0 ? market.value.toLocaleString() : t('common:na')}
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
