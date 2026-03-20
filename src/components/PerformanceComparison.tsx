import { useQuery } from '@tanstack/react-query'
import { BarChart2, TrendingDown, TrendingUp } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { api } from '../lib/api'
import type { BacktestResult } from '../types'

interface ComparisonMetrics {
  name: string
  total_return: number
  annual_return: number
  sharpe_ratio: number
  max_drawdown: number
  volatility: number
  winning_rate: number
  total_trades: number
  profit_factor: number
  avg_win: number
  avg_loss: number
}

export default function PerformanceComparison() {
  const { t } = useTranslation(['backtest', 'common'])
  const [selectedIds, setSelectedIds] = useState<string[]>([])

  // Fetch backtest history
  const { data: backtests } = useQuery({
    queryKey: ['backtest-history'],
    queryFn: async () => {
      const { data } = await api.get('/backtest/history/list')
      return data
    },
  })

  // Fetch comparison data
  const { data: comparisonData, isLoading } = useQuery<ComparisonMetrics[]>({
    queryKey: ['performance-comparison', selectedIds],
    queryFn: async () => {
      const { data } = await api.get('/analytics/compare', {
        params: { ids: selectedIds.join(',') },
      })
      return data
    },
    enabled: selectedIds.length >= 2,
  })

  const handleToggleBacktest = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter((selectedId) => selectedId !== id))
    } else {
      if (selectedIds.length < 5) {
        setSelectedIds([...selectedIds, id])
      }
    }
  }

  const metrics = [
    { key: 'total_return', label: t('metrics.totalReturn'), format: (v: number) => `${v.toFixed(2)}%`, colorize: true },
    { key: 'annual_return', label: t('metrics.annualReturn'), format: (v: number) => `${v.toFixed(2)}%`, colorize: true },
    { key: 'sharpe_ratio', label: t('metrics.sharpeRatio'), format: (v: number) => v.toFixed(2), colorize: false },
    { key: 'max_drawdown', label: t('metrics.maxDrawdown'), format: (v: number) => `${v.toFixed(2)}%`, colorize: false },
    { key: 'volatility', label: t('metrics.volatility'), format: (v: number) => `${v.toFixed(2)}%`, colorize: false },
    { key: 'winning_rate', label: t('metrics.winRate'), format: (v: number) => `${v.toFixed(1)}%`, colorize: false },
    { key: 'total_trades', label: t('metrics.totalTrades'), format: (v: number) => v.toString(), colorize: false },
    { key: 'profit_factor', label: t('metrics.profitFactor'), format: (v: number) => v.toFixed(2), colorize: false },
    { key: 'avg_win', label: t('metrics.avgWin'), format: (v: number) => `$${v.toFixed(2)}`, colorize: false },
    { key: 'avg_loss', label: t('metrics.avgLoss'), format: (v: number) => `$${v.toFixed(2)}`, colorize: false },
  ]

  return (
    <div className="space-y-6">
      {/* Selection Panel */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          {t('comparison.selectToCompare', { min: 2, max: 5 })}
        </h3>
        <div className="text-sm text-gray-600 mb-4">
          {t('comparison.selected')}: {selectedIds.length} / 5
        </div>
        <div className="max-h-64 overflow-y-auto space-y-2">
          {backtests?.map((backtest: BacktestResult) => (
            <label
              key={backtest.job_id}
              className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                selectedIds.includes(backtest.job_id)
                  ? 'bg-blue-50 border-blue-300'
                  : 'bg-white border-gray-200 hover:bg-gray-50'
              }`}
            >
              <input
                type="checkbox"
                checked={selectedIds.includes(backtest.job_id)}
                onChange={() => handleToggleBacktest(backtest.job_id)}
                disabled={!selectedIds.includes(backtest.job_id) && selectedIds.length >= 5}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-gray-900">
                    {backtest.symbol_name ? `${backtest.symbol} (${backtest.symbol_name})` : backtest.symbol} - {backtest.start_date} to {backtest.end_date}
                  </span>
                  {backtest.statistics && (
                    <span className={`text-sm font-medium ${
                      backtest.statistics.total_return >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {backtest.statistics.total_return.toFixed(2)}%
                    </span>
                  )}
                </div>
                <div className="text-sm text-gray-600">
                  {t('common:id')}: {backtest.job_id}
                </div>
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* Comparison Results */}
      {selectedIds.length < 2 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 text-center">
          <BarChart2 className="w-12 h-12 text-blue-600 mx-auto mb-3" />
          <p className="text-gray-700">
            {t('comparison.noItemsToCompare')}
          </p>
        </div>
      )}

      {selectedIds.length >= 2 && isLoading && (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      )}

      {selectedIds.length >= 2 && !isLoading && comparisonData && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">{t('comparison.title')}</h3>
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky left-0 bg-gray-50 z-10">
                    {t('comparison.metric')}
                  </th>
                  {comparisonData.map((item, idx) => (
                    <th
                      key={idx}
                      className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      {item.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {metrics.map((metric) => {
                  const values = comparisonData.map((item) => 
                    item[metric.key as keyof ComparisonMetrics] as number
                  )
                  const maxValue = Math.max(...values)
                  const minValue = Math.min(...values)

                  return (
                    <tr key={metric.key} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 sticky left-0 bg-white">
                        {metric.label}
                      </td>
                      {comparisonData.map((item, idx) => {
                        const value = item[metric.key as keyof ComparisonMetrics] as number
                        const isBest = value === maxValue && maxValue !== minValue
                        const isWorst = value === minValue && maxValue !== minValue

                        return (
                          <td
                            key={idx}
                            className={`px-6 py-4 whitespace-nowrap text-center text-sm ${
                              isBest
                                ? 'bg-green-50 font-bold text-green-700'
                                : isWorst
                                ? 'bg-red-50 text-red-600'
                                : 'text-gray-900'
                            }`}
                          >
                            <div className="flex items-center justify-center gap-1">
                              {metric.colorize && value > 0 && <TrendingUp className="w-4 h-4 text-green-600" />}
                              {metric.colorize && value < 0 && <TrendingDown className="w-4 h-4 text-red-600" />}
                              <span className={metric.colorize ? (value >= 0 ? 'text-green-600' : 'text-red-600') : ''}>
                                {metric.format(value)}
                              </span>
                            </div>
                          </td>
                        )
                      })}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Visual Comparison Charts */}
      {selectedIds.length >= 2 && comparisonData && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Return Comparison */}
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <h4 className="text-base font-semibold text-gray-900 mb-4">{t('comparison.returnComparison')}</h4>
            <div className="space-y-3">
              {comparisonData.map((item, idx) => {
                const maxReturn = Math.max(...comparisonData.map(d => Math.abs(d.total_return)))
                const width = Math.abs(item.total_return) / maxReturn * 100

                return (
                  <div key={idx}>
                    <div className="flex items-center justify-between mb-1 text-sm">
                      <span className="text-gray-700">{item.name}</span>
                      <span className={`font-medium ${item.total_return >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {item.total_return.toFixed(2)}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div
                        className={`h-3 rounded-full ${item.total_return >= 0 ? 'bg-green-600' : 'bg-red-600'}`}
                        style={{ width: `${width}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Risk-Adjusted Return (Sharpe Ratio) */}
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <h4 className="text-base font-semibold text-gray-900 mb-4">{t('comparison.riskAdjustedReturn')}</h4>
            <div className="space-y-3">
              {comparisonData.map((item, idx) => {
                const maxSharpe = Math.max(...comparisonData.map(d => Math.abs(d.sharpe_ratio)))
                const width = Math.abs(item.sharpe_ratio) / maxSharpe * 100

                return (
                  <div key={idx}>
                    <div className="flex items-center justify-between mb-1 text-sm">
                      <span className="text-gray-700">{item.name}</span>
                      <span className="font-medium text-blue-600">
                        {item.sharpe_ratio.toFixed(2)}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div
                        className="bg-blue-600 h-3 rounded-full"
                        style={{ width: `${width}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
