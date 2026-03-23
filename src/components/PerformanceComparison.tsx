import { useQuery } from '@tanstack/react-query'
import { BarChart2, TrendingDown, TrendingUp } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { queueAPI } from '../lib/api'

interface ComparisonMetrics {
  job_id: string
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

  const { data: jobsResponse, isLoading } = useQuery({
    queryKey: ['backtest-history', 'queue'],
    queryFn: () => queueAPI.listJobs(undefined, 300),
    staleTime: 15000,
  })

  const completedBacktests = useMemo(() => {
    const data = jobsResponse?.data
    const jobs = Array.isArray(data) ? data : []

    return jobs
      .filter((job: any) => (job.status === 'finished' || job.status === 'completed') && !(job.type === 'bulk_backtest' || String(job.job_id || '').startsWith('bulk_')))
      .sort((a: any, b: any) => new Date(b.updated_at || b.created_at).getTime() - new Date(a.updated_at || a.created_at).getTime())
  }, [jobsResponse])

  const comparisonData = useMemo<ComparisonMetrics[]>(() => {
    const lookup = new Map(completedBacktests.map((job: any) => [job.job_id, job]))
    return selectedIds
      .map((id) => lookup.get(id))
      .filter(Boolean)
      .map((job: any) => {
        const stats = job.result?.statistics || {}
        return {
          job_id: job.job_id,
          name: job.strategy_name || job.strategy_class || job.symbol || job.job_id,
          total_return: Number(stats.total_return ?? 0),
          annual_return: Number(stats.annual_return ?? 0),
          sharpe_ratio: Number(stats.sharpe_ratio ?? 0),
          max_drawdown: Number(stats.max_drawdown_percent ?? stats.max_drawdown ?? 0),
          volatility: Number(stats.volatility ?? 0),
          winning_rate: Number(stats.winning_rate ?? stats.win_rate ?? 0),
          total_trades: Number(stats.total_trades ?? 0),
          profit_factor: Number(stats.profit_factor ?? 0),
          avg_win: Number(stats.avg_win ?? 0),
          avg_loss: Number(stats.avg_loss ?? 0),
        }
      })
  }, [completedBacktests, selectedIds])

  const selectedCount = selectedIds.length

  const backtestItems = completedBacktests.slice(0, 200)

  const hasEnoughData = comparisonData.length >= 2

  const handleClear = () => {
    setSelectedIds([])
  }

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
    <div className="space-y-4">
      {/* Selection Panel */}
      <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
        <h3 className="mb-3 text-base font-semibold text-gray-900">
          {t('comparison.selectToCompare', { min: 2, max: 5 })}
        </h3>
        <div className="mb-3 text-xs text-gray-600">
          {t('comparison.selected')}: {selectedCount} / 5
          {selectedCount > 0 ? (
            <button onClick={handleClear} className="ml-3 text-primary hover:underline">
              {t('comparison.clearAll')}
            </button>
          ) : null}
        </div>
        <div className="max-h-64 overflow-y-auto space-y-2">
          {backtestItems.map((backtest: any) => (
            <label
              key={backtest.job_id}
              className={`flex cursor-pointer items-center gap-2.5 rounded-lg border p-2.5 transition-colors ${
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
                  <span className="text-sm font-medium text-gray-900">
                    {backtest.symbol_name ? `${backtest.symbol} (${backtest.symbol_name})` : backtest.symbol || '-'}
                  </span>
                  {backtest.result?.statistics && (
                    <span className={`text-xs font-medium ${
                      backtest.result.statistics.total_return >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {Number(backtest.result.statistics.total_return || 0).toFixed(2)}%
                    </span>
                  )}
                </div>
                <div className="text-xs text-gray-600">
                  {t('common:id')}: {backtest.job_id}
                </div>
              </div>
            </label>
          ))}
        </div>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center h-24">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      )}

      {!isLoading && backtestItems.length === 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 text-center">
          <p className="text-gray-700">{t('page.emptyRuns')}</p>
        </div>
      )}

      {!isLoading && selectedIds.length < 2 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 text-center">
          <BarChart2 className="w-12 h-12 text-blue-600 mx-auto mb-3" />
          <p className="text-gray-700">
            {t('comparison.noItemsToCompare')}
          </p>
        </div>
      )}

      {hasEnoughData && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="border-b border-gray-200 p-4">
            <h3 className="text-base font-semibold text-gray-900">{t('comparison.title')}</h3>
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
                      className="px-4 py-2 text-center text-[11px] font-medium uppercase tracking-wider text-gray-500"
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
                      <td className="sticky left-0 bg-white px-4 py-2.5 whitespace-nowrap text-xs font-medium text-gray-900">
                        {metric.label}
                      </td>
                      {comparisonData.map((item, idx) => {
                        const value = item[metric.key as keyof ComparisonMetrics] as number
                        const isBest = value === maxValue && maxValue !== minValue
                        const isWorst = value === minValue && maxValue !== minValue

                        return (
                          <td
                            key={idx}
                            className={`px-4 py-2.5 whitespace-nowrap text-center text-xs ${
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
      {hasEnoughData && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {/* Return Comparison */}
          <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
            <h4 className="mb-3 text-sm font-semibold text-gray-900">{t('comparison.returnComparison')}</h4>
            <div className="space-y-2.5">
              {comparisonData.map((item, idx) => {
                const maxReturn = Math.max(...comparisonData.map(d => Math.abs(d.total_return)))
                const width = Math.abs(item.total_return) / maxReturn * 100

                return (
                  <div key={idx}>
                    <div className="mb-1 flex items-center justify-between text-xs">
                      <span className="text-gray-700">{item.name}</span>
                      <span className={`font-medium ${item.total_return >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {item.total_return.toFixed(2)}%
                      </span>
                    </div>
                    <div className="h-2.5 w-full rounded-full bg-gray-200">
                      <div
                        className={`h-2.5 rounded-full ${item.total_return >= 0 ? 'bg-green-600' : 'bg-red-600'}`}
                        style={{ width: `${width}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Risk-Adjusted Return (Sharpe Ratio) */}
          <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
            <h4 className="mb-3 text-sm font-semibold text-gray-900">{t('comparison.riskAdjustedReturn')}</h4>
            <div className="space-y-2.5">
              {comparisonData.map((item, idx) => {
                const maxSharpe = Math.max(...comparisonData.map(d => Math.abs(d.sharpe_ratio)))
                const width = Math.abs(item.sharpe_ratio) / maxSharpe * 100

                return (
                  <div key={idx}>
                    <div className="mb-1 flex items-center justify-between text-xs">
                      <span className="text-gray-700">{item.name}</span>
                      <span className="font-medium text-blue-600">
                        {item.sharpe_ratio.toFixed(2)}
                      </span>
                    </div>
                    <div className="h-2.5 w-full rounded-full bg-gray-200">
                      <div
                        className="h-2.5 rounded-full bg-blue-600"
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
