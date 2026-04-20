import axios from 'axios'
import { useAuthStore } from '../stores/auth'
import type { StrategyComparison, StrategyFile, StrategyFileContent, SyncResult } from '../types'

const API_URL = import.meta.env.VITE_API_URL || '/api/v1'
const TUSHARE_BROWSER_TIMEOUT_MS = 30000

export type SystemLogStreamEvent = {
  type: 'meta' | 'log' | 'error'
  module: string
  container?: string
  line?: string
  message?: string
  tail?: number
}

type StreamLogsOptions = {
  module: string
  tail?: number
  signal?: AbortSignal
  onEvent: (event: SystemLogStreamEvent) => void
}

export const api = axios.create({
  baseURL: API_URL,
  timeout: 8000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// Response interceptor to handle auth errors
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config

    const detail = error.response?.data?.detail
    const detailText = typeof detail === 'string' ? detail : ''
    if (error.response?.status === 403 && detailText.toLowerCase().includes('password change required')) {
      const currentPath = window.location.pathname + window.location.search
      if (!window.location.pathname.startsWith('/change-password')) {
        sessionStorage.setItem('post_change_redirect', currentPath)
        sessionStorage.setItem('force_change_password', '1')
        window.location.href = '/change-password'
      }
      return Promise.reject(error)
    }

    if (error.response?.status === 401 && !originalRequest._retry) {
      // Skip token refresh for auth endpoints — let the caller handle the error
      const url = originalRequest.url || ''
      if (url.includes('/auth/login') || url.includes('/auth/register')) {
        return Promise.reject(error)
      }

      originalRequest._retry = true

      try {
        const refreshToken = localStorage.getItem('refresh_token')
        if (refreshToken) {
          const { data } = await axios.post(`${API_URL}/auth/refresh`, {
            refresh_token: refreshToken,
          })

          localStorage.setItem('access_token', data.access_token)
          if (data.refresh_token) {
            localStorage.setItem('refresh_token', data.refresh_token)
          }
          useAuthStore.setState((state) => ({
            ...state,
            accessToken: data.access_token,
            refreshToken: data.refresh_token ?? state.refreshToken,
            isAuthenticated: true,
          }))
          originalRequest.headers.Authorization = `Bearer ${data.access_token}`

          return api(originalRequest)
        } else {
          // No refresh token: clear auth state and redirect immediately
          try { useAuthStore.getState().logout() } catch (e) { /* ignore */ }
          localStorage.removeItem('access_token')
          localStorage.removeItem('refresh_token')
          window.location.href = '/login'
          return Promise.reject(error)
        }
      } catch (refreshError) {
        // Clear auth state and tokens, then redirect to login
        try {
          useAuthStore.getState().logout()
        } catch (e) {
          // ignore errors during logout
        }
        localStorage.removeItem('access_token')
        localStorage.removeItem('refresh_token')
        window.location.href = '/login'
        return Promise.reject(refreshError)
      }
    }

    if (error.response?.status === 401) {
      try { useAuthStore.getState().logout() } catch (e) { /* ignore */ }
      localStorage.removeItem('access_token')
      localStorage.removeItem('refresh_token')
      if (!window.location.pathname.startsWith('/login')) {
        window.location.href = '/login'
      }
    }

    return Promise.reject(error)
  }
)

// Auth API
export const authAPI = {
  login: (username: string, password: string) =>
    api.post('/auth/login', { username, password }),

  register: (username: string, email: string, password: string) =>
    api.post('/auth/register', { username, email, password }),

  me: () => api.get('/auth/me'),

  refresh: (refreshToken: string) =>
    api.post('/auth/refresh', { refresh_token: refreshToken }),

  changePassword: (currentPassword: string, newPassword: string) =>
    api.post('/auth/change-password', {
      current_password: currentPassword,
      new_password: newPassword,
    }),
}

// Strategies API
export const strategiesAPI = {
  list: () => api.get('/strategies'),
  
  get: (id: number) => api.get(`/strategies/${id}`),
  
  create: (data: any) => api.post('/strategies', data),
  
  update: (id: number, data: any) => api.put(`/strategies/${id}`, data),
  
  delete: (id: number) => api.delete(`/strategies/${id}`),
  
  listBuiltin: () => api.get('/strategies/builtin/list'),

  // Multi-factor strategy endpoints
  getFactors: (strategyId: number) => api.get(`/strategies/${strategyId}/factors`),

  generateMultiFactorCode: (data: {
    name: string
    class_name: string
    factors: Array<{
      factor_id?: number
      factor_name: string
      expression?: string
      weight?: number
      direction?: number
      factor_set?: string
    }>
    lookback_window?: number
    rebalance_interval?: number
    fixed_size?: number
    signal_threshold?: number
  }) => api.post('/strategies/multi-factor/generate-code', data),

  createMultiFactor: (data: {
    name: string
    class_name: string
    description?: string
    factors: Array<{
      factor_id?: number
      factor_name: string
      expression?: string
      weight?: number
      direction?: number
      factor_set?: string
    }>
    lookback_window?: number
    rebalance_interval?: number
    fixed_size?: number
    signal_threshold?: number
  }) => api.post('/strategies/multi-factor/create', data),

  generateQlibConfig: (data: {
    factors: Array<{
      factor_name: string
      expression?: string
      weight?: number
      direction?: number
    }>
    universe?: string
    start_date: string
    end_date: string
    strategy_type?: string
    topk?: number
    n_drop?: number
  }) => api.post('/strategies/multi-factor/qlib-config', data),
}

// Backtest API
export const backtestAPI = {
  submit: (data: any) => api.post('/backtest', data),
  
  submitBatch: (data: any) => api.post('/backtest/batch', data),
  
  getStatus: (jobId: string) => api.get(`/backtest/${jobId}`),
  
  getHistory: () => api.get('/backtest/history/list'),
  
  cancel: (jobId: string) => api.post(`/backtest/${jobId}/cancel`),
}

// Queue API
export const queueAPI = {
  getStats: () => api.get('/queue/stats'),
  stats: () => api.get('/queue/stats'),
  
  listJobs: (status?: string, limit?: number) =>
    api.get('/queue/jobs', { params: { status, limit } }),
  
  getJob: (jobId: string) => api.get(`/queue/jobs/${jobId}`),
  
  cancelJob: (jobId: string) => api.post(`/queue/jobs/${jobId}/cancel`),
  
  deleteJob: (jobId: string) => api.delete(`/queue/jobs/${jobId}`),
  
  submitBacktest: (data: {
    strategy_id?: number
    strategy_class?: string
    strategy_name?: string
    symbol: string
    symbol_name?: string
    start_date: string
    end_date: string
    initial_capital?: number
    rate?: number
    slippage?: number
    benchmark?: string
    parameters?: Record<string, unknown>
    engine_type?: 'vnpy' | 'qlib'
    // Qlib-specific options (used when engine_type='qlib')
    model_type?: string
    factor_set?: string
    universe?: string
    strategy_type?: string
    topk?: number
    n_drop?: number
    hyperparams?: Record<string, unknown>
  }) => api.post('/queue/backtest', data),

  submitBulkBacktest: (data: {
    strategy_id?: number
    strategy_class?: string
    strategy_name?: string
    symbols: string[]
    symbol_names?: string[]
    start_date: string
    end_date: string
    initial_capital?: number
    rate?: number
    slippage?: number
    benchmark?: string
    parameters?: Record<string, unknown>
  }) => api.post('/queue/bulk-backtest', data),

  getBulkJobResults: (jobId: string, page = 1, pageSize = 10, sortOrder: 'asc' | 'desc' = 'desc') =>
    api.get(`/queue/bulk-jobs/${jobId}/results`, { params: { page, page_size: pageSize, sort_order: sortOrder } }),

  getBulkJobSummary: (jobId: string) =>
    api.get(`/queue/bulk-jobs/${jobId}/summary`),
}

// Market Data API
export const marketDataAPI = {
  symbols: (exchange?: string, keyword?: string, limit?: number, offset?: number) => {
    // Map UI market values to backend exchange codes where appropriate.
    // UI uses values like 'CN', 'US', 'HK' — backend expects TS exchange codes like 'SZ','SH', or accepts undefined for no filter.
    let exchParam: string | undefined = undefined
    if (exchange && exchange.trim() !== '') {
      const up = exchange.toUpperCase()
      if (up === 'CN') {
        // CN means both Shanghai/Shenzhen — send undefined to search across both
        exchParam = undefined
      } else if (up === 'US' || up === 'HK' || up === 'SZ' || up === 'SH' || up === 'SZSE' || up === 'SSE' || up === 'BJ' || up === 'BSE') {
        exchParam = up
      } else {
        // Pass through other codes (backwards compatibility)
        exchParam = exchange
      }
    }
    return api.get('/data/symbols', { params: { exchange: exchParam, keyword, limit, offset } })
  },
  
  history: (
    symbol: string,
    startDate: string,
    endDate: string,
    options?: { interval?: 'daily' | 'weekly' | 'monthly'; page?: number; pageSize?: number }
  ) =>
    api.get(`/data/history/${encodeURIComponent(symbol)}`, {
      params: {
        start_date: startDate,
        end_date: endDate,
        interval: options?.interval || 'daily',
        page: options?.page || 1,
        page_size: options?.pageSize || 5000,
      },
    }),
  
  indicators: (symbol: string, startDate: string, endDate: string) =>
    api.get(`/data/indicators/${encodeURIComponent(symbol)}`, { params: { start_date: startDate, end_date: endDate } }),
  
  overview: () => api.get('/data/overview'),
  
  sectors: () => api.get('/data/sectors'),

  exchanges: () => api.get('/data/exchanges'),

  symbolsByFilter: (params: { industry?: string; exchange?: string; limit?: number }) =>
    api.get('/data/symbols-by-filter', { params }),
  indexes: () => api.get('/data/indexes'),
  quote: (params: { symbol: string; market?: string }, options?: { timeoutMs?: number }) =>
    api.get('/data/quote', { params, timeout: options?.timeoutMs }),
  quoteSeries: (
    params: { symbol: string; market?: string; start_ts?: number; end_ts?: number },
    options?: { timeoutMs?: number }
  ) =>
    api.get('/data/quote/series', { params, timeout: options?.timeoutMs }),
  tushareTables: (params?: { keyword?: string; category?: string; sub_category?: string }) =>
    api.get('/data/tushare/tables', { params, timeout: TUSHARE_BROWSER_TIMEOUT_MS }),
  tushareTableSchema: (tableName: string) =>
    api.get(`/data/tushare/tables/${encodeURIComponent(tableName)}/schema`, {
      timeout: TUSHARE_BROWSER_TIMEOUT_MS,
    }),
  tushareTableRows: (
    tableName: string,
    data: {
      page?: number
      page_size?: number
      sort_by?: string
      sort_dir?: 'asc' | 'desc'
      filters?: Array<{
        column: string
        operator: string
        value?: unknown
        values?: unknown[]
      }>
    }
  ) =>
    api.post(`/data/tushare/tables/${encodeURIComponent(tableName)}/rows`, data, {
      timeout: TUSHARE_BROWSER_TIMEOUT_MS,
    }),
}

// Analytics API
export const analyticsAPI = {
  dashboard: () => api.get('/analytics/dashboard'),
  
  riskMetrics: () => api.get('/analytics/risk-metrics'),
  
  compare: (ids: string) => api.get('/analytics/compare', { params: { ids } }),
}

// System API
export const systemAPI = {
  syncStatus: () => api.get('/system/sync-status'),
  versionInfo: () => api.get('/system/version'),
  listLogModules: () => api.get('/system/logs/modules'),
  listConfigs: (category?: string) => api.get('/system/configs', { params: { category } }),
  upsertConfig: (data: {
    config_key: string
    config_value: string
    category?: string
    description?: string
    user_overridable?: boolean
  }) => api.put('/system/configs', data),
  streamLogs: async ({ module, tail = 200, signal, onEvent }: StreamLogsOptions) => {
    const params = new URLSearchParams({ module, tail: String(tail) })
    const token = localStorage.getItem('access_token')
    const response = await fetch(`${API_URL}/system/logs/stream?${params.toString()}`, {
      method: 'GET',
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      signal,
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(errorText || `Log stream failed with status ${response.status}`)
    }

    if (!response.body) {
      throw new Error('Browser does not expose a readable log stream body')
    }

    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''

    const flushFrame = (frame: string) => {
      const lines = frame.split('\n')
      let eventName = 'message'
      const dataParts: string[] = []

      for (const line of lines) {
        if (line.startsWith('event:')) {
          eventName = line.slice('event:'.length).trim()
          continue
        }
        if (line.startsWith('data:')) {
          dataParts.push(line.slice('data:'.length).trim())
        }
      }

      if (dataParts.length === 0) {
        return
      }

      const payload = JSON.parse(dataParts.join('\n')) as SystemLogStreamEvent
      onEvent({ ...payload, type: payload.type || (eventName as SystemLogStreamEvent['type']) })
    }

    while (true) {
      const { done, value } = await reader.read()
      if (done) {
        buffer += decoder.decode()
        break
      }

      buffer += decoder.decode(value, { stream: true })

      let separatorIndex = buffer.indexOf('\n\n')
      while (separatorIndex >= 0) {
        const frame = buffer.slice(0, separatorIndex).trim()
        buffer = buffer.slice(separatorIndex + 2)
        if (frame) {
          flushFrame(frame)
        }
        separatorIndex = buffer.indexOf('\n\n')
      }
    }

    const trailingFrame = buffer.trim()
    if (trailingFrame) {
      flushFrame(trailingFrame)
    }
  },
}

// Portfolio API
export const portfolioAPI = {
  positions: () => api.get('/portfolio/positions'),
  
  close: (data: { symbol: string; quantity: number; price: number }) =>
    api.post('/portfolio/close', data),

  transactions: (portfolioId: number, params?: { page?: number; page_size?: number }) =>
    api.get(`/portfolio/${portfolioId}/transactions`, { params }),

  snapshots: (portfolioId: number) =>
    api.get(`/portfolio/${portfolioId}/snapshots`),
}

// Optimization API
export const optimizationAPI = {
  listTasks: (page = 1, pageSize = 20) =>
    api.get('/optimization/tasks', { params: { page, page_size: pageSize } }),

  getTask: (taskId: number) => api.get(`/optimization/tasks/${taskId}`),

  createTask: (data: {
    strategy_id: number
    search_method: 'grid' | 'random' | 'bayesian'
    param_space: Record<string, { min: number; max: number; step: number }>
    objective_metric: string
  }) => api.post('/optimization/tasks', data),

  getResults: (taskId: number) => api.get(`/optimization/tasks/${taskId}/results`),

  deleteTask: (taskId: number) => api.delete(`/optimization/tasks/${taskId}`),
}

// Legacy aliases for backward compatibility (deprecated - use strategiesAPI instead)
type LegacyStrategySource = 'data' | 'project' | 'both'
type LegacySyncDirection = 'bidirectional' | 'data_to_project' | 'project_to_data'
type LegacyHistoryVersion = {
  name: string
  path: string
  mtime: string
  size: string
}
type LegacyStrategyContent = StrategyFileContent & {
  content: string
  strategy_name?: string | null
  class_name?: string | null
  version?: number | null
  parameters?: Record<string, unknown> | null
}

export const strategyFilesAPI = {
  lint: (payload: { content: string }) => api.post('/strategy-code/lint', payload),
  lintPyright: (payload: { content: string }) => api.post('/strategy-code/lint/pyright', payload),
  parse: (payload: { content: string }) => api.post('/strategy-code/parse', payload),
  
  // Removed file-based methods - return empty/default responses to prevent crashes
  list: (_source?: LegacyStrategySource) => Promise.resolve({ data: [] as StrategyFile[] }),
  get: (_name: string, _source?: LegacyStrategySource) =>
    Promise.reject(new Error('File-based strategies removed. Use database strategies instead.')) as Promise<{ data: LegacyStrategyContent }>,
  create: (_data: { name: string; content: string; source?: LegacyStrategySource }) =>
    Promise.reject(new Error('File-based strategies removed. Use database strategies instead.')) as Promise<{ data: unknown }>,
  update: (_name: string, _data: { content: string; source?: LegacyStrategySource }) =>
    Promise.reject(new Error('File-based strategies removed. Use database strategies instead.')) as Promise<{ data: unknown }>,
  delete: (_name: string, _source?: LegacyStrategySource) =>
    Promise.reject(new Error('File-based strategies removed. Use database strategies instead.')) as Promise<{ data: unknown }>,
  sync: (_direction?: LegacySyncDirection) =>
    Promise.reject(new Error('File sync removed. Use database strategies instead.')) as Promise<{ data: SyncResult }>,
  compare: () => Promise.resolve({ data: [] as StrategyComparison[] }),
  listHistory: (_name: string, _source?: LegacyStrategySource) =>
    Promise.resolve({ data: [] as LegacyHistoryVersion[] }),
  getHistoryContent: (_name: string, _versionName: string, _source?: LegacyStrategySource) =>
    Promise.reject(new Error('File history removed. Use database strategy history instead.')) as Promise<{ data: LegacyStrategyContent }>,
  recoverHistory: (_name: string, _versionName: string, _source?: LegacyStrategySource) =>
    Promise.reject(new Error('File history removed. Use database strategy history instead.')) as Promise<{ data: unknown }>,
}

// Removed: strategyFilesDbAPI - use strategiesAPI.listCodeHistory() instead

// Strategy code utilities and history API
export const strategyCodeAPI = {
  // Code parsing and linting utilities
  parse: (payload: { content: string }) => api.post('/strategy-code/parse', payload),
  lint: (payload: { content: string }) => api.post('/strategy-code/lint', payload),
  lintPyright: (payload: { content: string }) => api.post('/strategy-code/lint/pyright', payload),
  
  // Code history management (DB-backed strategies)
  listCodeHistory: (strategyId: number) => api.get(`/strategies/${strategyId}/code-history`),
  getCodeHistory: (strategyId: number, historyId: number) => api.get(`/strategies/${strategyId}/code-history/${historyId}`),
  restoreCodeHistory: (strategyId: number, historyId: number) => api.post(`/strategies/${strategyId}/code-history/${historyId}/restore`),
}

// Data Source Settings API
export const dataSourceAPI = {
  listItems: (params?: { source?: string; category?: string }) =>
    api.get('/settings/datasource-items', { params }),
  updateItem: (itemKey: string, data: { enabled: boolean; source: string }) =>
    api.put(`/settings/datasource-items/${itemKey}`, { enabled: data.enabled }, { params: { source: data.source } }),
  batchUpdate: (data: { items: Array<{ source: string; item_key: string; enabled: boolean }> }) =>
    api.put('/settings/datasource-items/batch', data),
  batchByPermission: (source: string, data: { permission_points: number; enabled: boolean }) =>
    api.put('/settings/datasource-items/batch-by-permission', data, { params: { source } }),
  listPermissions: (source: string) =>
    api.get('/settings/datasource-items/permissions', { params: { source } }),
  testConnection: (source: string) =>
    api.post(`/settings/datasource-items/test/${source}`),
  rebuildSyncStatus: (source: string) =>
    api.post(`/settings/datasource-items/${source}/rebuild-sync-status`),
  listConfigs: () => api.get('/settings/datasource-configs'),
  updateConfig: (sourceKey: string, data: { enabled?: boolean; config_json?: Record<string, unknown> }) =>
    api.put(`/settings/datasource-configs/${sourceKey}`, data),
}

// DataSync API
export const datasyncAPI = {
  status: (params?: { sync_date?: string; source?: string; status?: string; limit?: number; offset?: number }) =>
    api.get('/datasync/status', { params }),
  summary: (days?: number) => api.get('/datasync/status/summary', { params: { days } }),
  latest: () => api.get('/datasync/status/latest'),
  initialization: () => api.get('/datasync/status/initialization'),
  trigger: (targetDate?: string) =>
    api.post('/datasync/trigger', { target_date: targetDate }),
  jobStatus: (jobId: string) => api.get(`/datasync/job/${jobId}`),
}

// Multi-market API (HK / US / external history)
export const multiMarketAPI = {
  hkStocks: (params?: { limit?: number; keyword?: string }) =>
    api.get('/market/hk/stocks', { params }),
  hkDaily: (tsCode: string, startDate: string, endDate: string) =>
    api.get('/market/hk/daily', { params: { ts_code: tsCode, start_date: startDate, end_date: endDate } }),
  usStocks: (params?: { limit?: number; keyword?: string }) =>
    api.get('/market/us/stocks', { params }),
  usDaily: (tsCode: string, startDate: string, endDate: string) =>
    api.get('/market/us/daily', { params: { ts_code: tsCode, start_date: startDate, end_date: endDate } }),
  historyExternal: (market: string, symbol: string, startDate: string, endDate: string) =>
    api.get(`/data/history-external/${encodeURIComponent(market)}/${encodeURIComponent(symbol)}`, {
      params: { start_date: startDate, end_date: endDate },
    }),
}

// Calendar API
export const calendarAPI = {
  tradeDays: (params?: { exchange?: string; start_date?: string; end_date?: string }) =>
    api.get('/calendar/trade-days', { params }),
  events: (params?: { start_date?: string; end_date?: string; event_type?: string }) =>
    api.get('/calendar/events', { params }),
}

// Sentiment API
export const sentimentAPI = {
  overview: () => api.get('/sentiment/overview'),
  fearGreed: () => api.get('/sentiment/fear-greed'),
}

// Trading API
export const tradingAPI = {
  createOrder: (data: {
    symbol: string; direction: string; order_type: string;
    quantity: number; price?: number; mode?: string; gateway_name?: string
  }) => api.post('/trade/orders', data),
  listOrders: (params?: { status?: string; mode?: string; page?: number; page_size?: number }) =>
    api.get('/trade/orders', { params }),
  getOrder: (id: number) => api.get(`/trade/orders/${id}`),
  cancelOrder: (id: number) => api.post(`/trade/orders/${id}/cancel`),

  // Gateway management (vnpy live trading)
  connectGateway: (data: { gateway_name?: string; gateway_type: string; config?: Record<string, unknown> }) =>
    api.post('/trade/gateway/connect', data),
  disconnectGateway: (data: { gateway_name: string }) =>
    api.post('/trade/gateway/disconnect', data),
  listGateways: () => api.get('/trade/gateways'),
  getGatewayPositions: (params?: { gateway_name?: string }) =>
    api.get('/trade/gateway/positions', { params }),
  getGatewayAccount: (params?: { gateway_name?: string }) =>
    api.get('/trade/gateway/account', { params }),

  // Auto-strategy (CTA live execution)
  startAutoStrategy: (data: {
    strategy_class_name: string; vt_symbol: string;
    parameters?: Record<string, unknown>; gateway_name?: string
  }) => api.post('/trade/auto-strategy/start', data),
  stopAutoStrategy: (data: { strategy_name: string }) =>
    api.post('/trade/auto-strategy/stop', data),
  listAutoStrategies: () => api.get('/trade/auto-strategy/status'),
}

// Paper Trading API (simulation environment)
export const paperTradingAPI = {
  deployStrategy: (data: {
    strategy_id: number; vt_symbol: string; parameters?: Record<string, unknown>;
    paper_account_id?: number; execution_mode?: string
  }) => api.post('/paper-trade/deploy', data),
  listDeployments: () => api.get('/paper-trade/deployments'),
  stopDeployment: (id: number) => api.post(`/paper-trade/deployments/${id}/stop`),
  listPaperOrders: (params?: { status?: string; page?: number; page_size?: number }) =>
    api.get('/paper-trade/orders', { params }),
  createPaperOrder: (data: {
    paper_account_id: number; symbol: string; direction: string; order_type: string;
    quantity: number; price?: number; stop_price?: number
  }) => api.post('/paper-trade/orders', data),
  cancelPaperOrder: (id: number) => api.post(`/paper-trade/orders/${id}/cancel`),
  getPaperPositions: () => api.get('/paper-trade/positions'),
  getPaperPerformance: () => api.get('/paper-trade/performance'),
  // Signals (semi-auto mode)
  listSignals: (params?: { status?: string; paper_account_id?: number }) =>
    api.get('/paper-trade/signals', { params }),
  confirmSignal: (id: number) => api.post(`/paper-trade/signals/${id}/confirm`),
  rejectSignal: (id: number) => api.post(`/paper-trade/signals/${id}/reject`),
}

// Paper Account API (virtual capital accounts)
export const paperAccountAPI = {
  create: (data: { name: string; initial_capital?: number; market?: string }) =>
    api.post('/paper-account', data),
  list: (params?: { status?: string }) =>
    api.get('/paper-account', { params }),
  get: (id: number) => api.get(`/paper-account/${id}`),
  getEquityCurve: (id: number, params?: { days?: number }) =>
    api.get(`/paper-account/${id}/equity-curve`, { params }),
  getAnalytics: (id: number) => api.get(`/paper-account/${id}/analytics`),
  close: (id: number) => api.delete(`/paper-account/${id}`),
}

// Risk API
export const riskAPI = {
  listRules: () => api.get('/risk/rules'),
  createRule: (data: { name: string; rule_type: string; threshold: number; action?: string }) =>
    api.post('/risk/rules', data),
  updateRule: (id: number, data: Record<string, unknown>) =>
    api.put(`/risk/rules/${id}`, data),
  deleteRule: (id: number) => api.delete(`/risk/rules/${id}`),
  check: (params: { symbol: string; direction: string; quantity: number }) =>
    api.post('/risk/check', null, { params }),
}

// Alerts API
export const alertsAPI = {
  listRules: () => api.get('/alerts/rules'),
  createRule: (data: {
    name: string; metric: string; comparator: string;
    threshold: number; level?: string
  }) => api.post('/alerts/rules', data),
  updateRule: (id: number, data: Record<string, unknown>) =>
    api.put(`/alerts/rules/${id}`, data),
  deleteRule: (id: number) => api.delete(`/alerts/rules/${id}`),
  listHistory: (params?: { level?: string; page?: number; page_size?: number }) =>
    api.get('/alerts/history', { params }),
  acknowledgeAlert: (id: number) => api.post(`/alerts/history/${id}/acknowledge`),
  listChannels: () => api.get('/alerts/channels'),
  createChannel: (data: { channel_type: string; config: Record<string, unknown> }) =>
    api.post('/alerts/channels', data),
  deleteChannel: (id: number) => api.delete(`/alerts/channels/${id}`),
}

// Reports API
export const reportsAPI = {
  list: (params?: { report_type?: string; page?: number; page_size?: number }) =>
    api.get('/reports', { params }),
  get: (id: number) => api.get(`/reports/${id}`),
  generate: (data: { report_type: string; title?: string; content_json?: Record<string, unknown> }) =>
    api.post('/reports', data),
}

// Broker API
export const brokerAPI = {
  listConfigs: () => api.get('/broker/configs'),
  createConfig: (data: { broker_name: string; config: Record<string, unknown>; is_paper?: boolean }) =>
    api.post('/broker/configs', data),
  updateConfig: (id: number, data: Record<string, unknown>) =>
    api.put(`/broker/configs/${id}`, data),
  deleteConfig: (id: number) => api.delete(`/broker/configs/${id}`),
}

// Account Security API (MFA, API Keys, Sessions)
export const accountSecurityAPI = {
  mfaSetup: () => api.post('/auth/mfa/setup'),
  mfaVerify: (code: string) => api.post('/auth/mfa/verify', { code }),
  mfaDisable: (code: string) => api.post('/auth/mfa/disable', { code }),
  listApiKeys: () => api.get('/auth/api-keys'),
  createApiKey: (data: { name: string; permissions?: string[]; rate_limit?: number }) =>
    api.post('/auth/api-keys', data),
  deleteApiKey: (id: number) => api.delete(`/auth/api-keys/${id}`),
  listSessions: () => api.get('/auth/sessions'),
  revokeSession: (id: number) => api.delete(`/auth/sessions/${id}`),
  revokeAllSessions: () => api.delete('/auth/sessions/all'),
}

// Indicator Library API
export const indicatorAPI = {
  list: (category?: string) => api.get('/indicators', { params: { category } }),
  get: (id: number) => api.get(`/indicators/${id}`),
  create: (data: { name: string; display_name: string; category: string; default_params?: Record<string, unknown> }) =>
    api.post('/indicators', data),
  update: (id: number, data: Record<string, unknown>) => api.put(`/indicators/${id}`, data),
  delete: (id: number) => api.delete(`/indicators/${id}`),
}

// ── P3 APIs ──────────────────────────────────────────────────────────

// AI Assistant API
export const aiAPI = {
  listConversations: (params?: { page?: number; page_size?: number }) =>
    api.get('/ai/conversations', { params }),
  getConversation: (id: number) => api.get(`/ai/conversations/${id}`),
  createConversation: (data: { title: string; model?: string }) =>
    api.post('/ai/conversations', data),
  updateConversation: (id: number, data: { title?: string; status?: string }) =>
    api.put(`/ai/conversations/${id}`, data),
  deleteConversation: (id: number) => api.delete(`/ai/conversations/${id}`),
  listMessages: (conversationId: number) =>
    api.get(`/ai/conversations/${conversationId}/messages`),
  sendMessage: (conversationId: number, data: { content: string }) =>
    api.post(`/ai/conversations/${conversationId}/messages`, data),
  listModels: () => api.get('/ai/models'),
  createModel: (data: { name: string; provider: string; model_id: string; api_base?: string; max_tokens?: number; temperature?: number }) =>
    api.post('/ai/models', data),
  updateModel: (id: number, data: Record<string, unknown>) => api.put(`/ai/models/${id}`, data),
  deleteModel: (id: number) => api.delete(`/ai/models/${id}`),
}

// Factor Lab API
export const factorAPI = {
  list: (params?: { category?: string; page?: number; page_size?: number }) =>
    api.get('/factors', { params }),
  get: (id: number) => api.get(`/factors/${id}`),
  create: (data: { name: string; category: string; expression: string; description?: string }) =>
    api.post('/factors', data),
  update: (id: number, data: Record<string, unknown>) => api.put(`/factors/${id}`, data),
  delete: (id: number) => api.delete(`/factors/${id}`),
  listEvaluations: (factorId: number) =>
    api.get(`/factors/${factorId}/evaluations`),
  runEvaluation: (factorId: number, data: { start_date: string; end_date: string; universe?: string }) =>
    api.post(`/factors/${factorId}/evaluations`, data),
  deleteEvaluation: (factorId: number, evalId: number) =>
    api.delete(`/factors/${factorId}/evaluations/${evalId}`),
  // Screening & Mining
  runScreening: (data: {
    expressions: string[]
    start_date: string
    end_date: string
    instruments?: string[]
    ic_threshold?: number
    corr_threshold?: number
    save_label?: string
  }) => api.post('/factors/screening/run', data),
  runMining: (data: {
    factor_set?: string
    instruments?: string
    start_date: string
    end_date: string
    ic_threshold?: number
    corr_threshold?: number
    top_n?: number
    save_label?: string
  }) => api.post('/factors/mining/run', data),
  screeningHistory: () => api.get('/factors/screening/history'),
  screeningDetails: (runId: number) => api.get(`/factors/screening/${runId}`),
}

// RD-Agent Auto Pilot API
export const rdagentAPI = {
  startMining: (data: {
    scenario?: string
    max_iterations?: number
    llm_model?: string
    universe?: string
    feature_columns?: string[]
    start_date?: string
    end_date?: string
  }) => api.post('/rdagent/runs', data),
  listRuns: (params?: { limit?: number; offset?: number }) =>
    api.get('/rdagent/runs', { params }),
  getRun: (runId: string) => api.get(`/rdagent/runs/${runId}`),
  cancelRun: (runId: string) => api.delete(`/rdagent/runs/${runId}`),
  getIterations: (runId: string) => api.get(`/rdagent/runs/${runId}/iterations`),
  getDiscoveredFactors: (runId: string) => api.get(`/rdagent/runs/${runId}/factors`),
  importFactor: (runId: string, factorId: number) =>
    api.post(`/rdagent/runs/${runId}/import`, { discovered_factor_id: factorId }),
  getDataCatalog: () => api.get('/rdagent/data-catalog'),
  getFeatureDescriptor: () => api.get('/rdagent/feature-descriptor'),
}

// Strategy Template / Marketplace API
export const templateAPI = {
  listMarketplace: (params?: {
    category?: string
    template_type?: string
    page?: number
    page_size?: number
  }) => api.get('/templates/marketplace', { params }),
  listMine: (params?: { page?: number; page_size?: number; source?: string }) =>
    api.get('/templates/mine', { params }),
  get: (id: number) => api.get(`/templates/${id}`),
  create: (data: {
    name: string
    code: string
    description?: string
    category?: string
    params_schema?: Record<string, unknown>
    default_params?: Record<string, unknown>
    visibility?: 'private' | 'team' | 'public'
  }) =>
    api.post('/templates', data),
  update: (id: number, data: Record<string, unknown>) => api.put(`/templates/${id}`, data),
  delete: (id: number) => api.delete(`/templates/${id}`),
  clone: (id: number) =>
    api.post<{ target_type: string; target_id: number }>(`/templates/${id}/clone`),
  publish: (id: number) =>
    api.post(`/templates/${id}/publish`),
  listComments: (id: number) => api.get(`/templates/${id}/comments`),
  addComment: (id: number, data: { content: string; parent_id?: number }) =>
    api.post(`/templates/${id}/comments`, data),
  deleteComment: (id: number, commentId: number) =>
    api.delete(`/templates/${id}/comments/${commentId}`),
  getRatings: (id: number) => api.get(`/templates/${id}/ratings`),
  rate: (id: number, data: { rating: number; review?: string }) =>
    api.post(`/templates/${id}/ratings`, data),
}

// Component-level backtest
export const componentBacktestAPI = {
  run: (componentId: number, data?: { config_override?: Record<string, unknown>; params_override?: Record<string, unknown> }) =>
    api.post(`/strategy-components/${componentId}/backtest`, data ?? {}),
}

// Team Workspace API
export const teamAPI = {
  listWorkspaces: () => api.get('/teams/workspaces'),
  getWorkspace: (id: number) => api.get(`/teams/workspaces/${id}`),
  createWorkspace: (data: { name: string; description?: string; max_members?: number }) =>
    api.post('/teams/workspaces', data),
  updateWorkspace: (id: number, data: Record<string, unknown>) =>
    api.put(`/teams/workspaces/${id}`, data),
  deleteWorkspace: (id: number) => api.delete(`/teams/workspaces/${id}`),
  listMembers: (workspaceId: number) =>
    api.get(`/teams/workspaces/${workspaceId}/members`),
  addMember: (workspaceId: number, data: { user_id: number; role?: string }) =>
    api.post(`/teams/workspaces/${workspaceId}/members`, data),
  removeMember: (workspaceId: number, userId: number) =>
    api.delete(`/teams/workspaces/${workspaceId}/members/${userId}`),
  listSharedWithMe: () => api.get('/teams/shares/received'),
  shareStrategy: (data: { strategy_id: number; shared_with_user_id: number; permission?: string }) =>
    api.post('/teams/shares', data),
  revokeShare: (id: number) => api.delete(`/teams/shares/${id}`),
}

// Qlib AI Models API
export const qlibAPI = {
  // Status & supported options
  status: () => api.get('/ai/qlib/status'),
  supportedModels: () => api.get('/ai/qlib/supported-models'),
  supportedDatasets: () => api.get('/ai/qlib/supported-datasets'),

  // Model training
  train: (data: {
    model_type?: string; factor_set?: string; universe?: string;
    train_start?: string; train_end?: string;
    valid_start?: string; valid_end?: string;
    test_start?: string; test_end?: string;
    hyperparams?: Record<string, unknown>
  }) => api.post('/ai/qlib/train', data),
  listTrainingRuns: (params?: { status?: string; limit?: number; offset?: number }) =>
    api.get('/ai/qlib/training-runs', { params }),
  getTrainingRun: (runId: number) => api.get(`/ai/qlib/training-runs/${runId}`),
  getPredictions: (runId: number, params?: { trade_date?: string; top_n?: number }) =>
    api.get(`/ai/qlib/training-runs/${runId}/predictions`, { params }),

  // Data conversion (tushare/akshare → Qlib binary)
  convertData: (data?: { start_date?: string; end_date?: string; use_akshare_supplement?: boolean }) =>
    api.post('/ai/qlib/data/convert', data || {}),

  // Factor computation
  listFactorSets: () => api.get('/factors/qlib/factor-sets'),
  computeFactors: (data: {
    factor_set?: string; instruments?: string;
    start_date?: string; end_date?: string
  }) => api.post('/factors/qlib/compute', data),
}

// Strategy Components API
export const strategyComponentsAPI = {
  list: (params?: { layer?: string; page?: number; page_size?: number }) =>
    api.get('/strategy-components', { params }),
  get: (id: number) => api.get(`/strategy-components/${id}`),
  create: (data: {
    name: string
    layer: string
    sub_type: string
    description?: string
    code?: string
    config?: Record<string, unknown>
    parameters?: Record<string, unknown>
  }) => api.post('/strategy-components', data),
  update: (id: number, data: Record<string, unknown>) =>
    api.put(`/strategy-components/${id}`, data),
  delete: (id: number) => api.delete(`/strategy-components/${id}`),
}

// Composite Strategies API
export const compositeStrategiesAPI = {
  list: (params?: { page?: number; page_size?: number }) =>
    api.get('/composite-strategies', { params }),
  get: (id: number) => api.get(`/composite-strategies/${id}`),
  create: (data: {
    name: string
    description?: string
    portfolio_config?: Record<string, unknown>
    market_constraints?: Record<string, unknown>
    execution_mode?: string
    bindings?: Array<{
      component_id: number
      layer: string
      ordinal?: number
      weight?: number
      config_override?: Record<string, unknown>
    }>
  }) => api.post('/composite-strategies', data),
  update: (id: number, data: Record<string, unknown>) =>
    api.put(`/composite-strategies/${id}`, data),
  delete: (id: number) => api.delete(`/composite-strategies/${id}`),
  replaceBindings: (id: number, bindings: Array<{
    component_id: number
    layer: string
    ordinal?: number
    weight?: number
    config_override?: Record<string, unknown>
  }>) => api.put(`/composite-strategies/${id}/bindings`, bindings),
}

export const compositeBacktestAPI = {
  submit: (data: {
    composite_strategy_id: number
    start_date: string
    end_date: string
    initial_capital?: number
    benchmark?: string
  }) => api.post('/composite-backtests', data),
  list: (params?: { composite_strategy_id?: number }) =>
    api.get('/composite-backtests', { params }),
  get: (jobId: string) => api.get(`/composite-backtests/${jobId}`),
  delete: (jobId: string) => api.delete(`/composite-backtests/${jobId}`),
}
