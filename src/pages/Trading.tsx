import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  ArrowDownCircle, ArrowUpCircle, Clock, Filter, Loader2,
  PlayCircle, RefreshCw, XCircle
} from 'lucide-react'
import { tradingAPI } from '../lib/api'
import type { Order } from '../types'

type OrderFormData = {
  symbol: string
  direction: 'buy' | 'sell'
  order_type: 'market' | 'limit' | 'stop' | 'stop_limit'
  quantity: number
  price?: number
  gateway_name: string
}

interface GatewayInfo {
  name: string
  type: string
  connected: boolean
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
  const { t } = useTranslation(['trading', 'common'])
  const [orders, setOrders] = useState<Order[]>([])
  const [gateways, setGateways] = useState<GatewayInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [form, setForm] = useState<OrderFormData>({
    symbol: '', direction: 'buy', order_type: 'market', quantity: 100, gateway_name: '',
  })

  const fetchOrders = useCallback(async () => {
    setLoading(true)
    try {
      const params: Record<string, unknown> = { page_size: 200, mode: 'live' }
      if (statusFilter) params.status = statusFilter
      const { data } = await tradingAPI.listOrders(params as any)
      const result = data as any
      setOrders(result.data || result || [])
    } catch {
      setError(t('live.loadFailed'))
    } finally {
      setLoading(false)
    }
  }, [statusFilter])

  useEffect(() => { fetchOrders() }, [fetchOrders])

  useEffect(() => {
    tradingAPI.listGateways().then(({ data }) => {
      const gws = data.gateways ?? []
      setGateways(gws)
      const connected = gws.find((g: GatewayInfo) => g.connected)
      if (connected) setForm(f => ({ ...f, gateway_name: connected.name }))
    }).catch(() => {})
  }, [])

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
        mode: 'live',
        gateway_name: form.gateway_name || undefined,
      })
      setForm(f => ({ ...f, symbol: '', quantity: 100, price: undefined }))
      fetchOrders()
    } catch (err: any) {
      setError(err?.response?.data?.message || t('live.orderFailed'))
    } finally {
      setSubmitting(false)
    }
  }

  const handleCancel = async (id: number) => {
    try {
      await tradingAPI.cancelOrder(id)
      fetchOrders()
    } catch {
      setError(t('live.cancelFailed'))
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{t('live.title')}</h1>

      {/* Order Form */}
      <div className="bg-card border rounded-lg p-6">
        <h2 className="text-lg font-semibold mb-4">{t('live.newOrder')}</h2>
        <form onSubmit={handleSubmit} className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">{t('order.symbol')}</label>
            <input
              type="text" placeholder="000001.SZ" value={form.symbol}
              onChange={e => setForm(f => ({ ...f, symbol: e.target.value }))}
              className="w-full border rounded px-3 py-2 text-sm"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">{t('order.direction')}</label>
            <select value={form.direction} onChange={e => setForm(f => ({ ...f, direction: e.target.value as any }))}
              className="w-full border rounded px-3 py-2 text-sm">
              <option value="buy">{t('order.buy')}</option>
              <option value="sell">{t('order.sell')}</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">{t('order.type')}</label>
            <select value={form.order_type} onChange={e => setForm(f => ({ ...f, order_type: e.target.value as any }))}
              className="w-full border rounded px-3 py-2 text-sm">
              <option value="market">{t('order.market')}</option>
              <option value="limit">{t('order.limit')}</option>
              <option value="stop">{t('order.stop')}</option>
              <option value="stop_limit">{t('order.stopLimit')}</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">{t('order.quantity')}</label>
            <input
              type="number" min={1} value={form.quantity}
              onChange={e => setForm(f => ({ ...f, quantity: Number(e.target.value) }))}
              className="w-full border rounded px-3 py-2 text-sm"
              required
            />
          </div>
          {form.order_type !== 'market' && (
            <div>
              <label className="block text-sm font-medium mb-1">{t('order.price')}</label>
              <input
                type="number" step="0.01" value={form.price || ''}
                onChange={e => setForm(f => ({ ...f, price: Number(e.target.value) || undefined }))}
                className="w-full border rounded px-3 py-2 text-sm"
              />
            </div>
          )}
          <div>
            <label className="block text-sm font-medium mb-1">{t('order.gateway')}</label>
            <select
              value={form.gateway_name}
              onChange={e => setForm(f => ({ ...f, gateway_name: e.target.value }))}
              className="w-full border rounded px-3 py-2 text-sm"
            >
              <option value="">{t('order.selectGateway')}</option>
              {gateways.map(g => (
                <option key={g.name} value={g.name}>
                  {g.name} ({g.type}) {g.connected ? '●' : '○'}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-end">
            <button type="submit" disabled={submitting}
              className="bg-primary text-primary-foreground px-6 py-2 rounded text-sm font-medium disabled:opacity-50 flex items-center gap-2">
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlayCircle className="h-4 w-4" />}
              {t('live.submitOrder')}
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
            <Clock className="h-4 w-4" /> {t('order.orders')}
          </h2>
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
              className="border rounded px-2 py-1 text-sm">
              <option value="">All</option>
              <option value="created">{t('status.created')}</option>
              <option value="filled">{t('status.filled')}</option>
              <option value="cancelled">{t('status.cancelled')}</option>
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
          <div className="text-center py-12 text-muted-foreground">{t('order.noOrders')}</div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left px-4 py-2">{t('order.symbol')}</th>
                    <th className="text-left px-4 py-2">{t('order.direction')}</th>
                    <th className="text-left px-4 py-2">{t('order.type')}</th>
                    <th className="text-right px-4 py-2">{t('order.quantity')}</th>
                    <th className="text-right px-4 py-2">{t('order.price')}</th>
                    <th className="text-left px-4 py-2">{t('order.status')}</th>
                    <th className="text-left px-4 py-2">{t('order.time')}</th>
                    <th className="text-right px-4 py-2">{t('order.actions')}</th>
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
              {t('order.orderCount', { count: orders.length })}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
