import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

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
        }
      } catch (refreshError) {
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
    api.post('/api/auth/login', { username, password }),
  
  register: (username: string, email: string, password: string) =>
    api.post('/api/auth/register', { username, email, password }),
  
  me: () => api.get('/api/auth/me'),
  
  refresh: (refreshToken: string) =>
    api.post('/api/auth/refresh', { refresh_token: refreshToken }),
}

// Strategies API
export const strategiesAPI = {
  list: () => api.get('/api/strategies'),
  
  get: (id: number) => api.get(`/api/strategies/${id}`),
  
  create: (data: any) => api.post('/api/strategies', data),
  
  update: (id: number, data: any) => api.put(`/api/strategies/${id}`, data),
  
  delete: (id: number) => api.delete(`/api/strategies/${id}`),
  
  listBuiltin: () => api.get('/api/strategies/builtin'),
}

// Backtest API
export const backtestAPI = {
  submit: (data: any) => api.post('/api/backtest', data),
  
  submitBatch: (data: any) => api.post('/api/backtest/batch', data),
  
  getStatus: (jobId: string) => api.get(`/api/backtest/${jobId}`),
  
  getHistory: () => api.get('/api/backtest/history'),
  
  cancel: (jobId: string) => api.post(`/api/backtest/${jobId}/cancel`),
}

// Queue API
export const queueAPI = {
  getStats: () => api.get('/api/queue/stats'),
  stats: () => api.get('/api/queue/stats'),
  
  listJobs: (status?: string, limit?: number) =>
    api.get('/api/queue/jobs', { params: { status, limit } }),
  
  getJob: (jobId: string) => api.get(`/api/queue/jobs/${jobId}`),
  
  cancelJob: (jobId: string) => api.post(`/api/queue/jobs/${jobId}/cancel`),
  
  deleteJob: (jobId: string) => api.delete(`/api/queue/jobs/${jobId}`),
}

// Market Data API
export const marketDataAPI = {
  symbols: (market?: string) =>
    api.get('/api/data/symbols', { params: { market } }),
  
  history: (symbol: string, startDate: string, endDate: string) =>
    api.get('/api/data/history', { params: { symbol, start_date: startDate, end_date: endDate } }),
  
  indicators: (symbol: string, startDate: string, endDate: string) =>
    api.get('/api/data/indicators', { params: { symbol, start_date: startDate, end_date: endDate } }),
  
  overview: () => api.get('/api/data/overview'),
  
  sectors: () => api.get('/api/data/sectors'),
}

// Analytics API
export const analyticsAPI = {
  dashboard: () => api.get('/api/analytics/dashboard'),
  
  riskMetrics: () => api.get('/api/analytics/risk-metrics'),
  
  compare: (ids: string) => api.get('/api/analytics/compare', { params: { ids } }),
}

// Portfolio API
export const portfolioAPI = {
  positions: () => api.get('/api/portfolio/positions'),
  
  closedTrades: () => api.get('/api/portfolio/closed-trades'),
  
  closePosition: (positionId: number) => api.post(`/api/portfolio/positions/${positionId}/close`),
}

// Optimization API
export const optimizationAPI = {
  submit: (data: any) => api.post('/api/optimization', data),
  
  getStatus: (jobId: string) => api.get(`/api/optimization/${jobId}`),
  
  getHistory: () => api.get('/api/optimization/history'),
  
  cancel: (jobId: string) => api.post(`/api/optimization/${jobId}/cancel`),
}
