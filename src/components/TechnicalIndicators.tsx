import { useQuery } from '@tanstack/react-query'
import { Activity, LineChart } from 'lucide-react'
import { marketDataAPI } from '../lib/api'

interface TechnicalIndicatorsProps {
  symbol: string
  startDate: string
  endDate: string
}

export default function TechnicalIndicators({
  symbol,
  startDate,
  endDate,
}: TechnicalIndicatorsProps) {
  const { data: indicatorsData, isLoading } = useQuery({
    queryKey: ['indicators', symbol, startDate, endDate],
    queryFn: () => marketDataAPI.indicators(symbol, startDate, endDate),
    enabled: !!symbol,
  })

  const indicators = indicatorsData?.data || {}

  if (isLoading) {
    return (
      <div className="bg-card border border-border rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4">Technical Indicators</h3>
        <div className="animate-pulse space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-16 bg-muted rounded" />
          ))}
        </div>
      </div>
    )
  }

  if (Object.keys(indicators).length === 0) {
    return (
      <div className="bg-card border border-border rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4">Technical Indicators</h3>
        <p className="text-muted-foreground text-center py-8">
          No indicator data available
        </p>
      </div>
    )
  }

  return (
    <div className="bg-card border border-border rounded-lg p-6">
      <div className="flex items-center gap-2 mb-4">
        <Activity className="h-5 w-5 text-primary" />
        <h3 className="text-lg font-semibold">Technical Indicators</h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {indicators.sma_20 && (
          <IndicatorCard
            title="SMA (20)"
            value={indicators.sma_20}
            description="20-day Simple Moving Average"
          />
        )}

        {indicators.sma_50 && (
          <IndicatorCard
            title="SMA (50)"
            value={indicators.sma_50}
            description="50-day Simple Moving Average"
          />
        )}

        {indicators.ema_12 && (
          <IndicatorCard
            title="EMA (12)"
            value={indicators.ema_12}
            description="12-day Exponential Moving Average"
          />
        )}

        {indicators.rsi && (
          <IndicatorCard
            title="RSI (14)"
            value={indicators.rsi}
            description="Relative Strength Index"
            badge={
              indicators.rsi > 70
                ? { text: 'Overbought', color: 'text-red-500' }
                : indicators.rsi < 30
                ? { text: 'Oversold', color: 'text-green-500' }
                : { text: 'Neutral', color: 'text-muted-foreground' }
            }
          />
        )}

        {indicators.macd && (
          <IndicatorCard
            title="MACD"
            value={indicators.macd.value}
            description="Moving Average Convergence Divergence"
            extra={`Signal: ${indicators.macd.signal?.toFixed(2) || 'N/A'}`}
          />
        )}

        {indicators.bollinger_bands && (
          <div className="bg-muted/50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <LineChart className="h-4 w-4 text-primary" />
              <span className="font-medium">Bollinger Bands</span>
            </div>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Upper:</span>
                <span className="font-medium">
                  ${indicators.bollinger_bands.upper?.toFixed(2) || 'N/A'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Middle:</span>
                <span className="font-medium">
                  ${indicators.bollinger_bands.middle?.toFixed(2) || 'N/A'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Lower:</span>
                <span className="font-medium">
                  ${indicators.bollinger_bands.lower?.toFixed(2) || 'N/A'}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function IndicatorCard({
  title,
  value,
  description,
  badge,
  extra,
}: {
  title: string
  value: number
  description: string
  badge?: { text: string; color: string }
  extra?: string
}) {
  return (
    <div className="bg-muted/50 rounded-lg p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="font-medium">{title}</span>
        {badge && <span className={`text-xs ${badge.color}`}>{badge.text}</span>}
      </div>
      <div className="text-2xl font-bold mb-1">
        {typeof value === 'number' ? value.toFixed(2) : 'N/A'}
      </div>
      <div className="text-xs text-muted-foreground">{description}</div>
      {extra && <div className="text-xs text-muted-foreground mt-1">{extra}</div>}
    </div>
  )
}
