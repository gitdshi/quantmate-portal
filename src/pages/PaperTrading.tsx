import {
  AlertCircle,
  LineChart,
  Pause,
  Play,
  RefreshCw,
  Send,
  XCircle,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { paperTradingAPI, strategiesAPI } from '../lib/api'

interface PaperDeployment {
  id: number
  strategy_id: number
  strategy_name: string
  vt_symbol: string
  parameters: Record<string, unknown>
  status: 'running' | 'stopped' | 'error'
  started_at: string
  stopped_at: string | null
  pnl: number
}

interface PaperOrder {
  id: number
  symbol: string
  direction: 'buy' | 'sell'
  order_type: string
  quantity: number
  price: number | null
  status: string
  filled_quantity: number | null
  avg_fill_price: number | null
  fee: number | null
  created_at: string
}

interface PaperPosition {
  symbol: string
  direction: string
  quantity: number
  avg_cost: number
  current_price: number
  pnl: number
  pnl_pct: number
}

interface PaperPerformance {
  total_pnl: number
  total_trades: number
  win_rate: number
  max_drawdown: number
  sharpe_ratio: number | null
  equity_curve: { date: string; value: number }[]
}

interface Strategy {
  id: number
  name: string
}

type TabType = 'deployments' | 'orders' | 'positions' | 'performance'

const STATUS_COLORS: Record<string, string> = {
  running: 'bg-green-500/20 text-green-400',
  stopped: 'bg-gray-500/20 text-gray-400',
  error: 'bg-red-500/20 text-red-400',
  created: 'bg-blue-500/20 text-blue-400',
  filled: 'bg-green-500/20 text-green-400',
  cancelled: 'bg-gray-500/20 text-gray-400',
  rejected: 'bg-red-500/20 text-red-400',
  submitted: 'bg-yellow-500/20 text-yellow-400',
  partial: 'bg-orange-500/20 text-orange-400',
}

export default function PaperTrading() {
  const [searchParams] = useSearchParams()
  const prefilledStrategyId = searchParams.get('strategy_id')

  const [activeTab, setActiveTab] = useState<TabType>('deployments')
  const [strategies, setStrategies] = useState<Strategy[]>([])
  const [deployments, setDeployments] = useState<PaperDeployment[]>([])
  const [orders, setOrders] = useState<PaperOrder[]>([])
  const [positions, setPositions] = useState<PaperPosition[]>([])
  const [performance, setPerformance] = useState<PaperPerformance | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Deploy form state
  const [deployStrategyId, setDeployStrategyId] = useState<string>(prefilledStrategyId || '')
  const [deploySymbol, setDeploySymbol] = useState('')
  const [deployParams, setDeployParams] = useState('{}')

  // Manual order form state
  const [orderSymbol, setOrderSymbol] = useState('')
  const [orderDirection, setOrderDirection] = useState<'buy' | 'sell'>('buy')
  const [orderType, setOrderType] = useState<'market' | 'limit'>('market')
  const [orderQuantity, setOrderQuantity] = useState(100)
  const [orderPrice, setOrderPrice] = useState<number | undefined>(undefined)

  useEffect(() => {
    loadStrategies()
    loadDeployments()
  }, [])

  useEffect(() => {
    if (activeTab === 'orders') loadOrders()
    else if (activeTab === 'positions') loadPositions()
    else if (activeTab === 'performance') loadPerformance()
  }, [activeTab])

  const loadStrategies = async () => {
    try {
      const { data } = await strategiesAPI.list()
      const items = Array.isArray(data) ? data : (data.data ?? [])
      setStrategies(items)
    } catch {
      /* strategies list is optional UI enhancement */
    }
  }

  const loadDeployments = async () => {
    try {
      setLoading(true)
      setError(null)
      const { data } = await paperTradingAPI.listDeployments()
      setDeployments(Array.isArray(data) ? data : (data.deployments ?? []))
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load deployments')
    } finally {
      setLoading(false)
    }
  }

  const loadOrders = async () => {
    try {
      setLoading(true)
      setError(null)
      const { data } = await paperTradingAPI.listPaperOrders()
      setOrders(Array.isArray(data) ? data : (data.orders ?? []))
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load orders')
    } finally {
      setLoading(false)
    }
  }

  const loadPositions = async () => {
    try {
      setLoading(true)
      setError(null)
      const { data } = await paperTradingAPI.getPaperPositions()
      setPositions(Array.isArray(data) ? data : (data.positions ?? []))
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load positions')
    } finally {
      setLoading(false)
    }
  }

  const loadPerformance = async () => {
    try {
      setLoading(true)
      setError(null)
      const { data } = await paperTradingAPI.getPaperPerformance()
      setPerformance(data)
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load performance')
    } finally {
      setLoading(false)
    }
  }

  const handleDeploy = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!deployStrategyId || !deploySymbol) return
    try {
      setError(null)
      let params: Record<string, unknown> = {}
      try { params = JSON.parse(deployParams) } catch { /* use empty */ }
      await paperTradingAPI.deployStrategy({
        strategy_id: Number(deployStrategyId),
        vt_symbol: deploySymbol,
        parameters: params,
      })
      setDeploySymbol('')
      setDeployParams('{}')
      loadDeployments()
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Deploy failed')
    }
  }

  const handleStopDeployment = async (id: number) => {
    try {
      await paperTradingAPI.stopDeployment(id)
      loadDeployments()
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Stop failed')
    }
  }

  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!orderSymbol) return
    try {
      setError(null)
      await paperTradingAPI.createPaperOrder({
        symbol: orderSymbol,
        direction: orderDirection,
        order_type: orderType,
        quantity: orderQuantity,
        price: orderType === 'limit' ? orderPrice : undefined,
      })
      setOrderSymbol('')
      setOrderQuantity(100)
      setOrderPrice(undefined)
      if (activeTab === 'orders') loadOrders()
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Order failed')
    }
  }

  const handleCancelOrder = async (id: number) => {
    try {
      await paperTradingAPI.cancelPaperOrder(id)
      loadOrders()
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Cancel failed')
    }
  }

  const tabs: { key: TabType; label: string }[] = [
    { key: 'deployments', label: 'Deployments' },
    { key: 'orders', label: 'Orders' },
    { key: 'positions', label: 'Positions' },
    { key: 'performance', label: 'Performance' },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Paper Trading</h1>
        <button
          onClick={() => {
            loadDeployments()
            if (activeTab === 'orders') loadOrders()
            else if (activeTab === 'positions') loadPositions()
            else if (activeTab === 'performance') loadPerformance()
          }}
          className="flex items-center gap-2 rounded bg-gray-700 px-3 py-1.5 text-sm text-gray-300 hover:bg-gray-600"
        >
          <RefreshCw size={14} />
          Refresh
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded bg-red-500/10 px-4 py-3 text-red-400">
          <AlertCircle size={16} />
          {error}
        </div>
      )}

      {/* Deploy Strategy Panel */}
      <div className="rounded-lg border border-gray-700 bg-gray-800 p-4">
        <h2 className="mb-3 text-lg font-semibold text-white">Deploy Strategy to Paper</h2>
        <form onSubmit={handleDeploy} className="flex flex-wrap items-end gap-3">
          <div>
            <label className="mb-1 block text-xs text-gray-400">Strategy</label>
            <select
              value={deployStrategyId}
              onChange={(e) => setDeployStrategyId(e.target.value)}
              className="rounded bg-gray-700 px-3 py-2 text-sm text-white"
            >
              <option value="">Select strategy...</option>
              {strategies.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs text-gray-400">Symbol</label>
            <input
              type="text"
              value={deploySymbol}
              onChange={(e) => setDeploySymbol(e.target.value)}
              placeholder="IF2406.CFFEX"
              className="rounded bg-gray-700 px-3 py-2 text-sm text-white placeholder-gray-500"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-gray-400">Parameters (JSON)</label>
            <input
              type="text"
              value={deployParams}
              onChange={(e) => setDeployParams(e.target.value)}
              placeholder='{"fast_window": 10}'
              className="rounded bg-gray-700 px-3 py-2 text-sm text-white placeholder-gray-500"
            />
          </div>
          <button
            type="submit"
            className="flex items-center gap-1 rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500"
          >
            <Play size={14} />
            Deploy
          </button>
        </form>
      </div>

      {/* Manual Paper Order */}
      <div className="rounded-lg border border-gray-700 bg-gray-800 p-4">
        <h2 className="mb-3 text-lg font-semibold text-white">Manual Paper Order</h2>
        <form onSubmit={handleSubmitOrder} className="flex flex-wrap items-end gap-3">
          <div>
            <label className="mb-1 block text-xs text-gray-400">Symbol</label>
            <input
              type="text"
              value={orderSymbol}
              onChange={(e) => setOrderSymbol(e.target.value)}
              placeholder="000001.SZ"
              className="rounded bg-gray-700 px-3 py-2 text-sm text-white placeholder-gray-500"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-gray-400">Direction</label>
            <select
              value={orderDirection}
              onChange={(e) => setOrderDirection(e.target.value as 'buy' | 'sell')}
              className="rounded bg-gray-700 px-3 py-2 text-sm text-white"
            >
              <option value="buy">Buy</option>
              <option value="sell">Sell</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs text-gray-400">Type</label>
            <select
              value={orderType}
              onChange={(e) => setOrderType(e.target.value as 'market' | 'limit')}
              className="rounded bg-gray-700 px-3 py-2 text-sm text-white"
            >
              <option value="market">Market</option>
              <option value="limit">Limit</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs text-gray-400">Quantity</label>
            <input
              type="number"
              value={orderQuantity}
              onChange={(e) => setOrderQuantity(Number(e.target.value))}
              min={1}
              className="w-24 rounded bg-gray-700 px-3 py-2 text-sm text-white"
            />
          </div>
          {orderType === 'limit' && (
            <div>
              <label className="mb-1 block text-xs text-gray-400">Price</label>
              <input
                type="number"
                step="0.01"
                value={orderPrice ?? ''}
                onChange={(e) => setOrderPrice(e.target.value ? Number(e.target.value) : undefined)}
                className="w-28 rounded bg-gray-700 px-3 py-2 text-sm text-white"
              />
            </div>
          )}
          <button
            type="submit"
            className="flex items-center gap-1 rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500"
          >
            <Send size={14} />
            Submit Paper Order
          </button>
        </form>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-700">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={`px-4 py-2 text-sm font-medium ${
              activeTab === t.key
                ? 'border-b-2 border-blue-500 text-white'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {loading && <p className="text-gray-400">Loading...</p>}

      {activeTab === 'deployments' && !loading && (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-gray-700 text-gray-400">
              <tr>
                <th className="px-3 py-2">ID</th>
                <th className="px-3 py-2">Strategy</th>
                <th className="px-3 py-2">Symbol</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">P&L</th>
                <th className="px-3 py-2">Started</th>
                <th className="px-3 py-2">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700/50">
              {deployments.map((d) => (
                <tr key={d.id} className="text-gray-300">
                  <td className="px-3 py-2">{d.id}</td>
                  <td className="px-3 py-2">{d.strategy_name}</td>
                  <td className="px-3 py-2 font-mono">{d.vt_symbol}</td>
                  <td className="px-3 py-2">
                    <span className={`rounded-full px-2 py-0.5 text-xs ${STATUS_COLORS[d.status] || 'bg-gray-600 text-gray-300'}`}>
                      {d.status}
                    </span>
                  </td>
                  <td className={`px-3 py-2 font-mono ${d.pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {d.pnl >= 0 ? '+' : ''}{d.pnl.toFixed(2)}
                  </td>
                  <td className="px-3 py-2 text-gray-500">{new Date(d.started_at).toLocaleString()}</td>
                  <td className="px-3 py-2">
                    {d.status === 'running' && (
                      <button
                        onClick={() => handleStopDeployment(d.id)}
                        className="text-red-400 hover:text-red-300"
                        title="Stop"
                      >
                        <Pause size={16} />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {deployments.length === 0 && (
                <tr><td colSpan={7} className="px-3 py-8 text-center text-gray-500">No paper deployments yet</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'orders' && !loading && (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-gray-700 text-gray-400">
              <tr>
                <th className="px-3 py-2">ID</th>
                <th className="px-3 py-2">Symbol</th>
                <th className="px-3 py-2">Direction</th>
                <th className="px-3 py-2">Type</th>
                <th className="px-3 py-2">Qty</th>
                <th className="px-3 py-2">Price</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Filled</th>
                <th className="px-3 py-2">Fee</th>
                <th className="px-3 py-2">Time</th>
                <th className="px-3 py-2">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700/50">
              {orders.map((o) => (
                <tr key={o.id} className="text-gray-300">
                  <td className="px-3 py-2">{o.id}</td>
                  <td className="px-3 py-2 font-mono">{o.symbol}</td>
                  <td className="px-3 py-2">
                    <span className={o.direction === 'buy' ? 'text-green-400' : 'text-red-400'}>
                      {o.direction.toUpperCase()}
                    </span>
                  </td>
                  <td className="px-3 py-2">{o.order_type}</td>
                  <td className="px-3 py-2">{o.quantity}</td>
                  <td className="px-3 py-2 font-mono">{o.price ?? '-'}</td>
                  <td className="px-3 py-2">
                    <span className={`rounded-full px-2 py-0.5 text-xs ${STATUS_COLORS[o.status] || 'bg-gray-600 text-gray-300'}`}>
                      {o.status}
                    </span>
                  </td>
                  <td className="px-3 py-2 font-mono">
                    {o.filled_quantity != null ? `${o.filled_quantity}@${o.avg_fill_price}` : '-'}
                  </td>
                  <td className="px-3 py-2 font-mono">{o.fee ?? '-'}</td>
                  <td className="px-3 py-2 text-gray-500">{new Date(o.created_at).toLocaleString()}</td>
                  <td className="px-3 py-2">
                    {['created', 'submitted', 'partial'].includes(o.status) && (
                      <button
                        onClick={() => handleCancelOrder(o.id)}
                        className="text-red-400 hover:text-red-300"
                        title="Cancel"
                      >
                        <XCircle size={16} />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {orders.length === 0 && (
                <tr><td colSpan={11} className="px-3 py-8 text-center text-gray-500">No paper orders yet</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'positions' && !loading && (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-gray-700 text-gray-400">
              <tr>
                <th className="px-3 py-2">Symbol</th>
                <th className="px-3 py-2">Direction</th>
                <th className="px-3 py-2">Quantity</th>
                <th className="px-3 py-2">Avg Cost</th>
                <th className="px-3 py-2">Current</th>
                <th className="px-3 py-2">P&L</th>
                <th className="px-3 py-2">P&L %</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700/50">
              {positions.map((p) => (
                <tr key={`${p.symbol}-${p.direction}`} className="text-gray-300">
                  <td className="px-3 py-2 font-mono">{p.symbol}</td>
                  <td className="px-3 py-2">
                    <span className={p.direction === 'buy' ? 'text-green-400' : 'text-red-400'}>
                      {p.direction.toUpperCase()}
                    </span>
                  </td>
                  <td className="px-3 py-2">{p.quantity}</td>
                  <td className="px-3 py-2 font-mono">{p.avg_cost.toFixed(2)}</td>
                  <td className="px-3 py-2 font-mono">{p.current_price.toFixed(2)}</td>
                  <td className={`px-3 py-2 font-mono ${p.pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {p.pnl >= 0 ? '+' : ''}{p.pnl.toFixed(2)}
                  </td>
                  <td className={`px-3 py-2 font-mono ${p.pnl_pct >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {p.pnl_pct >= 0 ? '+' : ''}{p.pnl_pct.toFixed(2)}%
                  </td>
                </tr>
              ))}
              {positions.length === 0 && (
                <tr><td colSpan={7} className="px-3 py-8 text-center text-gray-500">No paper positions</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'performance' && !loading && performance && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
            {[
              { label: 'Total P&L', value: performance.total_pnl.toFixed(2), color: performance.total_pnl >= 0 ? 'text-green-400' : 'text-red-400' },
              { label: 'Total Trades', value: String(performance.total_trades), color: 'text-white' },
              { label: 'Win Rate', value: `${(performance.win_rate * 100).toFixed(1)}%`, color: 'text-white' },
              { label: 'Max Drawdown', value: `${(performance.max_drawdown * 100).toFixed(2)}%`, color: 'text-red-400' },
              { label: 'Sharpe Ratio', value: performance.sharpe_ratio?.toFixed(2) ?? 'N/A', color: 'text-white' },
            ].map((m) => (
              <div key={m.label} className="rounded-lg border border-gray-700 bg-gray-800 p-3">
                <p className="text-xs text-gray-400">{m.label}</p>
                <p className={`text-lg font-bold ${m.color}`}>{m.value}</p>
              </div>
            ))}
          </div>
          {performance.equity_curve.length > 0 && (
            <div className="flex items-center gap-2 rounded-lg border border-gray-700 bg-gray-800 p-4">
              <LineChart size={16} className="text-gray-400" />
              <span className="text-sm text-gray-400">
                Equity curve: {performance.equity_curve.length} data points
                (from {performance.equity_curve[0].date} to {performance.equity_curve[performance.equity_curve.length - 1].date})
              </span>
            </div>
          )}
        </div>
      )}

      {activeTab === 'performance' && !loading && !performance && (
        <p className="py-8 text-center text-gray-500">No performance data available</p>
      )}
    </div>
  )
}
