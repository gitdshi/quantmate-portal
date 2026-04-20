/**
 * Extended API client tests — covers all API objects and interceptor branches
 * not exercised by api.test.ts / api.comprehensive.test.ts
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { mockGet, mockPost, mockPut, mockDelete, mockRequestUse, mockResponseUse, mockAxiosPost, mockAxiosInstance } = vi.hoisted(() => {
  const inst = {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
    interceptors: {
      request: { use: vi.fn() },
      response: { use: vi.fn() },
    },
  }
  return {
    mockGet: inst.get,
    mockPost: inst.post,
    mockPut: inst.put,
    mockDelete: inst.delete,
    mockRequestUse: inst.interceptors.request.use,
    mockResponseUse: inst.interceptors.response.use,
    mockAxiosPost: vi.fn(),
    mockAxiosInstance: inst,
  }
})

vi.mock('axios', () => ({
  default: {
    create: vi.fn(() => mockAxiosInstance),
    post: mockAxiosPost,
  },
}))

const mockLogout = vi.fn()
vi.mock('@/stores/auth', () => ({
  useAuthStore: {
    getState: vi.fn(() => ({
      logout: mockLogout,
    })),
  },
}))

import {
  accountSecurityAPI,
  aiAPI,
  alertsAPI,
  brokerAPI,
  calendarAPI,
  componentBacktestAPI,
  compositeBacktestAPI,
  compositeStrategiesAPI,
  dataSourceAPI,
  datasyncAPI,
  factorAPI,
  indicatorAPI,
  marketDataAPI,
  multiMarketAPI,
  optimizationAPI,
  paperAccountAPI,
  paperTradingAPI,
  reportsAPI,
  riskAPI,
  sentimentAPI,
  strategiesAPI,
  strategyComponentsAPI,
  strategyFilesAPI,
  systemAPI,
  teamAPI,
  templateAPI,
  tradingAPI
} from '@/lib/api'

// Capture interceptors
const savedResponseInterceptor = mockResponseUse.mock.calls[0]
const responseSuccessFn = savedResponseInterceptor?.[0]
const responseErrorFn = savedResponseInterceptor?.[1]

describe('Extended API — untested HTTP calls', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  // ─── strategiesAPI missing methods ──────────────────────
  describe('strategiesAPI - additional', () => {
    it('getFactors sends GET', () => {
      strategiesAPI.getFactors(10)
      expect(mockGet).toHaveBeenCalledWith('/strategies/10/factors')
    })

    it('generateMultiFactorCode sends POST', () => {
      const data = { name: 'MF', class_name: 'MFStrategy', factors: [{ factor_name: 'F1' }] }
      strategiesAPI.generateMultiFactorCode(data)
      expect(mockPost).toHaveBeenCalledWith('/strategies/multi-factor/generate-code', data)
    })

    it('createMultiFactor sends POST', () => {
      const data = { name: 'MF', class_name: 'MFStrategy', factors: [{ factor_name: 'F1' }] }
      strategiesAPI.createMultiFactor(data)
      expect(mockPost).toHaveBeenCalledWith('/strategies/multi-factor/create', data)
    })

    it('generateQlibConfig sends POST', () => {
      const data = { factors: [{ factor_name: 'F1' }], start_date: '2024-01-01', end_date: '2024-12-31' }
      strategiesAPI.generateQlibConfig(data)
      expect(mockPost).toHaveBeenCalledWith('/strategies/multi-factor/qlib-config', data)
    })
  })

  // ─── systemAPI ──────────────────────────────────────────
  describe('systemAPI', () => {
    it('versionInfo sends GET', () => {
      systemAPI.versionInfo()
      expect(mockGet).toHaveBeenCalledWith('/system/version')
    })

    it('listLogModules sends GET', () => {
      systemAPI.listLogModules()
      expect(mockGet).toHaveBeenCalledWith('/system/logs/modules')
    })

    it('listConfigs sends GET with category', () => {
      systemAPI.listConfigs('trading')
      expect(mockGet).toHaveBeenCalledWith('/system/configs', { params: { category: 'trading' } })
    })

    it('upsertConfig sends PUT', () => {
      const data = { config_key: 'k', config_value: 'v' }
      systemAPI.upsertConfig(data)
      expect(mockPut).toHaveBeenCalledWith('/system/configs', data)
    })

    it('streamLogs uses fetch and parses SSE frames', async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        body: new ReadableStream({
          start(controller) {
            const encoder = new TextEncoder()
            controller.enqueue(
              encoder.encode(
                'event: meta\n' +
                  'data: {"type":"meta","module":"api","container":"quantmate-api-1","tail":100}\n\n' +
                  'event: log\n' +
                  'data: {"type":"log","module":"api","line":"ready"}\n\n'
              )
            )
            controller.close()
          },
        }),
      })
      vi.stubGlobal('fetch', fetchMock)
      localStorage.setItem('access_token', 'secret-token')

      const onEvent = vi.fn()
      await systemAPI.streamLogs({ module: 'api', tail: 100, onEvent })

      expect(fetchMock).toHaveBeenCalledWith(
        '/api/v1/system/logs/stream?module=api&tail=100',
        expect.objectContaining({
          method: 'GET',
          headers: { Authorization: 'Bearer secret-token' },
        })
      )
      expect(onEvent).toHaveBeenNthCalledWith(1, {
        type: 'meta',
        module: 'api',
        container: 'quantmate-api-1',
        tail: 100,
      })
      expect(onEvent).toHaveBeenNthCalledWith(2, {
        type: 'log',
        module: 'api',
        line: 'ready',
      })
    })
  })

  // ─── optimizationAPI.deleteTask ─────────────────────────
  describe('optimizationAPI - deleteTask', () => {
    it('deleteTask sends DELETE', () => {
      optimizationAPI.deleteTask(42)
      expect(mockDelete).toHaveBeenCalledWith('/optimization/tasks/42')
    })
  })

  // ─── marketDataAPI missing ──────────────────────────────
  describe('marketDataAPI - additional', () => {
    it('quote sends GET', () => {
      marketDataAPI.quote({ symbol: '000001.SZ' })
      expect(mockGet).toHaveBeenCalledWith('/data/quote', { params: { symbol: '000001.SZ' }, timeout: undefined })
    })

    it('quoteSeries sends GET with params', () => {
      marketDataAPI.quoteSeries({ symbol: 'AAPL', market: 'us' })
      expect(mockGet).toHaveBeenCalledWith('/data/quote/series', {
        params: { symbol: 'AAPL', market: 'us' },
        timeout: undefined,
      })
    })

    it('quoteSeries with timeout option', () => {
      marketDataAPI.quoteSeries({ symbol: 'AAPL' }, { timeoutMs: 5000 })
      expect(mockGet).toHaveBeenCalledWith('/data/quote/series', {
        params: { symbol: 'AAPL' },
        timeout: 5000,
      })
    })

    it('tushareTables sends GET without keyword', () => {
      marketDataAPI.tushareTables()
      expect(mockGet).toHaveBeenCalledWith('/data/tushare/tables', {
        params: { keyword: undefined },
        timeout: 30000,
      })
    })

    it('tushareTableRows encodes table name and posts payload', () => {
      const payload = { page: 2, page_size: 25, filters: [] }
      marketDataAPI.tushareTableRows('stock daily', payload)
      expect(mockPost).toHaveBeenCalledWith('/data/tushare/tables/stock%20daily/rows', payload, {
        timeout: 30000,
      })
    })
  })

  // ─── strategyFilesAPI (legacy stubs) ────────────────────
  describe('strategyFilesAPI - legacy stubs', () => {
    it('list resolves to empty array', async () => {
      const result = await strategyFilesAPI.list()
      expect(result.data).toEqual([])
    })

    it('get rejects with removal message', async () => {
      await expect(strategyFilesAPI.get('test')).rejects.toThrow('File-based strategies removed')
    })

    it('create rejects', async () => {
      await expect(strategyFilesAPI.create({ name: 'n', content: 'c' })).rejects.toThrow('File-based strategies removed')
    })

    it('update rejects', async () => {
      await expect(strategyFilesAPI.update('n', { content: 'c' })).rejects.toThrow('File-based strategies removed')
    })

    it('delete rejects', async () => {
      await expect(strategyFilesAPI.delete('n')).rejects.toThrow('File-based strategies removed')
    })

    it('sync rejects', async () => {
      await expect(strategyFilesAPI.sync()).rejects.toThrow('File sync removed')
    })

    it('compare resolves to empty array', async () => {
      const result = await strategyFilesAPI.compare()
      expect(result.data).toEqual([])
    })

    it('listHistory resolves to empty array', async () => {
      const result = await strategyFilesAPI.listHistory('n')
      expect(result.data).toEqual([])
    })

    it('getHistoryContent rejects', async () => {
      await expect(strategyFilesAPI.getHistoryContent('n', 'v')).rejects.toThrow('File history removed')
    })

    it('recoverHistory rejects', async () => {
      await expect(strategyFilesAPI.recoverHistory('n', 'v')).rejects.toThrow('File history removed')
    })

    it('lint sends POST via api', () => {
      strategyFilesAPI.lint({ content: 'x' })
      expect(mockPost).toHaveBeenCalledWith('/strategy-code/lint', { content: 'x' })
    })

    it('lintPyright sends POST', () => {
      strategyFilesAPI.lintPyright({ content: 'x' })
      expect(mockPost).toHaveBeenCalledWith('/strategy-code/lint/pyright', { content: 'x' })
    })

    it('parse sends POST', () => {
      strategyFilesAPI.parse({ content: 'x' })
      expect(mockPost).toHaveBeenCalledWith('/strategy-code/parse', { content: 'x' })
    })
  })

  // ─── dataSourceAPI ──────────────────────────────────────
  describe('dataSourceAPI', () => {
    it('listItems sends GET', () => {
      dataSourceAPI.listItems()
      expect(mockGet).toHaveBeenCalledWith('/settings/datasource-items', { params: undefined })
    })

    it('updateItem sends PUT with params', () => {
      dataSourceAPI.updateItem('tushare', { enabled: true, source: 'ts' })
      expect(mockPut).toHaveBeenCalledWith(
        '/settings/datasource-items/tushare',
        { enabled: true },
        { params: { source: 'ts' } }
      )
    })

    it('rebuildSyncStatus sends POST', () => {
      dataSourceAPI.rebuildSyncStatus('tushare')
      expect(mockPost).toHaveBeenCalledWith('/settings/datasource-items/tushare/rebuild-sync-status')
    })

    it('batchUpdate sends PUT', () => {
      const data = { items: [{ source: 'ts', item_key: 'k', enabled: true }] }
      dataSourceAPI.batchUpdate(data)
      expect(mockPut).toHaveBeenCalledWith('/settings/datasource-items/batch', data)
    })

    it('testConnection sends POST', () => {
      dataSourceAPI.testConnection('tushare')
      expect(mockPost).toHaveBeenCalledWith('/settings/datasource-items/test/tushare')
    })

    it('listConfigs sends GET', () => {
      dataSourceAPI.listConfigs()
      expect(mockGet).toHaveBeenCalledWith('/settings/datasource-configs')
    })

    it('updateConfig sends PUT', () => {
      const data = { enabled: false }
      dataSourceAPI.updateConfig('ts', data)
      expect(mockPut).toHaveBeenCalledWith('/settings/datasource-configs/ts', data)
    })
  })

  // ─── datasyncAPI ────────────────────────────────────────
  describe('datasyncAPI', () => {
    it('status sends GET with params', () => {
      datasyncAPI.status({ source: 'tushare', limit: 10 })
      expect(mockGet).toHaveBeenCalledWith('/datasync/status', { params: { source: 'tushare', limit: 10 } })
    })

    it('summary sends GET with days', () => {
      datasyncAPI.summary(7)
      expect(mockGet).toHaveBeenCalledWith('/datasync/status/summary', { params: { days: 7 } })
    })

    it('latest sends GET', () => {
      datasyncAPI.latest()
      expect(mockGet).toHaveBeenCalledWith('/datasync/status/latest')
    })

    it('initialization sends GET', () => {
      datasyncAPI.initialization()
      expect(mockGet).toHaveBeenCalledWith('/datasync/status/initialization')
    })

    it('trigger sends POST with date', () => {
      datasyncAPI.trigger('2024-01-01')
      expect(mockPost).toHaveBeenCalledWith('/datasync/trigger', { target_date: '2024-01-01' })
    })

    it('jobStatus sends GET', () => {
      datasyncAPI.jobStatus('abc-123')
      expect(mockGet).toHaveBeenCalledWith('/datasync/job/abc-123')
    })
  })

  // ─── multiMarketAPI ─────────────────────────────────────
  describe('multiMarketAPI', () => {
    it('hkStocks sends GET', () => {
      multiMarketAPI.hkStocks({ limit: 50 })
      expect(mockGet).toHaveBeenCalledWith('/market/hk/stocks', { params: { limit: 50 } })
    })

    it('hkDaily sends GET', () => {
      multiMarketAPI.hkDaily('00700.HK', '2024-01-01', '2024-06-30')
      expect(mockGet).toHaveBeenCalledWith('/market/hk/daily', {
        params: { ts_code: '00700.HK', start_date: '2024-01-01', end_date: '2024-06-30' },
      })
    })

    it('usStocks sends GET', () => {
      multiMarketAPI.usStocks({ keyword: 'apple' })
      expect(mockGet).toHaveBeenCalledWith('/market/us/stocks', { params: { keyword: 'apple' } })
    })

    it('usDaily sends GET', () => {
      multiMarketAPI.usDaily('AAPL', '2024-01-01', '2024-06-30')
      expect(mockGet).toHaveBeenCalledWith('/market/us/daily', {
        params: { ts_code: 'AAPL', start_date: '2024-01-01', end_date: '2024-06-30' },
      })
    })

    it('historyExternal sends GET with encoded path', () => {
      multiMarketAPI.historyExternal('us', 'AAPL', '2024-01-01', '2024-06-30')
      expect(mockGet).toHaveBeenCalledWith('/data/history-external/us/AAPL', {
        params: { start_date: '2024-01-01', end_date: '2024-06-30' },
      })
    })
  })

  // ─── calendarAPI ────────────────────────────────────────
  describe('calendarAPI', () => {
    it('tradeDays sends GET', () => {
      calendarAPI.tradeDays({ exchange: 'SSE', start_date: '2024-01-01' })
      expect(mockGet).toHaveBeenCalledWith('/calendar/trade-days', { params: { exchange: 'SSE', start_date: '2024-01-01' } })
    })

    it('events sends GET', () => {
      calendarAPI.events({ event_type: 'holiday' })
      expect(mockGet).toHaveBeenCalledWith('/calendar/events', { params: { event_type: 'holiday' } })
    })
  })

  // ─── sentimentAPI ───────────────────────────────────────
  describe('sentimentAPI', () => {
    it('overview sends GET', () => {
      sentimentAPI.overview()
      expect(mockGet).toHaveBeenCalledWith('/sentiment/overview')
    })

    it('fearGreed sends GET', () => {
      sentimentAPI.fearGreed()
      expect(mockGet).toHaveBeenCalledWith('/sentiment/fear-greed')
    })
  })

  // ─── tradingAPI missing methods ─────────────────────────
  describe('tradingAPI - additional', () => {
    it('createOrder sends POST', () => {
      tradingAPI.createOrder({ symbol: 'AAPL', direction: 'buy', order_type: 'market', quantity: 100 })
      expect(mockPost).toHaveBeenCalledWith('/trade/orders', {
        symbol: 'AAPL', direction: 'buy', order_type: 'market', quantity: 100,
      })
    })

    it('listOrders sends GET', () => {
      tradingAPI.listOrders({ status: 'filled' })
      expect(mockGet).toHaveBeenCalledWith('/trade/orders', { params: { status: 'filled' } })
    })

    it('getOrder sends GET', () => {
      tradingAPI.getOrder(42)
      expect(mockGet).toHaveBeenCalledWith('/trade/orders/42')
    })

    it('cancelOrder sends POST', () => {
      tradingAPI.cancelOrder(42)
      expect(mockPost).toHaveBeenCalledWith('/trade/orders/42/cancel')
    })

    it('getGatewayPositions sends GET', () => {
      tradingAPI.getGatewayPositions({ gateway_name: 'ctp' })
      expect(mockGet).toHaveBeenCalledWith('/trade/gateway/positions', { params: { gateway_name: 'ctp' } })
    })

    it('getGatewayAccount sends GET', () => {
      tradingAPI.getGatewayAccount({ gateway_name: 'ctp' })
      expect(mockGet).toHaveBeenCalledWith('/trade/gateway/account', { params: { gateway_name: 'ctp' } })
    })
  })

  // ─── paperTradingAPI missing ────────────────────────────
  describe('paperTradingAPI - additional', () => {
    it('listSignals sends GET', () => {
      paperTradingAPI.listSignals({ status: 'pending' })
      expect(mockGet).toHaveBeenCalledWith('/paper-trade/signals', { params: { status: 'pending' } })
    })

    it('confirmSignal sends POST', () => {
      paperTradingAPI.confirmSignal(1)
      expect(mockPost).toHaveBeenCalledWith('/paper-trade/signals/1/confirm')
    })

    it('rejectSignal sends POST', () => {
      paperTradingAPI.rejectSignal(1)
      expect(mockPost).toHaveBeenCalledWith('/paper-trade/signals/1/reject')
    })
  })

  // ─── paperAccountAPI ────────────────────────────────────
  describe('paperAccountAPI', () => {
    it('create sends POST', () => {
      paperAccountAPI.create({ name: 'Test', initial_capital: 100000 })
      expect(mockPost).toHaveBeenCalledWith('/paper-account', { name: 'Test', initial_capital: 100000 })
    })

    it('list sends GET', () => {
      paperAccountAPI.list({ status: 'active' })
      expect(mockGet).toHaveBeenCalledWith('/paper-account', { params: { status: 'active' } })
    })

    it('get sends GET', () => {
      paperAccountAPI.get(1)
      expect(mockGet).toHaveBeenCalledWith('/paper-account/1')
    })

    it('getEquityCurve sends GET', () => {
      paperAccountAPI.getEquityCurve(1, { days: 30 })
      expect(mockGet).toHaveBeenCalledWith('/paper-account/1/equity-curve', { params: { days: 30 } })
    })

    it('getAnalytics sends GET', () => {
      paperAccountAPI.getAnalytics(1)
      expect(mockGet).toHaveBeenCalledWith('/paper-account/1/analytics')
    })

    it('close sends DELETE', () => {
      paperAccountAPI.close(1)
      expect(mockDelete).toHaveBeenCalledWith('/paper-account/1')
    })
  })

  // ─── riskAPI ────────────────────────────────────────────
  describe('riskAPI', () => {
    it('listRules sends GET', () => {
      riskAPI.listRules()
      expect(mockGet).toHaveBeenCalledWith('/risk/rules')
    })

    it('createRule sends POST', () => {
      riskAPI.createRule({ name: 'R1', rule_type: 'position_limit', threshold: 100 })
      expect(mockPost).toHaveBeenCalledWith('/risk/rules', {
        name: 'R1', rule_type: 'position_limit', threshold: 100,
      })
    })

    it('updateRule sends PUT', () => {
      riskAPI.updateRule(1, { threshold: 200 })
      expect(mockPut).toHaveBeenCalledWith('/risk/rules/1', { threshold: 200 })
    })

    it('deleteRule sends DELETE', () => {
      riskAPI.deleteRule(1)
      expect(mockDelete).toHaveBeenCalledWith('/risk/rules/1')
    })

    it('check sends POST with params', () => {
      riskAPI.check({ symbol: 'AAPL', direction: 'buy', quantity: 100 })
      expect(mockPost).toHaveBeenCalledWith('/risk/check', null, {
        params: { symbol: 'AAPL', direction: 'buy', quantity: 100 },
      })
    })
  })

  // ─── alertsAPI ──────────────────────────────────────────
  describe('alertsAPI', () => {
    it('listRules sends GET', () => {
      alertsAPI.listRules()
      expect(mockGet).toHaveBeenCalledWith('/alerts/rules')
    })

    it('createRule sends POST', () => {
      alertsAPI.createRule({ name: 'A', metric: 'pnl', comparator: 'gt', threshold: 50 })
      expect(mockPost).toHaveBeenCalledWith('/alerts/rules', {
        name: 'A', metric: 'pnl', comparator: 'gt', threshold: 50,
      })
    })

    it('updateRule sends PUT', () => {
      alertsAPI.updateRule(1, { threshold: 100 })
      expect(mockPut).toHaveBeenCalledWith('/alerts/rules/1', { threshold: 100 })
    })

    it('deleteRule sends DELETE', () => {
      alertsAPI.deleteRule(1)
      expect(mockDelete).toHaveBeenCalledWith('/alerts/rules/1')
    })

    it('listHistory sends GET', () => {
      alertsAPI.listHistory({ level: 'critical' })
      expect(mockGet).toHaveBeenCalledWith('/alerts/history', { params: { level: 'critical' } })
    })

    it('acknowledgeAlert sends POST', () => {
      alertsAPI.acknowledgeAlert(5)
      expect(mockPost).toHaveBeenCalledWith('/alerts/history/5/acknowledge')
    })

    it('listChannels sends GET', () => {
      alertsAPI.listChannels()
      expect(mockGet).toHaveBeenCalledWith('/alerts/channels')
    })

    it('createChannel sends POST', () => {
      alertsAPI.createChannel({ channel_type: 'email', config: { to: 'a@b.com' } })
      expect(mockPost).toHaveBeenCalledWith('/alerts/channels', {
        channel_type: 'email', config: { to: 'a@b.com' },
      })
    })

    it('deleteChannel sends DELETE', () => {
      alertsAPI.deleteChannel(3)
      expect(mockDelete).toHaveBeenCalledWith('/alerts/channels/3')
    })
  })

  // ─── reportsAPI ─────────────────────────────────────────
  describe('reportsAPI', () => {
    it('list sends GET', () => {
      reportsAPI.list({ report_type: 'daily' })
      expect(mockGet).toHaveBeenCalledWith('/reports', { params: { report_type: 'daily' } })
    })

    it('get sends GET', () => {
      reportsAPI.get(1)
      expect(mockGet).toHaveBeenCalledWith('/reports/1')
    })

    it('generate sends POST', () => {
      reportsAPI.generate({ report_type: 'daily', title: 'Report' })
      expect(mockPost).toHaveBeenCalledWith('/reports', { report_type: 'daily', title: 'Report' })
    })
  })

  // ─── brokerAPI ──────────────────────────────────────────
  describe('brokerAPI', () => {
    it('listConfigs sends GET', () => {
      brokerAPI.listConfigs()
      expect(mockGet).toHaveBeenCalledWith('/broker/configs')
    })

    it('createConfig sends POST', () => {
      brokerAPI.createConfig({ broker_name: 'IB', config: { host: '127.0.0.1' } })
      expect(mockPost).toHaveBeenCalledWith('/broker/configs', {
        broker_name: 'IB', config: { host: '127.0.0.1' },
      })
    })

    it('updateConfig sends PUT', () => {
      brokerAPI.updateConfig(1, { is_paper: true })
      expect(mockPut).toHaveBeenCalledWith('/broker/configs/1', { is_paper: true })
    })

    it('deleteConfig sends DELETE', () => {
      brokerAPI.deleteConfig(1)
      expect(mockDelete).toHaveBeenCalledWith('/broker/configs/1')
    })
  })

  // ─── accountSecurityAPI ─────────────────────────────────
  describe('accountSecurityAPI', () => {
    it('mfaSetup sends POST', () => {
      accountSecurityAPI.mfaSetup()
      expect(mockPost).toHaveBeenCalledWith('/auth/mfa/setup')
    })

    it('mfaVerify sends POST', () => {
      accountSecurityAPI.mfaVerify('123456')
      expect(mockPost).toHaveBeenCalledWith('/auth/mfa/verify', { code: '123456' })
    })

    it('mfaDisable sends POST', () => {
      accountSecurityAPI.mfaDisable('123456')
      expect(mockPost).toHaveBeenCalledWith('/auth/mfa/disable', { code: '123456' })
    })

    it('listApiKeys sends GET', () => {
      accountSecurityAPI.listApiKeys()
      expect(mockGet).toHaveBeenCalledWith('/auth/api-keys')
    })

    it('createApiKey sends POST', () => {
      accountSecurityAPI.createApiKey({ name: 'Key1', permissions: ['read'] })
      expect(mockPost).toHaveBeenCalledWith('/auth/api-keys', {
        name: 'Key1', permissions: ['read'],
      })
    })

    it('deleteApiKey sends DELETE', () => {
      accountSecurityAPI.deleteApiKey(1)
      expect(mockDelete).toHaveBeenCalledWith('/auth/api-keys/1')
    })

    it('listSessions sends GET', () => {
      accountSecurityAPI.listSessions()
      expect(mockGet).toHaveBeenCalledWith('/auth/sessions')
    })

    it('revokeSession sends DELETE', () => {
      accountSecurityAPI.revokeSession(2)
      expect(mockDelete).toHaveBeenCalledWith('/auth/sessions/2')
    })

    it('revokeAllSessions sends DELETE', () => {
      accountSecurityAPI.revokeAllSessions()
      expect(mockDelete).toHaveBeenCalledWith('/auth/sessions/all')
    })
  })

  // ─── indicatorAPI ───────────────────────────────────────
  describe('indicatorAPI', () => {
    it('list sends GET', () => {
      indicatorAPI.list('momentum')
      expect(mockGet).toHaveBeenCalledWith('/indicators', { params: { category: 'momentum' } })
    })

    it('get sends GET', () => {
      indicatorAPI.get(1)
      expect(mockGet).toHaveBeenCalledWith('/indicators/1')
    })

    it('create sends POST', () => {
      indicatorAPI.create({ name: 'rsi', display_name: 'RSI', category: 'momentum' })
      expect(mockPost).toHaveBeenCalledWith('/indicators', {
        name: 'rsi', display_name: 'RSI', category: 'momentum',
      })
    })

    it('update sends PUT', () => {
      indicatorAPI.update(1, { display_name: 'RSI 14' })
      expect(mockPut).toHaveBeenCalledWith('/indicators/1', { display_name: 'RSI 14' })
    })

    it('delete sends DELETE', () => {
      indicatorAPI.delete(1)
      expect(mockDelete).toHaveBeenCalledWith('/indicators/1')
    })
  })

  // ─── aiAPI ──────────────────────────────────────────────
  describe('aiAPI', () => {
    it('listConversations sends GET', () => {
      aiAPI.listConversations({ page: 1 })
      expect(mockGet).toHaveBeenCalledWith('/ai/conversations', { params: { page: 1 } })
    })

    it('getConversation sends GET', () => {
      aiAPI.getConversation(1)
      expect(mockGet).toHaveBeenCalledWith('/ai/conversations/1')
    })

    it('createConversation sends POST', () => {
      aiAPI.createConversation({ title: 'Chat' })
      expect(mockPost).toHaveBeenCalledWith('/ai/conversations', { title: 'Chat' })
    })

    it('updateConversation sends PUT', () => {
      aiAPI.updateConversation(1, { title: 'New' })
      expect(mockPut).toHaveBeenCalledWith('/ai/conversations/1', { title: 'New' })
    })

    it('deleteConversation sends DELETE', () => {
      aiAPI.deleteConversation(1)
      expect(mockDelete).toHaveBeenCalledWith('/ai/conversations/1')
    })

    it('listMessages sends GET', () => {
      aiAPI.listMessages(1)
      expect(mockGet).toHaveBeenCalledWith('/ai/conversations/1/messages')
    })

    it('sendMessage sends POST', () => {
      aiAPI.sendMessage(1, { content: 'hello' })
      expect(mockPost).toHaveBeenCalledWith('/ai/conversations/1/messages', { content: 'hello' })
    })

    it('listModels sends GET', () => {
      aiAPI.listModels()
      expect(mockGet).toHaveBeenCalledWith('/ai/models')
    })

    it('createModel sends POST', () => {
      aiAPI.createModel({ name: 'GPT', provider: 'openai', model_id: 'gpt-4' })
      expect(mockPost).toHaveBeenCalledWith('/ai/models', {
        name: 'GPT', provider: 'openai', model_id: 'gpt-4',
      })
    })

    it('updateModel sends PUT', () => {
      aiAPI.updateModel(1, { name: 'GPT4o' })
      expect(mockPut).toHaveBeenCalledWith('/ai/models/1', { name: 'GPT4o' })
    })

    it('deleteModel sends DELETE', () => {
      aiAPI.deleteModel(1)
      expect(mockDelete).toHaveBeenCalledWith('/ai/models/1')
    })
  })

  // ─── factorAPI ──────────────────────────────────────────
  describe('factorAPI', () => {
    it('get sends GET', () => {
      factorAPI.get(1)
      expect(mockGet).toHaveBeenCalledWith('/factors/1')
    })

    it('update sends PUT', () => {
      factorAPI.update(1, { name: 'F2' })
      expect(mockPut).toHaveBeenCalledWith('/factors/1', { name: 'F2' })
    })

    it('delete sends DELETE', () => {
      factorAPI.delete(1)
      expect(mockDelete).toHaveBeenCalledWith('/factors/1')
    })

    it('deleteEvaluation sends DELETE', () => {
      factorAPI.deleteEvaluation(1, 2)
      expect(mockDelete).toHaveBeenCalledWith('/factors/1/evaluations/2')
    })

    it('runScreening sends POST', () => {
      const data = { expressions: ['x'], start_date: '2024-01-01', end_date: '2024-12-31' }
      factorAPI.runScreening(data)
      expect(mockPost).toHaveBeenCalledWith('/factors/screening/run', data)
    })

    it('runMining sends POST', () => {
      const data = { start_date: '2024-01-01', end_date: '2024-12-31' }
      factorAPI.runMining(data)
      expect(mockPost).toHaveBeenCalledWith('/factors/mining/run', data)
    })

    it('screeningHistory sends GET', () => {
      factorAPI.screeningHistory()
      expect(mockGet).toHaveBeenCalledWith('/factors/screening/history')
    })

    it('screeningDetails sends GET', () => {
      factorAPI.screeningDetails(1)
      expect(mockGet).toHaveBeenCalledWith('/factors/screening/1')
    })
  })

  // ─── templateAPI ────────────────────────────────────────
  describe('templateAPI', () => {
    it('listMarketplace sends GET', () => {
      templateAPI.listMarketplace({ category: 'momentum' })
      expect(mockGet).toHaveBeenCalledWith('/templates/marketplace', { params: { category: 'momentum' } })
    })

    it('listMine sends GET', () => {
      templateAPI.listMine()
      expect(mockGet).toHaveBeenCalledWith('/templates/mine', { params: undefined })
    })

    it('get sends GET', () => {
      templateAPI.get(1)
      expect(mockGet).toHaveBeenCalledWith('/templates/1')
    })

    it('create sends POST', () => {
      templateAPI.create({ name: 'T', code: 'pass' })
      expect(mockPost).toHaveBeenCalledWith('/templates', { name: 'T', code: 'pass' })
    })

    it('update sends PUT', () => {
      templateAPI.update(1, { name: 'T2' })
      expect(mockPut).toHaveBeenCalledWith('/templates/1', { name: 'T2' })
    })

    it('delete sends DELETE', () => {
      templateAPI.delete(1)
      expect(mockDelete).toHaveBeenCalledWith('/templates/1')
    })

    it('clone sends POST', () => {
      templateAPI.clone(1)
      expect(mockPost).toHaveBeenCalledWith('/templates/1/clone')
    })

    it('publish sends POST', () => {
      templateAPI.publish(1)
      expect(mockPost).toHaveBeenCalledWith('/templates/1/publish')
    })

    it('listComments sends GET', () => {
      templateAPI.listComments(1)
      expect(mockGet).toHaveBeenCalledWith('/templates/1/comments')
    })

    it('addComment sends POST', () => {
      templateAPI.addComment(1, { content: 'nice' })
      expect(mockPost).toHaveBeenCalledWith('/templates/1/comments', { content: 'nice' })
    })

    it('deleteComment sends DELETE', () => {
      templateAPI.deleteComment(1, 2)
      expect(mockDelete).toHaveBeenCalledWith('/templates/1/comments/2')
    })

    it('getRatings sends GET', () => {
      templateAPI.getRatings(1)
      expect(mockGet).toHaveBeenCalledWith('/templates/1/ratings')
    })

    it('rate sends POST', () => {
      templateAPI.rate(1, { rating: 5 })
      expect(mockPost).toHaveBeenCalledWith('/templates/1/ratings', { rating: 5 })
    })
  })

  // ─── componentBacktestAPI ───────────────────────────────
  describe('componentBacktestAPI', () => {
    it('run sends POST', () => {
      componentBacktestAPI.run(5, { config_override: { a: 1 } })
      expect(mockPost).toHaveBeenCalledWith('/strategy-components/5/backtest', { config_override: { a: 1 } })
    })

    it('run sends POST with empty object when no data', () => {
      componentBacktestAPI.run(5)
      expect(mockPost).toHaveBeenCalledWith('/strategy-components/5/backtest', {})
    })
  })

  // ─── teamAPI ────────────────────────────────────────────
  describe('teamAPI', () => {
    it('listWorkspaces sends GET', () => {
      teamAPI.listWorkspaces()
      expect(mockGet).toHaveBeenCalledWith('/teams/workspaces')
    })

    it('getWorkspace sends GET', () => {
      teamAPI.getWorkspace(1)
      expect(mockGet).toHaveBeenCalledWith('/teams/workspaces/1')
    })

    it('createWorkspace sends POST', () => {
      teamAPI.createWorkspace({ name: 'WS' })
      expect(mockPost).toHaveBeenCalledWith('/teams/workspaces', { name: 'WS' })
    })

    it('updateWorkspace sends PUT', () => {
      teamAPI.updateWorkspace(1, { name: 'WS2' })
      expect(mockPut).toHaveBeenCalledWith('/teams/workspaces/1', { name: 'WS2' })
    })

    it('deleteWorkspace sends DELETE', () => {
      teamAPI.deleteWorkspace(1)
      expect(mockDelete).toHaveBeenCalledWith('/teams/workspaces/1')
    })

    it('listMembers sends GET', () => {
      teamAPI.listMembers(1)
      expect(mockGet).toHaveBeenCalledWith('/teams/workspaces/1/members')
    })

    it('addMember sends POST', () => {
      teamAPI.addMember(1, { user_id: 2, role: 'editor' })
      expect(mockPost).toHaveBeenCalledWith('/teams/workspaces/1/members', { user_id: 2, role: 'editor' })
    })

    it('removeMember sends DELETE', () => {
      teamAPI.removeMember(1, 2)
      expect(mockDelete).toHaveBeenCalledWith('/teams/workspaces/1/members/2')
    })

    it('listSharedWithMe sends GET', () => {
      teamAPI.listSharedWithMe()
      expect(mockGet).toHaveBeenCalledWith('/teams/shares/received')
    })

    it('shareStrategy sends POST', () => {
      teamAPI.shareStrategy({ strategy_id: 1, shared_with_user_id: 2 })
      expect(mockPost).toHaveBeenCalledWith('/teams/shares', { strategy_id: 1, shared_with_user_id: 2 })
    })

    it('revokeShare sends DELETE', () => {
      teamAPI.revokeShare(1)
      expect(mockDelete).toHaveBeenCalledWith('/teams/shares/1')
    })
  })

  // ─── strategyComponentsAPI ──────────────────────────────
  describe('strategyComponentsAPI', () => {
    it('list sends GET', () => {
      strategyComponentsAPI.list({ layer: 'alpha' })
      expect(mockGet).toHaveBeenCalledWith('/strategy-components', { params: { layer: 'alpha' } })
    })

    it('get sends GET', () => {
      strategyComponentsAPI.get(1)
      expect(mockGet).toHaveBeenCalledWith('/strategy-components/1')
    })

    it('create sends POST', () => {
      strategyComponentsAPI.create({ name: 'C', layer: 'alpha', sub_type: 'momentum' })
      expect(mockPost).toHaveBeenCalledWith('/strategy-components', {
        name: 'C', layer: 'alpha', sub_type: 'momentum',
      })
    })

    it('update sends PUT', () => {
      strategyComponentsAPI.update(1, { name: 'C2' })
      expect(mockPut).toHaveBeenCalledWith('/strategy-components/1', { name: 'C2' })
    })

    it('delete sends DELETE', () => {
      strategyComponentsAPI.delete(1)
      expect(mockDelete).toHaveBeenCalledWith('/strategy-components/1')
    })
  })

  // ─── compositeStrategiesAPI ─────────────────────────────
  describe('compositeStrategiesAPI', () => {
    it('list sends GET', () => {
      compositeStrategiesAPI.list({ page: 2 })
      expect(mockGet).toHaveBeenCalledWith('/composite-strategies', { params: { page: 2 } })
    })

    it('get sends GET', () => {
      compositeStrategiesAPI.get(1)
      expect(mockGet).toHaveBeenCalledWith('/composite-strategies/1')
    })

    it('create sends POST', () => {
      compositeStrategiesAPI.create({ name: 'CS' })
      expect(mockPost).toHaveBeenCalledWith('/composite-strategies', { name: 'CS' })
    })

    it('update sends PUT', () => {
      compositeStrategiesAPI.update(1, { name: 'CS2' })
      expect(mockPut).toHaveBeenCalledWith('/composite-strategies/1', { name: 'CS2' })
    })

    it('delete sends DELETE', () => {
      compositeStrategiesAPI.delete(1)
      expect(mockDelete).toHaveBeenCalledWith('/composite-strategies/1')
    })

    it('replaceBindings sends PUT', () => {
      const bindings = [{ component_id: 1, layer: 'alpha' }]
      compositeStrategiesAPI.replaceBindings(1, bindings)
      expect(mockPut).toHaveBeenCalledWith('/composite-strategies/1/bindings', bindings)
    })
  })

  // ─── compositeBacktestAPI ───────────────────────────────
  describe('compositeBacktestAPI', () => {
    it('submit sends POST', () => {
      compositeBacktestAPI.submit({
        composite_strategy_id: 1,
        start_date: '2024-01-01',
        end_date: '2024-12-31',
      })
      expect(mockPost).toHaveBeenCalledWith('/composite-backtests', {
        composite_strategy_id: 1,
        start_date: '2024-01-01',
        end_date: '2024-12-31',
      })
    })

    it('list sends GET', () => {
      compositeBacktestAPI.list({ composite_strategy_id: 1 })
      expect(mockGet).toHaveBeenCalledWith('/composite-backtests', { params: { composite_strategy_id: 1 } })
    })

    it('get sends GET', () => {
      compositeBacktestAPI.get('job-1')
      expect(mockGet).toHaveBeenCalledWith('/composite-backtests/job-1')
    })

    it('delete sends DELETE', () => {
      compositeBacktestAPI.delete('job-1')
      expect(mockDelete).toHaveBeenCalledWith('/composite-backtests/job-1')
    })
  })
})

// ─── Response Interceptor Branches ──────────────────────────
describe('Response Interceptor', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    sessionStorage.clear()
    // Reset window.location
    Object.defineProperty(window, 'location', {
      value: { pathname: '/dashboard', search: '', href: '' },
      writable: true,
    })
  })

  it('success handler passes through response', () => {
    const response = { data: 'ok' }
    expect(responseSuccessFn(response)).toBe(response)
  })

  it('403 with password change required redirects', async () => {
    const error = {
      response: { status: 403, data: { detail: 'Password change required' } },
      config: {},
    }
    window.location.pathname = '/dashboard'
    await expect(responseErrorFn(error)).rejects.toBe(error)
    expect(window.location.href).toBe('/change-password')
    expect(sessionStorage.getItem('force_change_password')).toBe('1')
  })

  it('403 password change skips redirect when already on change-password', async () => {
    const error = {
      response: { status: 403, data: { detail: 'Password change required' } },
      config: {},
    }
    window.location.pathname = '/change-password'
    await expect(responseErrorFn(error)).rejects.toBe(error)
    // Should NOT redirect
    expect(window.location.href).not.toBe('/change-password')
  })

  it('401 with refresh token calls refresh endpoint', async () => {
    localStorage.setItem('refresh_token', 'rt-123')
    // Refresh succeeds but api(originalRequest) throws because our mock isn't callable.
    // The catch block then clears tokens. We verify that refresh was attempted.
    mockAxiosPost.mockResolvedValueOnce({ data: { access_token: 'new-token' } })

    const error = {
      response: { status: 401 },
      config: { url: '/some-endpoint', headers: {}, _retry: false },
    }

    try {
      await responseErrorFn(error)
    } catch { /* expected — mock api isn't callable */ }

    expect(mockAxiosPost).toHaveBeenCalledWith(
      expect.stringContaining('/auth/refresh'),
      { refresh_token: 'rt-123' }
    )
  })

  it('401 for /auth/login skips refresh', async () => {
    const error = {
      response: { status: 401 },
      config: { url: '/auth/login', _retry: false },
    }
    await expect(responseErrorFn(error)).rejects.toBe(error)
    expect(mockAxiosPost).not.toHaveBeenCalled()
  })

  it('401 for /auth/register skips refresh', async () => {
    const error = {
      response: { status: 401 },
      config: { url: '/auth/register', _retry: false },
    }
    await expect(responseErrorFn(error)).rejects.toBe(error)
  })

  it('401 without refresh token clears state and redirects', async () => {
    localStorage.setItem('access_token', 'old-token')
    // No refresh_token set
    const error = {
      response: { status: 401 },
      config: { url: '/data/quote', _retry: false },
    }
    await expect(responseErrorFn(error)).rejects.toBe(error)
    expect(localStorage.getItem('access_token')).toBeNull()
    expect(window.location.href).toBe('/login')
  })

  it('401 with refresh failure clears state and redirects', async () => {
    localStorage.setItem('refresh_token', 'rt-bad')
    localStorage.setItem('access_token', 'old')
    mockAxiosPost.mockRejectedValueOnce(new Error('refresh failed'))

    const error = {
      response: { status: 401 },
      config: { url: '/data/quote', headers: {}, _retry: false },
    }
    await expect(responseErrorFn(error)).rejects.toThrow('refresh failed')
    expect(localStorage.getItem('access_token')).toBeNull()
    expect(localStorage.getItem('refresh_token')).toBeNull()
    expect(window.location.href).toBe('/login')
  })

  it('401 retry already done clears state', async () => {
    const error = {
      response: { status: 401 },
      config: { url: '/data/quote', _retry: true },
    }
    window.location.pathname = '/dashboard'
    await expect(responseErrorFn(error)).rejects.toBe(error)
    expect(window.location.href).toBe('/login')
  })

  it('401 retry already done skips redirect on login page', async () => {
    const error = {
      response: { status: 401 },
      config: { url: '/data/quote', _retry: true },
    }
    window.location.pathname = '/login'
    await expect(responseErrorFn(error)).rejects.toBe(error)
    // Should NOT redirect
    expect(window.location.href).not.toBe('/login')
  })

  it('non-auth error is passed through', async () => {
    const error = {
      response: { status: 500, data: { detail: 'Server Error' } },
      config: {},
    }
    await expect(responseErrorFn(error)).rejects.toBe(error)
  })
})
