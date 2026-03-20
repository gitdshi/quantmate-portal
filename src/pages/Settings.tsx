import { AlertCircle, CheckCircle2, Loader2, RefreshCw, Settings as SettingsIcon, ToggleLeft, ToggleRight, Wifi } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { dataSourceAPI, systemAPI } from '../lib/api'

interface DataSourceItem {
  item_key: string
  name: string
  source: string
  api_identifier: string
  permission_level: string
  enabled: boolean
  last_sync?: string
  status?: string
}

interface ConnectionTestResult {
  source: string
  status: 'idle' | 'testing' | 'success' | 'error'
  message?: string
}

const PERMISSION_STYLES: Record<string, string> = {
  '基础': 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  '无需Token': 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  '积分 ≥ 2000': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  '积分 ≥ 5000': 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
}

function getPermissionBadgeClass(level: string): string {
  return PERMISSION_STYLES[level] || 'bg-muted text-muted-foreground'
}

export default function Settings() {
  const [items, setItems] = useState<DataSourceItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [updatingItems, setUpdatingItems] = useState<Set<string>>(new Set())
  const [connectionTests, setConnectionTests] = useState<Record<string, ConnectionTestResult>>({})
  const [rtLoading, setRtLoading] = useState(false)
  const [rtError, setRtError] = useState<string | null>(null)
  const [rtConfig, setRtConfig] = useState({
    enabled: true,
    cacheEnabled: true,
    markets: {
      CN: true,
      HK: true,
      US: true,
      FUTURES: true,
      FX: true,
      CRYPTO: true,
    },
  })

  const fetchItems = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await dataSourceAPI.listItems()
      const payload = response?.data?.data ?? response?.data ?? []
      setItems(Array.isArray(payload) ? payload : [])
    } catch {
      setError('Failed to load data source items')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchItems()
  }, [fetchItems])

  const toggleItem = async (itemKey: string, source: string, enabled: boolean) => {
    const key = `${source}:${itemKey}`
    setUpdatingItems((prev) => new Set(prev).add(key))
    try {
      await dataSourceAPI.updateItem(itemKey, { enabled, source })
      setItems((prev) =>
        prev.map((item) =>
          item.item_key === itemKey && item.source === source ? { ...item, enabled } : item
        )
      )
    } catch {
      // Revert on failure
    } finally {
      setUpdatingItems((prev) => {
        const next = new Set(prev)
        next.delete(key)
        return next
      })
    }
  }

  const toggleAllForSource = async (source: string, enabled: boolean) => {
    const sourceItems = items.filter((item) => item.source === source)
    const batchData = {
      items: sourceItems.map((item) => ({ source: item.source, item_key: item.item_key, enabled })),
    }

    sourceItems.forEach((item) =>
      setUpdatingItems((prev) => new Set(prev).add(`${item.source}:${item.item_key}`))
    )

    try {
      await dataSourceAPI.batchUpdate(batchData)
      setItems((prev) =>
        prev.map((item) => (item.source === source ? { ...item, enabled } : item))
      )
    } catch {
      // Revert on failure
    } finally {
      setUpdatingItems(new Set())
    }
  }

  const testConnection = async (source: string) => {
    setConnectionTests((prev) => ({
      ...prev,
      [source]: { source, status: 'testing' },
    }))

    try {
      const response = await dataSourceAPI.testConnection(source)
      const status = response.data?.status === 'ok' ? 'success' : 'error'
      setConnectionTests((prev) => ({
        ...prev,
        [source]: {
          source,
          status,
          message: response.data?.message || (status === 'success' ? 'Connected' : 'Connection failed'),
        },
      }))
    } catch {
      setConnectionTests((prev) => ({
        ...prev,
        [source]: { source, status: 'error', message: 'Connection failed' },
      }))
    }
  }

  const sources = [...new Set(items.map((item) => item.source))]

  const getSourceStats = (source: string) => {
    const sourceItems = items.filter((item) => item.source === source)
    const enabledCount = sourceItems.filter((item) => item.enabled).length
    return { total: sourceItems.length, enabled: enabledCount }
  }

  const rtMarketList = useMemo(() => ([
    { key: 'CN', label: 'CN A-shares' },
    { key: 'HK', label: 'HK stocks (delayed)' },
    { key: 'US', label: 'US stocks (delayed)' },
    { key: 'FUTURES', label: 'Futures (CN)' },
    { key: 'FX', label: 'FX' },
    { key: 'CRYPTO', label: 'Crypto' },
  ]), [])

  const parseBool = (value: any, fallback: boolean) => {
    if (value === undefined || value === null) return fallback
    const raw = String(value).trim().toLowerCase()
    return raw === '1' || raw === 'true' || raw === 'yes' || raw === 'on'
  }

  const loadRealtimeConfig = useCallback(async () => {
    setRtLoading(true)
    setRtError(null)
    try {
      const res = await systemAPI.listConfigs('realtime_quotes')
      const configs = res.data?.configs || []
      const getValue = (key: string) =>
        configs.find((c: any) => c.config_key === key)?.config_value
      const enabled = parseBool(getValue('realtime_quote_enabled'), true)
      const cacheEnabled = parseBool(getValue('realtime_quote_cache_enabled'), true)
      const marketsRaw = String(getValue('realtime_quote_markets') || '').trim()
      const enabledMarkets = new Set(
        marketsRaw ? marketsRaw.split(',').map((m: string) => m.trim().toUpperCase()).filter(Boolean) : []
      )
      setRtConfig((prev) => ({
        enabled,
        cacheEnabled,
        markets: {
          CN: enabledMarkets.size ? enabledMarkets.has('CN') : prev.markets.CN,
          HK: enabledMarkets.size ? enabledMarkets.has('HK') : prev.markets.HK,
          US: enabledMarkets.size ? enabledMarkets.has('US') : prev.markets.US,
          FUTURES: enabledMarkets.size ? enabledMarkets.has('FUTURES') : prev.markets.FUTURES,
          FX: enabledMarkets.size ? enabledMarkets.has('FX') : prev.markets.FX,
          CRYPTO: enabledMarkets.size ? enabledMarkets.has('CRYPTO') : prev.markets.CRYPTO,
        },
      }))
    } catch {
      setRtError('Failed to load realtime settings')
    } finally {
      setRtLoading(false)
    }
  }, [])

  useEffect(() => {
    loadRealtimeConfig()
  }, [loadRealtimeConfig])

  const saveRealtimeConfig = async (next: typeof rtConfig) => {
    setRtConfig(next)
    try {
      const markets = Object.entries(next.markets)
        .filter(([, enabled]) => enabled)
        .map(([key]) => key)
        .join(',')
      await Promise.all([
        systemAPI.upsertConfig({
          config_key: 'realtime_quote_enabled',
          config_value: next.enabled ? 'true' : 'false',
          category: 'realtime_quotes',
          description: 'Enable realtime quote fetch',
        }),
        systemAPI.upsertConfig({
          config_key: 'realtime_quote_cache_enabled',
          config_value: next.cacheEnabled ? 'true' : 'false',
          category: 'realtime_quotes',
          description: 'Enable realtime quote caching',
        }),
        systemAPI.upsertConfig({
          config_key: 'realtime_quote_markets',
          config_value: markets,
          category: 'realtime_quotes',
          description: 'Enabled markets for realtime quotes',
        }),
      ])
      setRtError(null)
    } catch {
      setRtError('Failed to save realtime settings')
    }
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Settings</h1>
          <p className="text-muted-foreground mt-2">
            Manage data sources and system configuration
          </p>
        </div>
        <button
          onClick={() => {
            fetchItems()
            loadRealtimeConfig()
          }}
          className="p-2 rounded-md hover:bg-accent transition-colors"
          title="Refresh"
        >
          <RefreshCw className="h-5 w-5" />
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : error ? (
        <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-6 text-center">
          <AlertCircle className="h-8 w-8 text-destructive mx-auto mb-2" />
          <p className="text-destructive">{error}</p>
          <button
            onClick={fetchItems}
            className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
          >
            Retry
          </button>
        </div>
      ) : (
      <>

      {/* Realtime Quote Settings */}
      <div className="bg-card border border-border rounded-lg p-6 space-y-4">
        <div className="flex items-center gap-3">
          <SettingsIcon className="h-5 w-5 text-primary" />
          <div>
            <h2 className="text-lg font-semibold">Realtime Quote Settings</h2>
            <p className="text-sm text-muted-foreground">
              Control realtime quotes and intraday caching for Market Data.
            </p>
          </div>
        </div>

        {rtLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading realtime settings...
          </div>
        ) : rtError ? (
          <div className="text-sm text-red-500">{rtError}</div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium">Enable realtime quotes</div>
                <div className="text-xs text-muted-foreground">
                  Turns realtime quote fetching on/off globally.
                </div>
              </div>
              <button
                onClick={() => saveRealtimeConfig({ ...rtConfig, enabled: !rtConfig.enabled })}
                className="text-primary"
              >
                {rtConfig.enabled ? <ToggleRight className="h-6 w-6 text-primary" /> : <ToggleLeft className="h-6 w-6 text-muted-foreground" />}
              </button>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium">Cache intraday series</div>
                <div className="text-xs text-muted-foreground">
                  Store 24h realtime points in Redis for charts.
                </div>
              </div>
              <button
                onClick={() => saveRealtimeConfig({ ...rtConfig, cacheEnabled: !rtConfig.cacheEnabled })}
                className="text-primary"
              >
                {rtConfig.cacheEnabled ? <ToggleRight className="h-6 w-6 text-primary" /> : <ToggleLeft className="h-6 w-6 text-muted-foreground" />}
              </button>
            </div>

            <div>
              <div className="text-sm font-medium mb-2">Enabled markets</div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {rtMarketList.map((market) => (
                  <label key={market.key} className="flex items-center justify-between border border-border rounded-md px-3 py-2">
                    <span className="text-sm">{market.label}</span>
                    <button
                      onClick={() =>
                        saveRealtimeConfig({
                          ...rtConfig,
                          markets: { ...rtConfig.markets, [market.key]: !rtConfig.markets[market.key as keyof typeof rtConfig.markets] },
                        })
                      }
                      className="text-primary"
                    >
                      {rtConfig.markets[market.key as keyof typeof rtConfig.markets]
                        ? <ToggleRight className="h-5 w-5 text-primary" />
                        : <ToggleLeft className="h-5 w-5 text-muted-foreground" />}
                    </button>
                  </label>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Data Source Item Toggle Management */}
      <div className="bg-card border border-border rounded-lg">
        <div className="p-6 border-b border-border">
          <div className="flex items-center gap-3">
            <SettingsIcon className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">Data Item Toggle Management</h2>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Disabled items will not consume API quota. Existing data is not affected.
          </p>
          <div className="mt-2">
            <span className="text-sm font-medium">
              Enabled: {items.filter((i) => i.enabled).length} / {items.length} items
            </span>
          </div>
        </div>

        {sources.map((source) => {
          const stats = getSourceStats(source)
          const connTest = connectionTests[source]
          const sourceItems = items.filter((item) => item.source === source)

          return (
            <div key={source} className="border-b border-border last:border-b-0">
              {/* Source Header */}
              <div className="px-6 py-4 bg-muted/50 flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-3">
                  <h3 className="font-semibold capitalize">{source}</h3>
                  <span className="text-sm text-muted-foreground">
                    ({stats.enabled}/{stats.total} enabled)
                  </span>
                  {connTest?.status === 'success' && (
                    <span className="inline-flex items-center gap-1 text-xs bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 px-2 py-0.5 rounded-full">
                      <CheckCircle2 className="h-3 w-3" /> Connected
                    </span>
                  )}
                  {connTest?.status === 'error' && (
                    <span className="inline-flex items-center gap-1 text-xs bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 px-2 py-0.5 rounded-full">
                      <AlertCircle className="h-3 w-3" /> {connTest.message}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => testConnection(source)}
                    disabled={connTest?.status === 'testing'}
                    className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-md border border-border hover:bg-accent disabled:opacity-50 transition-colors"
                  >
                    {connTest?.status === 'testing' ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Wifi className="h-3 w-3" />
                    )}
                    Test Connection
                  </button>
                  <button
                    onClick={() => toggleAllForSource(source, true)}
                    className="px-3 py-1.5 text-xs font-medium rounded-md border border-border hover:bg-accent transition-colors"
                  >
                    Enable All
                  </button>
                  <button
                    onClick={() => toggleAllForSource(source, false)}
                    className="px-3 py-1.5 text-xs font-medium rounded-md border border-border hover:bg-accent transition-colors"
                  >
                    Disable All
                  </button>
                </div>
              </div>

              {/* Items Table */}
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="text-left text-xs text-muted-foreground border-b border-border">
                      <th className="px-6 py-3 w-16">Toggle</th>
                      <th className="px-6 py-3">Data Item</th>
                      <th className="px-6 py-3">API Identifier</th>
                      <th className="px-6 py-3">Permission</th>
                      <th className="px-6 py-3">Last Sync</th>
                      <th className="px-6 py-3">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sourceItems.map((item) => (
                      <tr
                        key={item.item_key}
                        className="border-b border-border last:border-b-0 hover:bg-muted/30 transition-colors"
                      >
                        <td className="px-6 py-3">
                          <button
                            onClick={() => toggleItem(item.item_key, item.source, !item.enabled)}
                            disabled={updatingItems.has(`${item.source}:${item.item_key}`)}
                            className="text-primary disabled:opacity-50"
                            aria-label={`Toggle ${item.name}`}
                          >
                            {updatingItems.has(`${item.source}:${item.item_key}`) ? (
                              <Loader2 className="h-5 w-5 animate-spin" />
                            ) : item.enabled ? (
                              <ToggleRight className="h-6 w-6 text-primary" />
                            ) : (
                              <ToggleLeft className="h-6 w-6 text-muted-foreground" />
                            )}
                          </button>
                        </td>
                        <td className="px-6 py-3 text-sm font-medium">{item.name}</td>
                        <td className="px-6 py-3 text-sm font-mono text-muted-foreground">
                          {item.api_identifier}
                        </td>
                        <td className="px-6 py-3">
                          <span
                            className={`inline-block text-xs px-2 py-0.5 rounded-full ${getPermissionBadgeClass(item.permission_level)}`}
                          >
                            {item.permission_level}
                          </span>
                        </td>
                        <td className="px-6 py-3 text-sm text-muted-foreground">
                          {item.last_sync || '—'}
                        </td>
                        <td className="px-6 py-3">
                          <span
                            className={`inline-block text-xs px-2 py-0.5 rounded-full ${
                              item.enabled
                                ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                                : 'bg-muted text-muted-foreground'
                            }`}
                          >
                            {item.enabled ? 'Enabled' : 'Disabled'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )
        })}

        {items.length === 0 && (
          <div className="p-12 text-center text-muted-foreground">
            No data source items configured
          </div>
        )}
      </div>
      </>
      )}
    </div>
  )
}
