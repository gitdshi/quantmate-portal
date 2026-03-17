import { useCallback, useEffect, useState } from 'react'
import {
  ArrowDownCircle, ArrowUpCircle, Clock, Filter, Loader2,
  PlayCircle, RefreshCw, StopCircle, XCircle
} from 'lucide-react'
import { tradingAPI } from '../lib/api'
import type { Order } from '../types'

type OrderFormData = {
  symbol: string
  direction: 'buy' | 'sell'
  order_type: 'market' | 'limit' | 'stop' | 'stop_limit'
  quantity: number
  price?: number
  mode: 'paper' | 'live'
}

const STATUS_COLORS: Record<string, string> = {
  created: 'bg-gray-100 text-gray-700',
  submitted: 'bg-blue-100 text-blue-700',
  partial_filled: 'bg-yellow-100 text-yellow-700',
  filled: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-700',
  rejected: 'bg-red-100 text-red-700',
  expired: 'bg-gray-100 text-gray-500',
}

export default function Trading() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [form, setForm] = useState<OrderFormData>({
    symbol: '', direction: 'buy', order_type: 'market', quantity: 100, mode: 'paper',
  })

  const fetchOrders = useCallback(async () => {
    setLoading(true)
    try {
      const params: Record<string, unknown> = { page_size: 200 }
      if (statusFilter) params.status = statusFilter
      const { data } = await tradingAPI.listOrders(params as any)
      const result = data as any
      setOrders(result.data || result || [])
    } catch {
      setError('Failed to load orders')
    } finally {
      setLoading(false)
    }
  }, [statusFilter])

  useEffect(() => { fetchOrders() }, [fetchOrders])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.symbol || form.quantity <= 0) return
    setSubmitting(true)
    setError(null)
    try {
      await tradingAPI.createOrder({
        symbol: form.symbol,
        direction: form.direction,
        order_type: form.order_type,
        quantity: form.quantity,
        price: form.order_type !== 'market' ? form.price : undefined,
        mode: form.mode,
      })
      setForm(f => ({ ...f, symbol: '', quantity: 100, price: undefined }))
      fetchOrders()
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Order submission failed')
    } finally {
      setSubmitting(false)
    }
  }

  const handleCancel = async (id: number) => {
    try {
      await tradingAPI.cancelOrder(id)
      fetchOrders()
    } catch {
      setError('Failed to cancel order')
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Trading</h1>

      {/* Order Form */}
      <div className="bg-card border rounded-lg p-6">
        <h2 className="text-lg font-semibold mb-4">New Order</h2>
        <form onSubmit={handleSubmit} className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Symbol</label>
            <input
              type="text" placeholder="000001.SZ" value={form.symbol}
              onChange={e => setForm(f => ({ ...f, symbol: e.target.value }))}
              className="w-full border rounded px-3 py-2 text-sm"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Direction</label>
            <select value={form.direction} onChange={e => setForm(f => ({ ...f, direction: e.target.value as any }))}
              className="w-full border rounded px-3 py-2 text-sm">
              <option value="buy">Buy</option>
              <option value="sell">Sell</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Type</label>
            <select value={form.order_type} onChange={e => setForm(f => ({ ...f, order_type: e.target.value as any }))}
              className="w-full border rounded px-3 py-2 text-sm">
              <option value="market">Market</option>
              <option value="limit">Limit</option>
              <option value="stop">Stop</option>
              <option value="stop_limit">Stop Limit</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Quantity</label>
            <input
              type="number" min={1} value={form.quantity}
              onChange={e => setForm(f => ({ ...f, quantity: Number(e.target.value) }))}
              className="w-full border rounded px-3 py-2 text-sm"
              required
            />
          </div>
          {form.order_type !== 'market' && (
            <div>
              <label className="block text-sm font-medium mb-1">Price</label>
              <input
                type="number" step="0.01" value={form.price || ''}
                onChange={e => setForm(f => ({ ...f, price: Number(e.target.value) || undefined }))}
                className="w-full border rounded px-3 py-2 text-sm"
              />
            </div>
          )}
          <div>
            <label className="block text-sm font-medium mb-1">Mode</label>
            <div className="flex items-center gap-2 mt-1">
              <button type="button"
                className={`px-3 py-1.5 text-sm rounded ${form.mode === 'paper' ? 'bg-blue-600 text-white' : 'bg-gray-100'}`}
                onClick={() => setForm(f => ({ ...f, mode: 'paper' }))}>
                Paper
              </button>
              <button type="button"
                className={`px-3 py-1.5 text-sm rounded ${form.mode === 'live' ? 'bg-red-600 text-white' : 'bg-gray-100'}`}
                onClick={() => setForm(f => ({ ...f, mode: 'live' }))}>
                Live
              </button>
            </div>
          </div>
          <div className="flex items-end">
            <button type="submit" disabled={submitting}
              className="bg-primary text-primary-foreground px-6 py-2 rounded text-sm font-medium disabled:opacity-50 flex items-center gap-2">
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlayCircle className="h-4 w-4" />}
              Submit Order
            </button>
          </div>
        </form>
      </div>

      {error && (
        <div className="bg-destructive/10 text-destructive px-4 py-3 rounded text-sm">{error}</div>
      )}

      {/* Order List */}
      <div className="bg-card border rounded-lg">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="font-semibold flex items-center gap-2">
            <Clock className="h-4 w-4" /> Orders
          </h2>
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
              className="border rounded px-2 py-1 text-sm">
              <option value="">All</option>
              <option value="created">Created</option>
              <option value="filled">Filled</option>
              <option value="cancelled">Cancelled</option>
            </select>
            <button onClick={fetchOrders} className="p-1 hover:bg-accent rounded">
              <RefreshCw className="h-4 w-4" />
            </button>
          </div>
        </div>
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : orders.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">No orders yet</div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left px-4 py-2">Symbol</th>
                    <th className="text-left px-4 py-2">Direction</th>
                    <th className="text-left px-4 py-2">Type</th>
                    <th className="text-right px-4 py-2">Qty</th>
                    <th className="text-right px-4 py-2">Price</th>
                    <th className="text-left px-4 py-2">Status</th>
                    <th className="text-left px-4 py-2">Mode</th>
                    <th className="text-left px-4 py-2">Time</th>
                    <th className="text-right px-4 py-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map(order => (
                    <tr key={order.id} className="border-t hover:bg-muted/30">
                      <td className="px-4 py-2 font-mono">{order.symbol}</td>
                      <td className="px-4 py-2">
                        <span className={`inline-flex items-center gap-1 ${order.direction === 'buy' ? 'text-green-600' : 'text-red-600'}`}>
                          {order.direction === 'buy' ? <ArrowUpCircle className="h-3 w-3" /> : <ArrowDownCircle className="h-3 w-3" />}
                          {order.direction.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-4 py-2">{order.order_type}</td>
                      <td className="px-4 py-2 text-right">{order.quantity}</td>
                      <td className="px-4 py-2 text-right">{order.avg_fill_price ?? order.price ?? '-'}</td>
                      <td className="px-4 py-2">
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[order.status] || ''}`}>
                          {order.status}
                        </span>
                      </td>
                      <td className="px-4 py-2">
                        <span className={`text-xs px-1.5 py-0.5 rounded ${order.mode === 'paper' ? 'bg-blue-50 text-blue-600' : 'bg-red-50 text-red-600'}`}>
                          {order.mode}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-muted-foreground">{new Date(order.created_at).toLocaleString()}</td>
                      <td className="px-4 py-2 text-right">
                        {['created', 'submitted'].includes(order.status) && (
                          <button onClick={() => handleCancel(order.id)}
                            className="text-red-600 hover:text-red-800 p-1" title="Cancel">
                            <XCircle className="h-4 w-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="p-4 border-t text-sm text-muted-foreground">
              {orders.length} order(s)
            </div>
          </>
        )}
      </div>
    </div>
  )
}
