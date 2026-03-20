import { useQuery } from '@tanstack/react-query'
import { Activity, AlertTriangle, Shield, Target, TrendingDown } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { api } from '../lib/api'

interface RiskMetrics {
  volatility: {
    daily: number
    monthly: number
    annual: number
  }
  value_at_risk: {
    var_95: number
    var_99: number
    cvar_95: number
  }
  drawdown: {
    current: number
    max: number
    max_duration: number
    recovery_time: number | null
  }
  beta: {
    beta: number
    alpha: number
    r_squared: number
  }
  concentration: {
    top_position_pct: number
    top_3_positions_pct: number
    top_5_positions_pct: number
    herfindahl_index: number
  }
  liquidity: {
    cash_ratio: number
    current_ratio: number
    quick_ratio: number
  }
}

export default function RiskMetrics() {
  const { t } = useTranslation(['portfolio', 'common'])
  const { data, isLoading } = useQuery<RiskMetrics>({
    queryKey: ['risk-metrics'],
    queryFn: async () => {
      const { data } = await api.get('/analytics/risk-metrics')
      return data
    },
    refetchInterval: 30000, // Refetch every 30 seconds
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="text-center text-gray-500 py-8">
        {t('risk.noData')}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Volatility Metrics */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <div className="flex items-center gap-2 mb-4">
          <Activity className="w-5 h-5 text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-900">{t('risk.volatility')}</h3>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="text-sm text-gray-600 mb-1">{t('risk.daily')}</div>
            <div className="text-2xl font-bold text-blue-600">
              {data.volatility.daily.toFixed(2)}%
            </div>
          </div>
          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="text-sm text-gray-600 mb-1">{t('risk.monthly')}</div>
            <div className="text-2xl font-bold text-blue-600">
              {data.volatility.monthly.toFixed(2)}%
            </div>
          </div>
          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="text-sm text-gray-600 mb-1">{t('risk.annual')}</div>
            <div className="text-2xl font-bold text-blue-600">
              {data.volatility.annual.toFixed(2)}%
            </div>
          </div>
        </div>
      </div>

      {/* Value at Risk */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <div className="flex items-center gap-2 mb-4">
          <AlertTriangle className="w-5 h-5 text-orange-600" />
          <h3 className="text-lg font-semibold text-gray-900">{t('risk.valueAtRisk')}</h3>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-orange-50 p-4 rounded-lg">
            <div className="text-sm text-gray-600 mb-1">{t('risk.var95')}</div>
            <div className="text-2xl font-bold text-orange-600">
              {data.value_at_risk.var_95.toFixed(2)}%
            </div>
            <div className="text-xs text-gray-600 mt-1">
              {t('risk.confidence95')}
            </div>
          </div>
          <div className="bg-orange-50 p-4 rounded-lg">
            <div className="text-sm text-gray-600 mb-1">{t('risk.var99')}</div>
            <div className="text-2xl font-bold text-orange-600">
              {data.value_at_risk.var_99.toFixed(2)}%
            </div>
            <div className="text-xs text-gray-600 mt-1">
              {t('risk.confidence99')}
            </div>
          </div>
          <div className="bg-red-50 p-4 rounded-lg">
            <div className="text-sm text-gray-600 mb-1">{t('risk.cvar95')}</div>
            <div className="text-2xl font-bold text-red-600">
              {data.value_at_risk.cvar_95.toFixed(2)}%
            </div>
            <div className="text-xs text-gray-600 mt-1">
              {t('risk.conditionalVar')}
            </div>
          </div>
        </div>
        <div className="mt-3 text-sm text-gray-600">
          {t('risk.varDescription')}
        </div>
      </div>

      {/* Drawdown Analysis */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <div className="flex items-center gap-2 mb-4">
          <TrendingDown className="w-5 h-5 text-red-600" />
          <h3 className="text-lg font-semibold text-gray-900">{t('risk.drawdownAnalysis')}</h3>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-red-50 p-4 rounded-lg">
            <div className="text-sm text-gray-600 mb-1">{t('risk.current')}</div>
            <div className="text-2xl font-bold text-red-600">
              {data.drawdown.current.toFixed(2)}%
            </div>
          </div>
          <div className="bg-red-50 p-4 rounded-lg">
            <div className="text-sm text-gray-600 mb-1">{t('risk.maximum')}</div>
            <div className="text-2xl font-bold text-red-600">
              {data.drawdown.max.toFixed(2)}%
            </div>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="text-sm text-gray-600 mb-1">{t('risk.maxDuration')}</div>
            <div className="text-2xl font-bold text-gray-900">
              {data.drawdown.max_duration}
            </div>
            <div className="text-xs text-gray-600 mt-1">{t('risk.days')}</div>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="text-sm text-gray-600 mb-1">{t('risk.recoveryTime')}</div>
            <div className="text-2xl font-bold text-gray-900">
              {data.drawdown.recovery_time ? data.drawdown.recovery_time : t('common:na')}
            </div>
            {data.drawdown.recovery_time && (
              <div className="text-xs text-gray-600 mt-1">{t('risk.days')}</div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Beta & Alpha */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center gap-2 mb-4">
            <Target className="w-5 h-5 text-purple-600" />
            <h3 className="text-lg font-semibold text-gray-900">{t('risk.marketRisk')}</h3>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-purple-50 rounded-lg">
              <div>
                <div className="text-sm text-gray-600 mb-1">{t('risk.beta')}</div>
                <div className="text-2xl font-bold text-purple-600">
                  {data.beta.beta.toFixed(2)}
                </div>
              </div>
              <div className="text-xs text-gray-600 max-w-xs">
                {data.beta.beta > 1 
                  ? t('risk.moreVolatile') 
                  : data.beta.beta < 1 
                  ? t('risk.lessVolatile') 
                  : t('risk.sameVolatility')}
              </div>
            </div>
            <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg">
              <div>
                <div className="text-sm text-gray-600 mb-1">{t('risk.alpha')}</div>
                <div className="text-2xl font-bold text-green-600">
                  {data.beta.alpha.toFixed(2)}%
                </div>
              </div>
              <div className="text-xs text-gray-600 max-w-xs">
                {data.beta.alpha > 0 
                  ? t('risk.outperforming') 
                  : data.beta.alpha < 0 
                  ? t('risk.underperforming') 
                  : t('risk.matchingMarket')}
              </div>
            </div>
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <div className="text-sm text-gray-600 mb-1">{t('risk.rSquared')}</div>
                <div className="text-2xl font-bold text-gray-900">
                  {data.beta.r_squared.toFixed(2)}
                </div>
              </div>
              <div className="text-xs text-gray-600 max-w-xs">
                {data.beta.r_squared > 0.85 
                  ? t('risk.highlyCorrelated') 
                  : data.beta.r_squared > 0.7 
                  ? t('risk.moderatelyCorrelated') 
                  : t('risk.lowCorrelation')}
              </div>
            </div>
          </div>
        </div>

        {/* Concentration Risk */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center gap-2 mb-4">
            <Shield className="w-5 h-5 text-indigo-600" />
            <h3 className="text-lg font-semibold text-gray-900">{t('risk.concentrationRisk')}</h3>
          </div>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-600">{t('risk.topPosition')}</span>
                <span className="font-medium text-gray-900">
                  {data.concentration.top_position_pct.toFixed(1)}%
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-indigo-600 h-2 rounded-full"
                  style={{ width: `${data.concentration.top_position_pct}%` }}
                />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-600">{t('risk.top3Positions')}</span>
                <span className="font-medium text-gray-900">
                  {data.concentration.top_3_positions_pct.toFixed(1)}%
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-indigo-600 h-2 rounded-full"
                  style={{ width: `${data.concentration.top_3_positions_pct}%` }}
                />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-600">{t('risk.top5Positions')}</span>
                <span className="font-medium text-gray-900">
                  {data.concentration.top_5_positions_pct.toFixed(1)}%
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-indigo-600 h-2 rounded-full"
                  style={{ width: `${data.concentration.top_5_positions_pct}%` }}
                />
              </div>
            </div>
            <div className="pt-3 border-t border-gray-200">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">{t('risk.herfindahlIndex')}</span>
                <span className="font-medium text-gray-900">
                  {data.concentration.herfindahl_index.toFixed(4)}
                </span>
              </div>
              <div className="text-xs text-gray-600 mt-1">
                {data.concentration.herfindahl_index < 0.15 
                  ? t('risk.wellDiversified') 
                  : data.concentration.herfindahl_index < 0.25 
                  ? t('risk.moderatelyConcentrated') 
                  : t('risk.highlyConcentrated')}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Liquidity Metrics */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <div className="flex items-center gap-2 mb-4">
          <Activity className="w-5 h-5 text-teal-600" />
          <h3 className="text-lg font-semibold text-gray-900">{t('risk.liquidityRatios')}</h3>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-teal-50 p-4 rounded-lg">
            <div className="text-sm text-gray-600 mb-1">{t('risk.cashRatio')}</div>
            <div className="text-2xl font-bold text-teal-600">
              {data.liquidity.cash_ratio.toFixed(2)}
            </div>
            <div className="text-xs text-gray-600 mt-1">
              {data.liquidity.cash_ratio > 0.2 ? t('risk.healthy') : t('risk.low')}
            </div>
          </div>
          <div className="bg-teal-50 p-4 rounded-lg">
            <div className="text-sm text-gray-600 mb-1">{t('risk.currentRatio')}</div>
            <div className="text-2xl font-bold text-teal-600">
              {data.liquidity.current_ratio.toFixed(2)}
            </div>
            <div className="text-xs text-gray-600 mt-1">
              {data.liquidity.current_ratio > 1.5 ? t('risk.healthy') : t('risk.low')}
            </div>
          </div>
          <div className="bg-teal-50 p-4 rounded-lg">
            <div className="text-sm text-gray-600 mb-1">{t('risk.quickRatio')}</div>
            <div className="text-2xl font-bold text-teal-600">
              {data.liquidity.quick_ratio.toFixed(2)}
            </div>
            <div className="text-xs text-gray-600 mt-1">
              {data.liquidity.quick_ratio > 1.0 ? t('risk.healthy') : t('risk.low')}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
