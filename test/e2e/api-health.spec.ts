import { expect, test } from '@playwright/test'
import { env } from './env'

/**
 * API Health Check — verifies all major backend endpoints respond.
 * Uses direct API calls (not browser navigation) to isolate backend issues.
 */
test.describe('API Health Check', () => {
  let authToken: string

  test.beforeAll(async ({ request }) => {
    // Login to get auth token
    const loginRes = await request.post(`${env.apiURL}/api/v1/auth/login`, {
      data: { username: env.username, password: env.password },
    })
    expect(loginRes.ok()).toBeTruthy()
    const loginData = await loginRes.json()
    authToken = loginData.access_token
  })

  const endpoints = [
    { name: 'Auth - Me', method: 'GET', path: '/api/v1/auth/me' },
    { name: 'Queue - Stats', method: 'GET', path: '/api/v1/queue/stats' },
    { name: 'Queue - Jobs', method: 'GET', path: '/api/v1/queue/jobs' },
    { name: 'Strategies - List', method: 'GET', path: '/api/v1/strategies' },
    { name: 'Data - Symbols', method: 'GET', path: '/api/v1/data/symbols?limit=5' },
    { name: 'Data - Overview', method: 'GET', path: '/api/v1/data/overview' },
    { name: 'Data - Indexes', method: 'GET', path: '/api/v1/data/indexes' },
    { name: 'System - Sync Status', method: 'GET', path: '/api/v1/system/sync-status' },
    { name: 'Portfolio - Positions', method: 'GET', path: '/api/v1/portfolio/positions' },
    { name: 'Trade - Orders', method: 'GET', path: '/api/v1/trade/orders' },
    { name: 'Analytics - Dashboard', method: 'GET', path: '/api/v1/analytics/dashboard' },
    { name: 'Analytics - Risk Metrics', method: 'GET', path: '/api/v1/analytics/risk-metrics' },
    { name: 'Alerts - Rules', method: 'GET', path: '/api/v1/alerts/rules' },
    { name: 'Alerts - History', method: 'GET', path: '/api/v1/alerts/history' },
    { name: 'Alerts - Channels', method: 'GET', path: '/api/v1/alerts/channels' },
    { name: 'Reports - List', method: 'GET', path: '/api/v1/reports' },
    { name: 'AI - Conversations', method: 'GET', path: '/api/v1/ai/conversations' },
    { name: 'AI - Models', method: 'GET', path: '/api/v1/ai/models' },
    { name: 'Factors - List', method: 'GET', path: '/api/v1/factors' },
    { name: 'Templates - Marketplace', method: 'GET', path: '/api/v1/templates/marketplace' },
    { name: 'Templates - Mine', method: 'GET', path: '/api/v1/templates/mine' },
    { name: 'Teams - Workspaces', method: 'GET', path: '/api/v1/teams/workspaces' },
    { name: 'Teams - Shared With Me', method: 'GET', path: '/api/v1/teams/shares/received' },
    { name: 'Auth - API Keys', method: 'GET', path: '/api/v1/auth/api-keys' },
    { name: 'Auth - Sessions', method: 'GET', path: '/api/v1/auth/sessions' },
    { name: 'Settings - Data Sources', method: 'GET', path: '/api/v1/settings/datasource-items' },
    { name: 'Strategies - Builtin', method: 'GET', path: '/api/v1/strategies/builtin/list' },
    // VNPy gateway & auto-strategy endpoints
    { name: 'Trade - Gateways', method: 'GET', path: '/api/v1/trade/gateways' },
    { name: 'Trade - Gateway Positions', method: 'GET', path: '/api/v1/trade/gateway/positions' },
    { name: 'Trade - Gateway Account', method: 'GET', path: '/api/v1/trade/gateway/account' },
    { name: 'Trade - Auto Strategy Status', method: 'GET', path: '/api/v1/trade/auto-strategy/status' },
    // Qlib AI model endpoints
    { name: 'Qlib - Status', method: 'GET', path: '/api/v1/ai/qlib/status' },
    { name: 'Qlib - Supported Models', method: 'GET', path: '/api/v1/ai/qlib/supported-models' },
    { name: 'Qlib - Supported Datasets', method: 'GET', path: '/api/v1/ai/qlib/supported-datasets' },
    { name: 'Qlib - Training Runs', method: 'GET', path: '/api/v1/ai/qlib/training-runs' },
    // Qlib factor endpoints
    { name: 'Factors - Qlib Sets', method: 'GET', path: '/api/v1/factors/qlib/factor-sets' },
  ]

  for (const endpoint of endpoints) {
    test(`${endpoint.name} (${endpoint.method} ${endpoint.path}) should respond`, async ({ request }) => {
      const res = await request.get(`${env.apiURL}${endpoint.path}`, {
        headers: { Authorization: `Bearer ${authToken}` },
      })
      // Expect 200 or other non-error status (some endpoints may return 404 for empty data)
      expect(res.status()).toBeLessThan(500)
    })
  }

  test('Tushare datasource catalog should expose metadata and sync support flags', async ({ request }) => {
    const res = await request.get(`${env.apiURL}/api/v1/settings/datasource-items?source=tushare`, {
      headers: { Authorization: `Bearer ${authToken}` },
    })

    expect(res.ok()).toBeTruthy()
    const payload = await res.json()
    const items = payload.data ?? []

    expect(items.length).toBeGreaterThan(100)

    const top10Holders = items.find((item: { item_key: string }) => item.item_key === 'top10_holders')
    expect(top10Holders).toBeTruthy()
    expect(top10Holders.sync_supported).toBe(true)

    const tradeCalendar = items.find((item: { item_key: string }) => item.item_key === 'trade_cal')
    expect(tradeCalendar).toBeTruthy()
    expect(tradeCalendar.sync_supported).toBe(false)
    expect(tradeCalendar.description).toBeTruthy()
  })

  test('Tushare permission batch list should exclude paid-only tiers', async ({ request }) => {
    const res = await request.get(`${env.apiURL}/api/v1/settings/datasource-items/permissions?source=tushare`, {
      headers: { Authorization: `Bearer ${authToken}` },
    })

    expect(res.ok()).toBeTruthy()
    const payload = await res.json()
    const permissions = payload.data ?? []

    expect(permissions.length).toBeGreaterThan(0)
    expect(permissions).not.toContain('paid')
  })

  test('Unsupported Tushare interfaces should reject enable attempts', async ({ request }) => {
    const res = await request.put(`${env.apiURL}/api/v1/settings/datasource-items/trade_cal?source=tushare`, {
      headers: {
        Authorization: `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
      data: { enabled: true },
    })

    expect(res.status()).toBe(400)
  })
})
