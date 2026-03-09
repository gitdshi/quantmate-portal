import axios from 'axios'
import { useAuthStore } from '../stores/auth'

const API_URL = import.meta.env.VITE_API_URL || '/api'

export const api = axios.create({
  baseURL: API_URL,
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

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true

      try {
        const refreshToken = localStorage.getItem('refresh_token')
        if (refreshToken) {
          const { data } = await axios.post(`${API_URL}/api/auth/refresh`, {
            refresh_token: refreshToken,
          })

          localStorage.setItem('access_token', data.access_token)
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
}

// Strategies API
export const strategiesAPI = {
  list: () => api.get('/strategies'),
  
  get: (id: number) => api.get(`/strategies/${id}`),
  
  create: (data: any) => api.post('/strategies', data),
  
  update: (id: number, data: any) => api.put(`/strategies/${id}`, data),
  
  delete: (id: number) => api.delete(`/strategies/${id}`),
  
  listBuiltin: () => api.get('/strategies/builtin'),
}

// Backtest API
export const backtestAPI = {
  submit: (data: any) => api.post('/backtest', data),
  
  submitBatch: (data: any) => api.post('/backtest/batch', data),
  
  getStatus: (jobId: string) => api.get(`/backtest/${jobId}`),
  
  getHistory: () => api.get('/backtest/history'),
  
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
  }) => api.post('/queue/backtest', data),

  submitBulkBacktest: (data: {
    strategy_id?: number
    strategy_class?: string
    strategy_name?: string
    symbols: string[]
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
  
  history: (symbol: string, startDate: string, endDate: string) =>
    api.get('/data/history', { params: { symbol, start_date: startDate, end_date: endDate } }),
  
  indicators: (symbol: string, startDate: string, endDate: string) =>
    api.get('/data/indicators', { params: { symbol, start_date: startDate, end_date: endDate } }),
  
  overview: () => api.get('/data/overview'),
  
  sectors: () => api.get('/data/sectors'),

  exchanges: () => api.get('/data/exchanges'),

  symbolsByFilter: (params: { industry?: string; exchange?: string; limit?: number }) =>
    api.get('/data/symbols-by-filter', { params }),
  indexes: () => api.get('/data/indexes'),
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
}

// Portfolio API
export const portfolioAPI = {
  positions: () => api.get('/portfolio/positions'),
  
  closedTrades: () => api.get('/portfolio/closed-trades'),
  
  closePosition: (positionId: number) => api.post(`/portfolio/positions/${positionId}/close`),
}

// Optimization API
export const optimizationAPI = {
  submit: (data: any) => api.post('/optimization', data),
  
  getStatus: (jobId: string) => api.get(`/optimization/${jobId}`),
  
  getHistory: () => api.get('/optimization/history'),
  
  cancel: (jobId: string) => api.post(`/optimization/${jobId}/cancel`),
}

// Legacy aliases for backward compatibility (deprecated - use strategiesAPI instead)
export const strategyFilesAPI = {
  lint: (payload: { content: string }) => api.post('/strategy-code/lint', payload),
  lintPyright: (payload: { content: string }) => api.post('/strategy-code/lint/pyright', payload),
  parse: (payload: { content: string }) => api.post('/strategy-code/parse', payload),
  
  // Removed file-based methods - return empty/default responses to prevent crashes
  list: () => Promise.resolve({ data: [] }),
  get: () => Promise.reject(new Error('File-based strategies removed. Use database strategies instead.')),
  create: () => Promise.reject(new Error('File-based strategies removed. Use database strategies instead.')),
  update: () => Promise.reject(new Error('File-based strategies removed. Use database strategies instead.')),
  delete: () => Promise.reject(new Error('File-based strategies removed. Use database strategies instead.')),
  sync: () => Promise.reject(new Error('File sync removed. Use database strategies instead.')),
  compare: () => Promise.resolve({ data: [] }),
  listHistory: () => Promise.resolve({ data: [] }),
  getHistoryContent: () => Promise.reject(new Error('File history removed. Use database strategy history instead.')),
  recoverHistory: () => Promise.reject(new Error('File history removed. Use database strategy history instead.')),
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
