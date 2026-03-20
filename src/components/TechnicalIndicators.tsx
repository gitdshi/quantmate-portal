import { useQuery } from '@tanstack/react-query'
import { Activity, LineChart } from 'lucide-react'
import { useTranslation } from 'react-i18next'
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
  const { t } = useTranslation(['market', 'common'])
  const { data: indicatorsData, isLoading } = useQuery({
    queryKey: ['indicators', symbol, startDate, endDate],
    queryFn: () => marketDataAPI.indicators(symbol, startDate, endDate),
    enabled: !!symbol,
  })

  const indicators = indicatorsData?.data || {}

  if (isLoading) {
    return (
      <div className="bg-card border border-border rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4">{t('technicalIndicators')}</h3>
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
        <h3 className="text-lg font-semibold mb-4">{t('technicalIndicators')}</h3>
        <p className="text-muted-foreground text-center py-8">
          {t('indicators.noData')}
        </p>
      </div>
    )
  }

  return (
    <div className="bg-card border border-border rounded-lg p-6">
      <div className="flex items-center gap-2 mb-4">
        <Activity className="h-5 w-5 text-primary" />
        <h3 className="text-lg font-semibold">{t('technicalIndicators')}</h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {indicators.sma_20 && (
          <IndicatorCard
            title={t('indicators.sma20')}
            value={indicators.sma_20}
            description={t('indicators.sma20Desc')}
          />
        )}

        {indicators.sma_50 && (
          <IndicatorCard
            title={t('indicators.sma50')}
            value={indicators.sma_50}
            description={t('indicators.sma50Desc')}
          />
        )}

        {indicators.ema_12 && (
          <IndicatorCard
            title={t('indicators.ema12')}
            value={indicators.ema_12}
            description={t('indicators.ema12Desc')}
          />
        )}

        {indicators.rsi && (
          <IndicatorCard
            title={t('indicators.rsi14')}
            value={indicators.rsi}
            description={t('indicators.rsiDesc')}
            badge={
              indicators.rsi > 70
                ? { text: t('indicators.overbought'), color: 'text-red-500' }
                : indicators.rsi < 30
                ? { text: t('indicators.oversold'), color: 'text-green-500' }
                : { text: t('indicators.neutral'), color: 'text-muted-foreground' }
            }
          />
        )}

        {indicators.macd && (
          <IndicatorCard
            title={t('indicators.macd')}
            value={indicators.macd.value}
            description={t('indicators.macdDesc')}
            extra={`Signal: ${indicators.macd.signal?.toFixed(2) || t('common:na')}`}
          />
        )}

        {indicators.bollinger_bands && (
          <div className="bg-muted/50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <LineChart className="h-4 w-4 text-primary" />
              <span className="font-medium">{t('indicators.bollingerBands')}</span>
            </div>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t('indicators.upper')}:</span>
                <span className="font-medium">
                  ${indicators.bollinger_bands.upper?.toFixed(2) || 'N/A'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t('indicators.middle')}:</span>
                <span className="font-medium">
                  ${indicators.bollinger_bands.middle?.toFixed(2) || 'N/A'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t('indicators.lower')}:</span>
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
