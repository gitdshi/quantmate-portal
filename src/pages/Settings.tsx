import { AlertCircle, CheckCircle2, Loader2, RefreshCw, Settings as SettingsIcon, ToggleLeft, ToggleRight, Wifi } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { dataSourceAPI } from '../lib/api'

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

  const fetchItems = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await dataSourceAPI.listItems()
      setItems(response.data)
    } catch {
      setError('Failed to load data source items')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchItems()
  }, [fetchItems])

  const toggleItem = async (itemKey: string, enabled: boolean) => {
    setUpdatingItems((prev) => new Set(prev).add(itemKey))
    try {
      await dataSourceAPI.updateItem(itemKey, { enabled })
      setItems((prev) =>
        prev.map((item) => (item.item_key === itemKey ? { ...item, enabled } : item))
      )
    } catch {
      // Revert on failure
    } finally {
      setUpdatingItems((prev) => {
        const next = new Set(prev)
        next.delete(itemKey)
        return next
      })
    }
  }

  const toggleAllForSource = async (source: string, enabled: boolean) => {
    const sourceItems = items.filter((item) => item.source === source)
    const batchData = {
      items: sourceItems.map((item) => ({ item_key: item.item_key, enabled })),
    }

    sourceItems.forEach((item) =>
      setUpdatingItems((prev) => new Set(prev).add(item.item_key))
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
      setConnectionTests((prev) => ({
        ...prev,
        [source]: {
          source,
          status: response.data?.ok ? 'success' : 'error',
          message: response.data?.message || (response.data?.ok ? 'Connected' : 'Connection failed'),
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

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Settings</h1>
          <p className="text-muted-foreground mt-2">Manage data sources and system configuration</p>
        </div>
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
      </div>
    )
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
          onClick={fetchItems}
          className="p-2 rounded-md hover:bg-accent transition-colors"
          title="Refresh"
        >
          <RefreshCw className="h-5 w-5" />
        </button>
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
                            onClick={() => toggleItem(item.item_key, !item.enabled)}
                            disabled={updatingItems.has(item.item_key)}
                            className="text-primary disabled:opacity-50"
                            aria-label={`Toggle ${item.name}`}
                          >
                            {updatingItems.has(item.item_key) ? (
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
    </div>
  )
}
