import { useQuery } from '@tanstack/react-query'
import {
    Activity,
    BarChart3,
    Calendar,
    List,
    Loader,
    Percent,
    Target,
    TrendingDown,
    TrendingUp,
    X,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { marketDataAPI, queueAPI } from '../lib/api'
import EquityCurveChart from './EquityCurveChart'
import TradingChart from './TradingChart'

interface BacktestResultsProps {
  jobId: string
  onClose: () => void
}

export default function BacktestResults({ jobId, onClose }: BacktestResultsProps) {
  const { t } = useTranslation(['backtest', 'common'])
  const [activeTab, setActiveTab] = useState<'performance' | 'trades' | 'config'>('performance')
  
  const { data: resultData, isLoading } = useQuery({
    queryKey: ['backtest-result', jobId],
    queryFn: () => queueAPI.getJob(jobId),
    enabled: !!jobId,
  })

  const jobData = resultData?.data
  const result = jobData?.result
  const stats = result?.statistics || {}
  
  // Debug: Log the data structure
  if (jobData && !isLoading) {
    console.log('jobData:', jobData)
    console.log('result:', result)
    console.log('jobData.status:', jobData.status)
    console.log('stock_price_curve length:', result?.stock_price_curve?.length)
    console.log('benchmark_curve length:', result?.benchmark_curve?.length)
    console.log('trades length:', result?.trades?.length)
    if (result?.benchmark_curve) {
      console.log('benchmark_curve sample:', result.benchmark_curve[0])
    }
    if (result?.trades && result.trades.length > 0) {
      console.log('trades sample:', result.trades[0])
    }
  }
  
  // Prefer job metadata `symbol_name` when available (job metadata is authoritative)
  const symbolName = jobData?.symbol_name || result?.symbol_name || ''
  const symbolCode = jobData?.symbol || result?.symbol || ''
  const strategyName = jobData?.strategy_name || result?.strategy_name || ''
  const strategyVersion = jobData?.strategy_version
  const benchmark = jobData?.benchmark || result?.benchmark || stats.benchmark_symbol || '399300.SZ'
  const symbolDisplay = symbolName
    ? `${symbolCode} (${symbolName})`
    : symbolCode

  // Benchmark display mapping
  const getBenchmarkLabel = (code: string): string => {
    // Prefer lookup from backend-provided indexes when available
    const idx = indexMapRef[code]
    if (idx) return idx

    const benchmarkMap: Record<string, string> = {
      '399300.SZ': 'HS300 (沪深300)',
    }
    return benchmarkMap[code] || code
  }

  // Load index list from backend to map codes to friendly labels
  const { data: indexesResp } = useQuery({
    queryKey: ['market-indexes'],
    queryFn: () => marketDataAPI.indexes(),
    staleTime: 1000 * 60 * 60,
  })

  const indexes: Array<{ value: string; label: string }> = indexesResp?.data || []

  const indexMapRef = useMemo(() => {
    const m: Record<string, string> = {}
    for (const it of indexes) {
      if (it && it.value) m[it.value] = it.label || it.value
    }
    return m
  }, [indexes])

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="bg-card border border-border rounded-lg shadow-lg w-full max-w-6xl p-8">
          <div className="flex items-center justify-center gap-3">
            <Loader className="h-6 w-6 animate-spin" />
            <span>{t('results.loading')}</span>
          </div>
        </div>
      </div>
    )
  }

  if (!result) {
    return (
      <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="bg-card border border-border rounded-lg shadow-lg w-full max-w-6xl p-8">
          <div className="text-center">
            <p className="text-muted-foreground">{t('results.noResults')}</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-lg shadow-lg w-full max-w-6xl max-h-[95vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border shrink-0">
          <div>
            <h2 className="text-xl font-semibold">{t('results.title')}</h2>
            <p className="text-sm text-muted-foreground mt-1 font-medium">
              {strategyName ? `${strategyName}${strategyVersion ? ` v${strategyVersion}` : ''} • ${symbolDisplay} • ${result.start_date} to ${result.end_date} • ${getBenchmarkLabel(benchmark)}` : `${symbolDisplay} • ${result.start_date} to ${result.end_date} • ${getBenchmarkLabel(benchmark)}`}
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-muted rounded-md transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-border shrink-0">
          <button
            onClick={() => setActiveTab('performance')}
            className={`flex items-center gap-2 px-6 py-3 text-sm font-medium transition-colors ${
              activeTab === 'performance'
                ? 'border-b-2 border-primary text-primary'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <BarChart3 className="h-4 w-4" />
            {t('results.performance')}
          </button>
          <button
            onClick={() => setActiveTab('trades')}
            className={`flex items-center gap-2 px-6 py-3 text-sm font-medium transition-colors ${
              activeTab === 'trades'
                ? 'border-b-2 border-primary text-primary'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <List className="h-4 w-4" />
            {t('results.trades')} ({result?.trades?.length || 0})
          </button>
          <button
            onClick={() => setActiveTab('config')}
            className={`flex items-center gap-2 px-6 py-3 text-sm font-medium transition-colors ${
              activeTab === 'config'
                ? 'border-b-2 border-primary text-primary'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Calendar className="h-4 w-4" />
            {t('results.configuration')}
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Performance Tab */}
          {activeTab === 'performance' && (
            <div className="space-y-6">
              {/* Primary Metrics */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard
                  title={t('metrics.totalReturn')}
                  value={`${(stats.total_return || 0).toFixed(2)}%`}
                  icon={
                    (stats.total_return || 0) >= 0 ? (
                      <TrendingUp className="h-5 w-5 text-red-500" />
                    ) : (
                      <TrendingDown className="h-5 w-5 text-green-500" />
                    )
                  }
                  positive={(stats.total_return || 0) >= 0}
                />
                <StatCard
                  title={t('metrics.annualReturn')}
                  value={`${(stats.annual_return || 0).toFixed(2)}%`}
                  icon={<Percent className="h-5 w-5 text-blue-500" />}
                />
                <StatCard
                  title={t('metrics.sharpeRatio')}
                  value={(stats.sharpe_ratio || 0).toFixed(2)}
                  icon={<BarChart3 className="h-5 w-5 text-purple-500" />}
                />
                <StatCard
                  title={t('metrics.maxDrawdown')}
                  value={`${(stats.max_drawdown_percent || stats.max_drawdown || 0).toFixed(2)}%`}
                  icon={<TrendingDown className="h-5 w-5 text-green-500" />}
                />
              </div>

              {/* Benchmark Comparison (Alpha/Beta) */}
              {(stats.alpha !== null && stats.alpha !== undefined) ||
              (stats.beta !== null && stats.beta !== undefined) ||
              (stats.benchmark_return !== null && stats.benchmark_return !== undefined) ? (
                <div className="bg-muted/30 rounded-lg p-4">
                  <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
                    <Target className="h-4 w-4" />
                    {t('comparison.title')} ({getBenchmarkLabel(benchmark)})
                  </h3>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <div className="text-sm text-muted-foreground mb-1">{t('metrics.alpha')}</div>
                      <div className={`text-2xl font-bold ${(stats.alpha || 0) >= 0 ? 'text-red-500' : 'text-green-500'}`}>
                        {stats.alpha !== null && stats.alpha !== undefined ? `${(stats.alpha * 100).toFixed(2)}%` : 'N/A'}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground mb-1">{t('metrics.beta')}</div>
                      <div className="text-2xl font-bold">
                        {stats.beta !== null && stats.beta !== undefined ? stats.beta.toFixed(2) : 'N/A'}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground mb-1">{t('metrics.benchmarkReturn')}</div>
                      <div className={`text-2xl font-bold ${(stats.benchmark_return || 0) >= 0 ? 'text-red-500' : 'text-green-500'}`}>
                        {stats.benchmark_return !== null && stats.benchmark_return !== undefined ? `${stats.benchmark_return.toFixed(2)}%` : 'N/A'}
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}

              {/* Equity Curve Chart */}
              {result.equity_curve && result.equity_curve.length > 0 && (
                <div className="bg-muted/30 rounded-lg p-4">
                  <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
                    <Activity className="h-4 w-4" />
                    {t('results.equity')}
                  </h3>
                  <EquityCurveChart
                    data={result.equity_curve}
                    initialCapital={result.initial_capital || 100000}
                    benchmarkData={result.benchmark_curve}
                    benchmarkSymbol={getBenchmarkLabel(benchmark)}
                  />
                </div>
              )}

              {/* Trading Statistics */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-muted/50 rounded-lg p-4">
                  <div className="text-sm text-muted-foreground mb-1">{t('metrics.totalTrades')}</div>
                  <div className="text-2xl font-bold">{stats.total_trades || 0}</div>
                </div>
                <div className="bg-muted/50 rounded-lg p-4">
                  <div className="text-sm text-muted-foreground mb-1">{t('metrics.winRate')}</div>
                  <div className="text-2xl font-bold">
                    {((stats.winning_rate || 0) * 100).toFixed(1)}%
                  </div>
                </div>
                <div className="bg-muted/50 rounded-lg p-4">
                  <div className="text-sm text-muted-foreground mb-1">{t('metrics.profitFactor')}</div>
                  <div className="text-2xl font-bold">{(stats.profit_factor || 0).toFixed(2)}</div>
                </div>
                <div className="bg-muted/50 rounded-lg p-4">
                  <div className="text-sm text-muted-foreground mb-1">{t('metrics.endBalance')}</div>
                  <div className="text-2xl font-bold">
                    ${(stats.end_balance || 0).toLocaleString()}
                  </div>
                </div>
              </div>

              {/* Period Statistics */}
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-muted/50 rounded-lg p-4">
                  <div className="text-sm text-muted-foreground mb-1">{t('metrics.totalDays')}</div>
                  <div className="text-xl font-bold">{stats.total_days || 0}</div>
                </div>
                <div className="bg-muted/50 rounded-lg p-4">
                  <div className="text-sm text-muted-foreground mb-1">{t('metrics.profitDays')}</div>
                  <div className="text-xl font-bold text-red-500">{stats.profit_days || 0}</div>
                </div>
                <div className="bg-muted/50 rounded-lg p-4">
                  <div className="text-sm text-muted-foreground mb-1">{t('metrics.lossDays')}</div>
                  <div className="text-xl font-bold text-green-500">{stats.loss_days || 0}</div>
                </div>
              </div>
            </div>
          )}

          {/* Trades Tab */}
          {activeTab === 'trades' && (
            <div className="space-y-6">
              {/* Trade Summary */}
              <div className="bg-muted/30 rounded-lg p-4">
                <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
                  <List className="h-4 w-4" />
                  {t('results.tradeSummary')}
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                  <div>
                    <span className="text-muted-foreground">{t('symbol')}:</span>
                    <span className="ml-2 font-medium">{symbolDisplay}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">{t('metrics.totalTrades')}:</span>
                    <span className="ml-2 font-medium">{result?.trades?.length || 0}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">{t('common:period')}:</span>
                    <span className="ml-2 font-medium">{result?.start_date} to {result?.end_date}</span>
                  </div>
                </div>
              </div>

              {/* Price Chart with Trades */}
              {(result?.stock_price_curve || result?.benchmark_curve) ? (
                <div className="bg-muted/30 rounded-lg p-4">
                  <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
                    <Activity className="h-4 w-4" />
                    {t('results.priceChart')}
                  </h3>
                  <TradingChart
                    stockPriceData={result.stock_price_curve}
                    benchmarkData={result.benchmark_curve}
                    trades={result.trades}
                    stockSymbol={symbolDisplay}
                    benchmarkSymbol={getBenchmarkLabel(benchmark)}
                  />
                </div>
              ) : (
                <div className="bg-muted/30 rounded-lg p-4">
                  <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
                    <Activity className="h-4 w-4" />
                    {t('results.priceChart')}
                  </h3>
                  <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
                    {t('results.noPriceData')}
                  </div>
                </div>
              )}

              {/* Trade List */}
              {result?.trades && result.trades.length > 0 ? (
                <div>
                  <h3 className="text-sm font-medium mb-3">{t('results.tradeHistory', { count: result.trades.length })}</h3>
                  <div className="bg-muted/50 rounded-lg overflow-hidden">
                    <div className="max-h-[calc(95vh-300px)] overflow-y-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-muted sticky top-0">
                          <tr>
                            <th className="text-left p-3">{t('common:time')}</th>
                            <th className="text-left p-3">{t('common:direction')}</th>
                            <th className="text-left p-3">{t('results.offset')}</th>
                            <th className="text-right p-3">{t('common:price')}</th>
                            <th className="text-right p-3">{t('common:quantity')}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {result.trades.map((trade: { datetime?: string; direction?: string; offset?: string; price?: number; volume?: number }, index: number) => (
                            <tr key={index} className="border-t border-border">
                              <td className="p-3 font-mono text-xs">
                                {trade.datetime ? new Date(trade.datetime).toLocaleString() : '-'}
                              </td>
                              <td className={`p-3 ${
                                trade.direction === '多' || trade.direction === 'LONG'
                                  ? 'text-red-500'
                                  : 'text-green-500'
                              }`}>
                                {trade.direction}
                              </td>
                              <td className="p-3">{trade.offset}</td>
                              <td className="p-3 text-right font-mono">{trade.price?.toFixed(2)}</td>
                              <td className="p-3 text-right">{trade.volume}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center h-64 bg-muted/30 rounded-lg">
                  <p className="text-muted-foreground">{t('results.noTrades')}</p>
                </div>
              )}
            </div>
          )}

          {/* Configuration Tab */}
          {activeTab === 'config' && (
            <div className="space-y-6">
              <div className="bg-muted/50 rounded-lg p-4">
                <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  {t('configuration')}
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                  <div>
                    <span className="text-muted-foreground">{t('symbol')}:</span>
                    <span className="ml-2 font-medium">{symbolDisplay}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">{t('initialCapital')}:</span>
                    <span className="ml-2 font-medium">
                      ${(result.initial_capital || 100000).toLocaleString()}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">{t('startDate')}:</span>
                    <span className="ml-2 font-medium">{result.start_date}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">{t('endDate')}:</span>
                    <span className="ml-2 font-medium">{result.end_date}</span>
                  </div>
                </div>
                {/* Parameters JSON */}
                <div className="mt-3">
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-muted-foreground">{t('common:parameters')}</div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          const params = jobData?.parameters || result?.parameters || {}
                          if (navigator.clipboard) { navigator.clipboard.writeText(JSON.stringify(params, null, 2)) }
                        }}
                        className="text-xs text-muted-foreground hover:text-foreground"
                      >
                        {t('common:copy')}
                      </button>
                    </div>
                  </div>
                  <pre className="mt-2 p-3 bg-muted/30 rounded text-xs font-mono max-h-48 overflow-auto">{JSON.stringify(jobData?.parameters || result?.parameters || {}, null, 2)}</pre>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-4 border-t border-border shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
          >
            {t('common:close')}
          </button>
        </div>
      </div>
    </div>
  )
}

function StatCard({
  title,
  value,
  icon,
  positive,
}: {
  title: string
  value: string
  icon: React.ReactNode
  positive?: boolean
}) {
  return (
    <div className="bg-card border border-border rounded-lg p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-muted-foreground">{title}</span>
        {icon}
      </div>
      <div
        className={`text-2xl font-bold ${
          positive !== undefined
            ? positive
              ? 'text-red-500'
              : 'text-green-500'
            : ''
        }`}
      >
        {value}
      </div>
    </div>
  )
}

