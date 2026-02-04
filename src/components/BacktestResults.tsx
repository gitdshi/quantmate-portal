import { useQuery } from '@tanstack/react-query'
import { BarChart3, Percent, TrendingDown, TrendingUp, X } from 'lucide-react'
import { backtestAPI } from '../lib/api'

interface BacktestResultsProps {
  jobId: string
  onClose: () => void
}

export default function BacktestResults({ jobId, onClose }: BacktestResultsProps) {
  const { data: resultData, isLoading } = useQuery({
    queryKey: ['backtest-result', jobId],
    queryFn: () => backtestAPI.getStatus(jobId),
    enabled: !!jobId,
  })

  const result = resultData?.data

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="bg-card border border-border rounded-lg shadow-lg w-full max-w-5xl p-8">
          <div className="text-center">Loading results...</div>
        </div>
      </div>
    )
  }

  if (!result) {
    return (
      <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="bg-card border border-border rounded-lg shadow-lg w-full max-w-5xl p-8">
          <div className="text-center text-destructive">Failed to load results</div>
        </div>
      </div>
    )
  }

  const stats = result.statistics || {}

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-lg shadow-lg w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div>
            <h2 className="text-xl font-semibold">Backtest Results</h2>
            <p className="text-sm text-muted-foreground mt-1">
              {result.symbol} • {result.start_date} to {result.end_date}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-muted rounded-md transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title="Total Return"
              value={`${(stats.total_return || 0).toFixed(2)}%`}
              icon={
                (stats.total_return || 0) >= 0 ? (
                  <TrendingUp className="h-5 w-5 text-green-500" />
                ) : (
                  <TrendingDown className="h-5 w-5 text-red-500" />
                )
              }
              positive={(stats.total_return || 0) >= 0}
            />
            <StatCard
              title="Annual Return"
              value={`${(stats.annual_return || 0).toFixed(2)}%`}
              icon={<Percent className="h-5 w-5" />}
            />
            <StatCard
              title="Sharpe Ratio"
              value={(stats.sharpe_ratio || 0).toFixed(2)}
              icon={<BarChart3 className="h-5 w-5" />}
            />
            <StatCard
              title="Max Drawdown"
              value={`${(stats.max_drawdown || 0).toFixed(2)}%`}
              icon={<TrendingDown className="h-5 w-5 text-red-500" />}
            />
          </div>

          {/* Additional Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-muted/50 rounded-lg p-4">
              <div className="text-sm text-muted-foreground mb-1">Total Trades</div>
              <div className="text-2xl font-bold">{stats.total_trades || 0}</div>
            </div>
            <div className="bg-muted/50 rounded-lg p-4">
              <div className="text-sm text-muted-foreground mb-1">Winning Rate</div>
              <div className="text-2xl font-bold">
                {((stats.winning_rate || 0) * 100).toFixed(1)}%
              </div>
            </div>
            <div className="bg-muted/50 rounded-lg p-4">
              <div className="text-sm text-muted-foreground mb-1">Profit Factor</div>
              <div className="text-2xl font-bold">{(stats.profit_factor || 0).toFixed(2)}</div>
            </div>
          </div>

          {/* Details */}
          <div className="bg-muted/50 rounded-lg p-4">
            <h3 className="text-sm font-medium mb-3">Backtest Details</h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-muted-foreground">Symbol:</span>
                <span className="ml-2 font-medium">{result.symbol}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Initial Capital:</span>
                <span className="ml-2 font-medium">
                  ${(result.initial_capital || 0).toLocaleString()}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">Start Date:</span>
                <span className="ml-2 font-medium">{result.start_date}</span>
              </div>
              <div>
                <span className="text-muted-foreground">End Date:</span>
                <span className="ml-2 font-medium">{result.end_date}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Status:</span>
                <span className={`ml-2 font-medium capitalize ${
                  result.status === 'finished' ? 'text-green-500' : 'text-muted-foreground'
                }`}>
                  {result.status}
                </span>
              </div>
              {result.completed_at && (
                <div>
                  <span className="text-muted-foreground">Completed:</span>
                  <span className="ml-2 font-medium">
                    {new Date(result.completed_at).toLocaleString()}
                  </span>
                </div>
              )}
            </div>
          </div>

          {result.error && (
            <div className="bg-destructive/10 border border-destructive rounded-lg p-4">
              <h3 className="text-sm font-medium text-destructive mb-2">Error</h3>
              <p className="text-sm">{result.error}</p>
            </div>
          )}

          {result.trades && result.trades.length > 0 && (
            <div>
              <h3 className="text-sm font-medium mb-3">Recent Trades</h3>
              <div className="bg-muted/50 rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted">
                    <tr>
                      <th className="text-left p-3">Date</th>
                      <th className="text-left p-3">Type</th>
                      <th className="text-right p-3">Price</th>
                      <th className="text-right p-3">Volume</th>
                      <th className="text-right p-3">PnL</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.trades.slice(0, 10).map((trade: unknown, index: number) => {
                      const t = trade as { date?: string; type?: string; price?: number; volume?: number; pnl?: number }
                      return (
                        <tr key={index} className="border-t border-border">
                          <td className="p-3">{t.date || '-'}</td>
                          <td className="p-3">{t.type || '-'}</td>
                          <td className="p-3 text-right">{t.price || '-'}</td>
                          <td className="p-3 text-right">{t.volume || '-'}</td>
                          <td className={`p-3 text-right ${
                            (t.pnl || 0) >= 0 ? 'text-green-500' : 'text-red-500'
                          }`}>
                            {t.pnl?.toFixed(2) || '-'}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 p-4 border-t border-border">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
          >
            Close
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
              ? 'text-green-500'
              : 'text-red-500'
            : ''
        }`}
      >
        {value}
      </div>
    </div>
  )
}
