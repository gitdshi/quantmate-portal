import {
  AlertCircle,
  RefreshCw,
  Wallet,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { tradingAPI } from '../lib/api'

interface GatewayPosition {
  symbol: string
  direction: string
  volume: number
  frozen: number
  price: number
  pnl: number
  gateway_name: string
}

interface GatewayAccount {
  account_id: string
  balance: number
  available: number
  frozen: number
  margin: number
  gateway_name: string
}

interface GatewayInfo {
  name: string
  type: string
  connected: boolean
}

export default function Positions() {
  const [gateways, setGateways] = useState<GatewayInfo[]>([])
  const [positions, setPositions] = useState<GatewayPosition[]>([])
  const [account, setAccount] = useState<GatewayAccount | null>(null)
  const [selectedGateway, setSelectedGateway] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadGateways()
  }, [])

  useEffect(() => {
    if (selectedGateway) {
      loadPositions()
      loadAccount()
    }
  }, [selectedGateway])

  const loadGateways = async () => {
    try {
      const { data } = await tradingAPI.listGateways()
      const gws = data.gateways ?? []
      setGateways(gws)
      const connected = gws.find((g: GatewayInfo) => g.connected)
      if (connected) setSelectedGateway(connected.name)
      else if (gws.length > 0) setSelectedGateway(gws[0].name)
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load gateways')
    }
  }

  const loadPositions = async () => {
    try {
      setLoading(true)
      setError(null)
      const { data } = await tradingAPI.getGatewayPositions({ gateway_name: selectedGateway })
      setPositions(data.positions ?? [])
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load positions')
    } finally {
      setLoading(false)
    }
  }

  const loadAccount = async () => {
    try {
      const { data } = await tradingAPI.getGatewayAccount({ gateway_name: selectedGateway })
      setAccount(data.account ?? null)
    } catch {
      /* account info optional */
    }
  }

  const totalPnl = positions.reduce((sum, p) => sum + p.pnl, 0)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Wallet size={24} className="text-blue-400" />
          <h1 className="text-2xl font-bold text-white">Positions</h1>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={selectedGateway}
            onChange={(e) => setSelectedGateway(e.target.value)}
            className="rounded bg-gray-700 px-3 py-1.5 text-sm text-white"
          >
            {gateways.length === 0 && <option value="">No gateways</option>}
            {gateways.map((g) => (
              <option key={g.name} value={g.name}>
                {g.name} ({g.type}) {g.connected ? '●' : '○'}
              </option>
            ))}
          </select>
          <button
            onClick={() => { loadPositions(); loadAccount() }}
            className="flex items-center gap-2 rounded bg-gray-700 px-3 py-1.5 text-sm text-gray-300 hover:bg-gray-600"
          >
            <RefreshCw size={14} />
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded bg-red-500/10 px-4 py-3 text-red-400">
          <AlertCircle size={16} />
          {error}
        </div>
      )}

      {/* Account Summary */}
      {account && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
          {[
            { label: 'Balance', value: account.balance.toFixed(2) },
            { label: 'Available', value: account.available.toFixed(2) },
            { label: 'Frozen', value: account.frozen.toFixed(2) },
            { label: 'Margin', value: account.margin.toFixed(2) },
            { label: 'Total P&L', value: totalPnl.toFixed(2), color: totalPnl >= 0 ? 'text-green-400' : 'text-red-400' },
          ].map((m) => (
            <div key={m.label} className="rounded-lg border border-gray-700 bg-gray-800 p-3">
              <p className="text-xs text-gray-400">{m.label}</p>
              <p className={`text-lg font-bold ${m.color || 'text-white'}`}>{m.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Positions Table */}
      {loading && <p className="text-gray-400">Loading...</p>}

      {!loading && (
        <div className="overflow-x-auto rounded-lg border border-gray-700">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-gray-700 bg-gray-800/50 text-gray-400">
              <tr>
                <th className="px-4 py-3">Symbol</th>
                <th className="px-4 py-3">Direction</th>
                <th className="px-4 py-3">Volume</th>
                <th className="px-4 py-3">Frozen</th>
                <th className="px-4 py-3">Price</th>
                <th className="px-4 py-3">P&L</th>
                <th className="px-4 py-3">Gateway</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700/50">
              {positions.map((p, i) => (
                <tr key={`${p.symbol}-${p.direction}-${i}`} className="text-gray-300">
                  <td className="px-4 py-3 font-mono">{p.symbol}</td>
                  <td className="px-4 py-3">
                    <span className={p.direction === 'long' || p.direction === 'buy' ? 'text-green-400' : 'text-red-400'}>
                      {p.direction.toUpperCase()}
                    </span>
                  </td>
                  <td className="px-4 py-3">{p.volume}</td>
                  <td className="px-4 py-3">{p.frozen}</td>
                  <td className="px-4 py-3 font-mono">{p.price.toFixed(2)}</td>
                  <td className={`px-4 py-3 font-mono ${p.pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {p.pnl >= 0 ? '+' : ''}{p.pnl.toFixed(2)}
                  </td>
                  <td className="px-4 py-3 text-gray-500">{p.gateway_name}</td>
                </tr>
              ))}
              {positions.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-gray-500">
                    {selectedGateway ? 'No positions for this gateway' : 'Select a gateway to view positions'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
