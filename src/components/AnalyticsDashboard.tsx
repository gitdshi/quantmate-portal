import { useQuery } from '@tanstack/react-query'
import { Activity, BarChart3, PieChart, TrendingDown, TrendingUp } from 'lucide-react'
import { api } from '../lib/api'

interface AnalyticsData {
  portfolio_stats: {
    total_value: number
    total_pnl: number
    total_pnl_pct: number
    daily_pnl: number
    daily_pnl_pct: number
    positions_count: number
  }
  performance_history: Array<{
    date: string
    portfolio_value: number
    daily_return: number
    cumulative_return: number
  }>
  strategy_performance: Array<{
    strategy_name: string
    total_trades: number
    winning_rate: number
    total_return: number
    sharpe_ratio: number
  }>
  sector_allocation: Array<{
    sector: string
    value: number
    percentage: number
  }>
  risk_metrics: {
    volatility: number
    max_drawdown: number
    var_95: number
    beta: number
    alpha: number
  }
}

export default function AnalyticsDashboard() {
  const { data, isLoading } = useQuery<AnalyticsData>({
    queryKey: ['analytics'],
    queryFn: async () => {
      const { data } = await api.get('/api/analytics/dashboard')
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
        No analytics data available
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Portfolio Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm text-gray-600">Total Value</div>
            <BarChart3 className="w-5 h-5 text-blue-600" />
          </div>
          <div className="text-2xl font-bold text-gray-900">
            ${data.portfolio_stats.total_value.toLocaleString()}
          </div>
          <div className={`text-sm mt-1 flex items-center gap-1 ${data.portfolio_stats.total_pnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {data.portfolio_stats.total_pnl >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
            {data.portfolio_stats.total_pnl_pct.toFixed(2)}%
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm text-gray-600">Daily P&L</div>
            <Activity className="w-5 h-5 text-purple-600" />
          </div>
          <div className={`text-2xl font-bold ${data.portfolio_stats.daily_pnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            ${data.portfolio_stats.daily_pnl.toLocaleString()}
          </div>
          <div className={`text-sm mt-1 ${data.portfolio_stats.daily_pnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {data.portfolio_stats.daily_pnl_pct.toFixed(2)}%
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm text-gray-600">Total P&L</div>
            <TrendingUp className="w-5 h-5 text-green-600" />
          </div>
          <div className={`text-2xl font-bold ${data.portfolio_stats.total_pnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            ${data.portfolio_stats.total_pnl.toLocaleString()}
          </div>
          <div className="text-sm text-gray-600 mt-1">
            All time
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm text-gray-600">Open Positions</div>
            <PieChart className="w-5 h-5 text-orange-600" />
          </div>
          <div className="text-2xl font-bold text-gray-900">
            {data.portfolio_stats.positions_count}
          </div>
          <div className="text-sm text-gray-600 mt-1">
            Active trades
          </div>
        </div>
      </div>

      {/* Performance Chart */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Portfolio Performance</h3>
        <div className="h-64 flex items-end justify-between gap-1">
          {data.performance_history.slice(-30).map((item, idx) => {
            const maxValue = Math.max(...data.performance_history.slice(-30).map(d => d.portfolio_value))
            const height = (item.portfolio_value / maxValue) * 100
            return (
              <div
                key={idx}
                className="flex-1 bg-blue-500 rounded-t hover:bg-blue-600 transition-colors cursor-pointer relative group"
                style={{ height: `${height}%`, minHeight: '2px' }}
                title={`${item.date}: $${item.portfolio_value.toLocaleString()}`}
              >
                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                  {item.date}
                  <br />
                  ${item.portfolio_value.toLocaleString()}
                  <br />
                  {item.cumulative_return.toFixed(2)}%
                </div>
              </div>
            )
          })}
        </div>
        <div className="mt-2 flex justify-between text-xs text-gray-500">
          <span>{data.performance_history[Math.max(0, data.performance_history.length - 30)]?.date}</span>
          <span>{data.performance_history[data.performance_history.length - 1]?.date}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Strategy Performance */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Strategy Performance</h3>
          <div className="space-y-3">
            {data.strategy_performance.map((strategy, idx) => (
              <div key={idx} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-gray-900">{strategy.strategy_name}</span>
                  <span className={`text-sm font-medium ${strategy.total_return >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {strategy.total_return.toFixed(2)}%
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-3 text-sm">
                  <div>
                    <div className="text-gray-600 text-xs">Trades</div>
                    <div className="font-medium">{strategy.total_trades}</div>
                  </div>
                  <div>
                    <div className="text-gray-600 text-xs">Win Rate</div>
                    <div className="font-medium">{strategy.winning_rate.toFixed(1)}%</div>
                  </div>
                  <div>
                    <div className="text-gray-600 text-xs">Sharpe</div>
                    <div className="font-medium">{strategy.sharpe_ratio.toFixed(2)}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Sector Allocation */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Sector Allocation</h3>
          <div className="space-y-3">
            {data.sector_allocation.map((sector, idx) => (
              <div key={idx}>
                <div className="flex items-center justify-between mb-1 text-sm">
                  <span className="text-gray-700">{sector.sector}</span>
                  <span className="font-medium text-gray-900">
                    ${sector.value.toLocaleString()} ({sector.percentage.toFixed(1)}%)
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${sector.percentage}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Risk Metrics */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Risk Metrics</h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div>
            <div className="text-sm text-gray-600 mb-1">Volatility</div>
            <div className="text-xl font-bold text-gray-900">
              {data.risk_metrics.volatility.toFixed(2)}%
            </div>
          </div>
          <div>
            <div className="text-sm text-gray-600 mb-1">Max Drawdown</div>
            <div className="text-xl font-bold text-red-600">
              {data.risk_metrics.max_drawdown.toFixed(2)}%
            </div>
          </div>
          <div>
            <div className="text-sm text-gray-600 mb-1">VaR (95%)</div>
            <div className="text-xl font-bold text-orange-600">
              {data.risk_metrics.var_95.toFixed(2)}%
            </div>
          </div>
          <div>
            <div className="text-sm text-gray-600 mb-1">Beta</div>
            <div className="text-xl font-bold text-blue-600">
              {data.risk_metrics.beta.toFixed(2)}
            </div>
          </div>
          <div>
            <div className="text-sm text-gray-600 mb-1">Alpha</div>
            <div className="text-xl font-bold text-green-600">
              {data.risk_metrics.alpha.toFixed(2)}%
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
