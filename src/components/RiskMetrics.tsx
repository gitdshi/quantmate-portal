import { useQuery } from '@tanstack/react-query'
import { Activity, AlertTriangle, Shield, Target, TrendingDown } from 'lucide-react'
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
        No risk metrics available
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Volatility Metrics */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <div className="flex items-center gap-2 mb-4">
          <Activity className="w-5 h-5 text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-900">Volatility</h3>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="text-sm text-gray-600 mb-1">Daily</div>
            <div className="text-2xl font-bold text-blue-600">
              {data.volatility.daily.toFixed(2)}%
            </div>
          </div>
          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="text-sm text-gray-600 mb-1">Monthly</div>
            <div className="text-2xl font-bold text-blue-600">
              {data.volatility.monthly.toFixed(2)}%
            </div>
          </div>
          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="text-sm text-gray-600 mb-1">Annual</div>
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
          <h3 className="text-lg font-semibold text-gray-900">Value at Risk</h3>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-orange-50 p-4 rounded-lg">
            <div className="text-sm text-gray-600 mb-1">VaR 95%</div>
            <div className="text-2xl font-bold text-orange-600">
              {data.value_at_risk.var_95.toFixed(2)}%
            </div>
            <div className="text-xs text-gray-600 mt-1">
              95% confidence
            </div>
          </div>
          <div className="bg-orange-50 p-4 rounded-lg">
            <div className="text-sm text-gray-600 mb-1">VaR 99%</div>
            <div className="text-2xl font-bold text-orange-600">
              {data.value_at_risk.var_99.toFixed(2)}%
            </div>
            <div className="text-xs text-gray-600 mt-1">
              99% confidence
            </div>
          </div>
          <div className="bg-red-50 p-4 rounded-lg">
            <div className="text-sm text-gray-600 mb-1">CVaR 95%</div>
            <div className="text-2xl font-bold text-red-600">
              {data.value_at_risk.cvar_95.toFixed(2)}%
            </div>
            <div className="text-xs text-gray-600 mt-1">
              Conditional VaR
            </div>
          </div>
        </div>
        <div className="mt-3 text-sm text-gray-600">
          Value at Risk represents the maximum expected loss over a given time period at a specified confidence level.
        </div>
      </div>

      {/* Drawdown Analysis */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <div className="flex items-center gap-2 mb-4">
          <TrendingDown className="w-5 h-5 text-red-600" />
          <h3 className="text-lg font-semibold text-gray-900">Drawdown Analysis</h3>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-red-50 p-4 rounded-lg">
            <div className="text-sm text-gray-600 mb-1">Current</div>
            <div className="text-2xl font-bold text-red-600">
              {data.drawdown.current.toFixed(2)}%
            </div>
          </div>
          <div className="bg-red-50 p-4 rounded-lg">
            <div className="text-sm text-gray-600 mb-1">Maximum</div>
            <div className="text-2xl font-bold text-red-600">
              {data.drawdown.max.toFixed(2)}%
            </div>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="text-sm text-gray-600 mb-1">Max Duration</div>
            <div className="text-2xl font-bold text-gray-900">
              {data.drawdown.max_duration}
            </div>
            <div className="text-xs text-gray-600 mt-1">days</div>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="text-sm text-gray-600 mb-1">Recovery Time</div>
            <div className="text-2xl font-bold text-gray-900">
              {data.drawdown.recovery_time ? data.drawdown.recovery_time : 'N/A'}
            </div>
            {data.drawdown.recovery_time && (
              <div className="text-xs text-gray-600 mt-1">days</div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Beta & Alpha */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center gap-2 mb-4">
            <Target className="w-5 h-5 text-purple-600" />
            <h3 className="text-lg font-semibold text-gray-900">Market Risk</h3>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-purple-50 rounded-lg">
              <div>
                <div className="text-sm text-gray-600 mb-1">Beta</div>
                <div className="text-2xl font-bold text-purple-600">
                  {data.beta.beta.toFixed(2)}
                </div>
              </div>
              <div className="text-xs text-gray-600 max-w-xs">
                {data.beta.beta > 1 
                  ? 'More volatile than market' 
                  : data.beta.beta < 1 
                  ? 'Less volatile than market' 
                  : 'Same volatility as market'}
              </div>
            </div>
            <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg">
              <div>
                <div className="text-sm text-gray-600 mb-1">Alpha</div>
                <div className="text-2xl font-bold text-green-600">
                  {data.beta.alpha.toFixed(2)}%
                </div>
              </div>
              <div className="text-xs text-gray-600 max-w-xs">
                {data.beta.alpha > 0 
                  ? 'Outperforming market' 
                  : data.beta.alpha < 0 
                  ? 'Underperforming market' 
                  : 'Matching market'}
              </div>
            </div>
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <div className="text-sm text-gray-600 mb-1">R-Squared</div>
                <div className="text-2xl font-bold text-gray-900">
                  {data.beta.r_squared.toFixed(2)}
                </div>
              </div>
              <div className="text-xs text-gray-600 max-w-xs">
                {data.beta.r_squared > 0.85 
                  ? 'Highly correlated' 
                  : data.beta.r_squared > 0.7 
                  ? 'Moderately correlated' 
                  : 'Low correlation'}
              </div>
            </div>
          </div>
        </div>

        {/* Concentration Risk */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center gap-2 mb-4">
            <Shield className="w-5 h-5 text-indigo-600" />
            <h3 className="text-lg font-semibold text-gray-900">Concentration Risk</h3>
          </div>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-600">Top Position</span>
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
                <span className="text-gray-600">Top 3 Positions</span>
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
                <span className="text-gray-600">Top 5 Positions</span>
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
                <span className="text-gray-600">Herfindahl Index</span>
                <span className="font-medium text-gray-900">
                  {data.concentration.herfindahl_index.toFixed(4)}
                </span>
              </div>
              <div className="text-xs text-gray-600 mt-1">
                {data.concentration.herfindahl_index < 0.15 
                  ? 'Well diversified' 
                  : data.concentration.herfindahl_index < 0.25 
                  ? 'Moderately concentrated' 
                  : 'Highly concentrated'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Liquidity Metrics */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <div className="flex items-center gap-2 mb-4">
          <Activity className="w-5 h-5 text-teal-600" />
          <h3 className="text-lg font-semibold text-gray-900">Liquidity Ratios</h3>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-teal-50 p-4 rounded-lg">
            <div className="text-sm text-gray-600 mb-1">Cash Ratio</div>
            <div className="text-2xl font-bold text-teal-600">
              {data.liquidity.cash_ratio.toFixed(2)}
            </div>
            <div className="text-xs text-gray-600 mt-1">
              {data.liquidity.cash_ratio > 0.2 ? 'Healthy' : 'Low'}
            </div>
          </div>
          <div className="bg-teal-50 p-4 rounded-lg">
            <div className="text-sm text-gray-600 mb-1">Current Ratio</div>
            <div className="text-2xl font-bold text-teal-600">
              {data.liquidity.current_ratio.toFixed(2)}
            </div>
            <div className="text-xs text-gray-600 mt-1">
              {data.liquidity.current_ratio > 1.5 ? 'Healthy' : 'Low'}
            </div>
          </div>
          <div className="bg-teal-50 p-4 rounded-lg">
            <div className="text-sm text-gray-600 mb-1">Quick Ratio</div>
            <div className="text-2xl font-bold text-teal-600">
              {data.liquidity.quick_ratio.toFixed(2)}
            </div>
            <div className="text-xs text-gray-600 mt-1">
              {data.liquidity.quick_ratio > 1.0 ? 'Healthy' : 'Low'}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
