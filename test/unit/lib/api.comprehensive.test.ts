/**
 * Comprehensive API client tests
 * Tests HTTP method calls, parameter passing, and interceptor behavior
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// Use vi.hoisted() so mock fns are available before vi.mock() hoisting
const { mockGet, mockPost, mockPut, mockDelete, mockRequestUse, mockResponseUse } = vi.hoisted(() => ({
  mockGet: vi.fn(),
  mockPost: vi.fn(),
  mockPut: vi.fn(),
  mockDelete: vi.fn(),
  mockRequestUse: vi.fn(),
  mockResponseUse: vi.fn(),
}))

vi.mock('axios', () => ({
  default: {
    create: vi.fn(() => ({
      get: mockGet,
      post: mockPost,
      put: mockPut,
      delete: mockDelete,
      interceptors: {
        request: { use: mockRequestUse },
        response: { use: mockResponseUse },
      },
    })),
  },
}))

// Mock auth store
vi.mock('@/stores/auth', () => ({
  useAuthStore: {
    getState: vi.fn(() => ({
      logout: vi.fn(),
    })),
  },
}))

import {
  analyticsAPI,
  authAPI,
  backtestAPI,
  marketDataAPI,
  optimizationAPI,
  portfolioAPI,
  queueAPI,
  strategiesAPI,
  strategyCodeAPI,
  systemAPI,
} from '@/lib/api'

// Capture interceptor registrations immediately after module load,
// before any beforeEach vi.clearAllMocks() wipes the call history.
const savedRequestInterceptor = mockRequestUse.mock.calls[0]?.[0]
const savedResponseInterceptor = mockResponseUse.mock.calls[0]

describe('API Client - HTTP Calls', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  // ─── Auth API ────────────────────────────────────────────
  describe('authAPI', () => {
    it('login sends POST with credentials', () => {
      authAPI.login('user1', 'pass123')
      expect(mockPost).toHaveBeenCalledWith('/auth/login', {
        username: 'user1',
        password: 'pass123',
      })
    })

    it('register sends POST with user data', () => {
      authAPI.register('user1', 'user@test.com', 'pass123')
      expect(mockPost).toHaveBeenCalledWith('/auth/register', {
        username: 'user1',
        email: 'user@test.com',
        password: 'pass123',
      })
    })

    it('me sends GET to /auth/me', () => {
      authAPI.me()
      expect(mockGet).toHaveBeenCalledWith('/auth/me')
    })

    it('refresh sends POST with refresh token', () => {
      authAPI.refresh('refresh-tok-123')
      expect(mockPost).toHaveBeenCalledWith('/auth/refresh', {
        refresh_token: 'refresh-tok-123',
      })
    })

    it('changePassword sends POST with passwords', () => {
      authAPI.changePassword('old-pass', 'new-pass')
      expect(mockPost).toHaveBeenCalledWith('/auth/change-password', {
        current_password: 'old-pass',
        new_password: 'new-pass',
      })
    })
  })

  // ─── Strategies API ──────────────────────────────────────
  describe('strategiesAPI', () => {
    it('list sends GET to /strategies', () => {
      strategiesAPI.list()
      expect(mockGet).toHaveBeenCalledWith('/strategies')
    })

    it('get sends GET with id', () => {
      strategiesAPI.get(42)
      expect(mockGet).toHaveBeenCalledWith('/strategies/42')
    })

    it('create sends POST with data', () => {
      const data = { name: 'New Strat', code: 'class X: pass' }
      strategiesAPI.create(data)
      expect(mockPost).toHaveBeenCalledWith('/strategies', data)
    })

    it('update sends PUT with id and data', () => {
      const data = { name: 'Updated' }
      strategiesAPI.update(42, data)
      expect(mockPut).toHaveBeenCalledWith('/strategies/42', data)
    })

    it('delete sends DELETE with id', () => {
      strategiesAPI.delete(42)
      expect(mockDelete).toHaveBeenCalledWith('/strategies/42')
    })

    it('listBuiltin sends GET to builtin endpoint', () => {
      strategiesAPI.listBuiltin()
      expect(mockGet).toHaveBeenCalledWith('/strategies/builtin/list')
    })
  })

  // ─── Backtest API ────────────────────────────────────────
  describe('backtestAPI', () => {
    it('submit sends POST', () => {
      const payload = { symbol: 'AAPL', start_date: '2024-01-01' }
      backtestAPI.submit(payload)
      expect(mockPost).toHaveBeenCalledWith('/backtest', payload)
    })

    it('submitBatch sends POST to batch endpoint', () => {
      const payload = { symbols: ['AAPL', 'GOOG'] }
      backtestAPI.submitBatch(payload)
      expect(mockPost).toHaveBeenCalledWith('/backtest/batch', payload)
    })

    it('getStatus sends GET with job id', () => {
      backtestAPI.getStatus('job-abc')
      expect(mockGet).toHaveBeenCalledWith('/backtest/job-abc')
    })

    it('getHistory sends GET to history', () => {
      backtestAPI.getHistory()
      expect(mockGet).toHaveBeenCalledWith('/backtest/history/list')
    })

    it('cancel sends POST with job id', () => {
      backtestAPI.cancel('job-abc')
      expect(mockPost).toHaveBeenCalledWith('/backtest/job-abc/cancel')
    })
  })

  // ─── Queue API ───────────────────────────────────────────
  describe('queueAPI', () => {
    it('getStats sends GET', () => {
      queueAPI.getStats()
      expect(mockGet).toHaveBeenCalledWith('/queue/stats')
    })

    it('listJobs sends GET with params', () => {
      queueAPI.listJobs('started', 50)
      expect(mockGet).toHaveBeenCalledWith('/queue/jobs', {
        params: { status: 'started', limit: 50 },
      })
    })

    it('listJobs works without params', () => {
      queueAPI.listJobs()
      expect(mockGet).toHaveBeenCalledWith('/queue/jobs', {
        params: { status: undefined, limit: undefined },
      })
    })

    it('getJob sends GET with job id', () => {
      queueAPI.getJob('job-123')
      expect(mockGet).toHaveBeenCalledWith('/queue/jobs/job-123')
    })

    it('cancelJob sends POST', () => {
      queueAPI.cancelJob('job-123')
      expect(mockPost).toHaveBeenCalledWith('/queue/jobs/job-123/cancel')
    })

    it('deleteJob sends DELETE', () => {
      queueAPI.deleteJob('job-123')
      expect(mockDelete).toHaveBeenCalledWith('/queue/jobs/job-123')
    })

    it('submitBacktest sends POST to /queue/backtest', () => {
      const data = { symbol: 'AAPL', start_date: '2024-01-01', end_date: '2024-12-31' }
      queueAPI.submitBacktest(data)
      expect(mockPost).toHaveBeenCalledWith('/queue/backtest', data)
    })

    it('submitBulkBacktest sends POST', () => {
      const data = { symbols: ['AAPL'], start_date: '2024-01-01', end_date: '2024-12-31' }
      queueAPI.submitBulkBacktest(data)
      expect(mockPost).toHaveBeenCalledWith('/queue/bulk-backtest', data)
    })

    it('getBulkJobResults sends GET with pagination params', () => {
      queueAPI.getBulkJobResults('bulk-1', 2, 20, 'asc')
      expect(mockGet).toHaveBeenCalledWith('/queue/bulk-jobs/bulk-1/results', {
        params: { page: 2, page_size: 20, sort_order: 'asc' },
      })
    })

    it('getBulkJobResults uses default pagination', () => {
      queueAPI.getBulkJobResults('bulk-1')
      expect(mockGet).toHaveBeenCalledWith('/queue/bulk-jobs/bulk-1/results', {
        params: { page: 1, page_size: 10, sort_order: 'desc' },
      })
    })

    it('getBulkJobSummary sends GET', () => {
      queueAPI.getBulkJobSummary('bulk-1')
      expect(mockGet).toHaveBeenCalledWith('/queue/bulk-jobs/bulk-1/summary')
    })
  })

  // ─── Market Data API ─────────────────────────────────────
  describe('marketDataAPI', () => {
    it('symbols sends GET with exchange mapping', () => {
      marketDataAPI.symbols('CN', 'test', 10, 0)
      // CN maps to undefined (all CN exchanges)
      expect(mockGet).toHaveBeenCalledWith('/data/symbols', {
        params: { exchange: undefined, keyword: 'test', limit: 10, offset: 0 },
      })
    })

    it('symbols passes through SZ exchange code', () => {
      marketDataAPI.symbols('SZ')
      expect(mockGet).toHaveBeenCalledWith('/data/symbols', {
        params: { exchange: 'SZ', keyword: undefined, limit: undefined, offset: undefined },
      })
    })

    it('symbols passes through US exchange code', () => {
      marketDataAPI.symbols('US')
      expect(mockGet).toHaveBeenCalledWith('/data/symbols', {
        params: { exchange: 'US', keyword: undefined, limit: undefined, offset: undefined },
      })
    })

    it('symbols with empty string sends undefined exchange', () => {
      marketDataAPI.symbols('', 'keyword')
      expect(mockGet).toHaveBeenCalledWith('/data/symbols', {
        params: { exchange: undefined, keyword: 'keyword', limit: undefined, offset: undefined },
      })
    })

    it('history sends GET with encoded symbol and date params', () => {
      marketDataAPI.history('000001.SZ', '2024-01-01', '2024-12-31')
      expect(mockGet).toHaveBeenCalledWith('/data/history/000001.SZ', {
        params: { start_date: '2024-01-01', end_date: '2024-12-31' },
      })
    })

    it('indicators sends GET with params', () => {
      marketDataAPI.indicators('AAPL', '2024-01-01', '2024-12-31')
      expect(mockGet).toHaveBeenCalledWith('/data/indicators/AAPL', {
        params: { start_date: '2024-01-01', end_date: '2024-12-31' },
      })
    })

    it('overview sends GET', () => {
      marketDataAPI.overview()
      expect(mockGet).toHaveBeenCalledWith('/data/overview')
    })

    it('sectors sends GET', () => {
      marketDataAPI.sectors()
      expect(mockGet).toHaveBeenCalledWith('/data/sectors')
    })

    it('exchanges sends GET', () => {
      marketDataAPI.exchanges()
      expect(mockGet).toHaveBeenCalledWith('/data/exchanges')
    })

    it('indexes sends GET', () => {
      marketDataAPI.indexes()
      expect(mockGet).toHaveBeenCalledWith('/data/indexes')
    })

    it('symbolsByFilter sends GET with filter params', () => {
      marketDataAPI.symbolsByFilter({ industry: 'Tech', exchange: 'SH', limit: 50 })
      expect(mockGet).toHaveBeenCalledWith('/data/symbols-by-filter', {
        params: { industry: 'Tech', exchange: 'SH', limit: 50 },
      })
    })
  })

  // ─── Analytics API ───────────────────────────────────────
  describe('analyticsAPI', () => {
    it('dashboard sends GET', () => {
      analyticsAPI.dashboard()
      expect(mockGet).toHaveBeenCalledWith('/analytics/dashboard')
    })

    it('riskMetrics sends GET', () => {
      analyticsAPI.riskMetrics()
      expect(mockGet).toHaveBeenCalledWith('/analytics/risk-metrics')
    })

    it('compare sends GET with ids param', () => {
      analyticsAPI.compare('1,2,3')
      expect(mockGet).toHaveBeenCalledWith('/analytics/compare', {
        params: { ids: '1,2,3' },
      })
    })
  })

  // ─── System API ──────────────────────────────────────────
  describe('systemAPI', () => {
    it('syncStatus sends GET', () => {
      systemAPI.syncStatus()
      expect(mockGet).toHaveBeenCalledWith('/system/sync-status')
    })
  })

  // ─── Portfolio API ───────────────────────────────────────
  describe('portfolioAPI', () => {
    it('positions sends GET', () => {
      portfolioAPI.positions()
      expect(mockGet).toHaveBeenCalledWith('/portfolio/positions')
    })

    it('close sends POST with data', () => {
      const data = { symbol: 'AAPL', quantity: 10, price: 150 }
      portfolioAPI.close(data)
      expect(mockPost).toHaveBeenCalledWith('/portfolio/close', data)
    })

    it('transactions sends GET with portfolio id', () => {
      portfolioAPI.transactions(1)
      expect(mockGet).toHaveBeenCalledWith('/portfolio/1/transactions', { params: undefined })
    })

    it('snapshots sends GET with portfolio id', () => {
      portfolioAPI.snapshots(1)
      expect(mockGet).toHaveBeenCalledWith('/portfolio/1/snapshots')
    })
  })

  // ─── Optimization API ────────────────────────────────────
  describe('optimizationAPI', () => {
    it('submit sends POST', () => {
      const data = { strategy_id: 1 }
      optimizationAPI.submit(data)
      expect(mockPost).toHaveBeenCalledWith('/optimization', data)
    })

    it('getStatus sends GET with job id', () => {
      optimizationAPI.getStatus('opt-123')
      expect(mockGet).toHaveBeenCalledWith('/optimization/opt-123')
    })

    it('getHistory sends GET', () => {
      optimizationAPI.getHistory()
      expect(mockGet).toHaveBeenCalledWith('/optimization/history')
    })

    it('cancel sends POST', () => {
      optimizationAPI.cancel('opt-123')
      expect(mockPost).toHaveBeenCalledWith('/optimization/opt-123/cancel')
    })
  })

  // ─── Strategy Code API ───────────────────────────────────
  describe('strategyCodeAPI', () => {
    it('parse sends POST with content', () => {
      strategyCodeAPI.parse({ content: 'class A: pass' })
      expect(mockPost).toHaveBeenCalledWith('/strategy-code/parse', { content: 'class A: pass' })
    })

    it('lint sends POST', () => {
      strategyCodeAPI.lint({ content: 'code' })
      expect(mockPost).toHaveBeenCalledWith('/strategy-code/lint', { content: 'code' })
    })

    it('lintPyright sends POST', () => {
      strategyCodeAPI.lintPyright({ content: 'code' })
      expect(mockPost).toHaveBeenCalledWith('/strategy-code/lint/pyright', { content: 'code' })
    })

    it('listCodeHistory sends GET with strategy id', () => {
      strategyCodeAPI.listCodeHistory(42)
      expect(mockGet).toHaveBeenCalledWith('/strategies/42/code-history')
    })

    it('getCodeHistory sends GET with ids', () => {
      strategyCodeAPI.getCodeHistory(42, 7)
      expect(mockGet).toHaveBeenCalledWith('/strategies/42/code-history/7')
    })

    it('restoreCodeHistory sends POST', () => {
      strategyCodeAPI.restoreCodeHistory(42, 7)
      expect(mockPost).toHaveBeenCalledWith('/strategies/42/code-history/7/restore')
    })
  })
})

// ─── Interceptor Registration ────────────────────────────
describe('API Client - Interceptors', () => {
  it('registers request interceptor', () => {
    expect(savedRequestInterceptor).toBeDefined()
  })

  it('registers response interceptor', () => {
    expect(savedResponseInterceptor).toBeDefined()
  })

  it('request interceptor adds Authorization header from localStorage', () => {
    const requestFn = savedRequestInterceptor
    localStorage.setItem('access_token', 'test-token-abc')

    const config = { headers: {} as Record<string, string> }
    const result = requestFn(config)

    expect(result.headers.Authorization).toBe('Bearer test-token-abc')
  })

  it('request interceptor skips Authorization when no token', () => {
    const requestFn = savedRequestInterceptor
    localStorage.removeItem('access_token')

    const config = { headers: {} as Record<string, string> }
    const result = requestFn(config)

    expect(result.headers.Authorization).toBeUndefined()
  })
})

