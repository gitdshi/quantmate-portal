import type { APIRequestContext, Page } from '@playwright/test'
import { env } from './env'

export const mockE2EUser = {
  username: 'admin',
  email: 'admin@quantmate.local',
  id: 1,
  is_active: true,
  created_at: '2026-03-12T00:35:38',
  role: 'admin',
  primary_role: 'admin',
  permissions: [
    'account.manage',
    'account.read',
    'account.write',
    'alerts.manage',
    'alerts.read',
    'alerts.write',
    'backtests.manage',
    'backtests.read',
    'backtests.write',
    'data.manage',
    'data.read',
    'data.write',
    'portfolios.manage',
    'portfolios.read',
    'portfolios.write',
    'reports.manage',
    'reports.read',
    'reports.write',
    'strategies.manage',
    'strategies.read',
    'strategies.write',
    'system.manage',
    'system.read',
    'system.write',
    'teams.manage',
    'teams.read',
    'teams.write',
    'templates.manage',
    'templates.read',
    'templates.write',
    'trading.manage',
    'trading.read',
    'trading.write',
  ],
}

export async function isQuantMateApi(request: APIRequestContext) {
  try {
    const response = await request.get(`${env.apiURL}/openapi.json`)
    if (!response.ok()) {
      return false
    }

    const payload = await response.json()
    const title = String(payload?.info?.title ?? '').toLowerCase()
    const description = String(payload?.info?.description ?? '').toLowerCase()
    return title.includes('quantmate') || description.includes('quantmate')
  } catch {
    return false
  }
}

export async function seedMockAuthState(page: Page, user = mockE2EUser) {
  await page.goto('/login')
  await page.evaluate(({ currentUser }) => {
    const accessToken = 'playwright-mock-access-token'
    const refreshToken = 'playwright-mock-refresh-token'

    localStorage.setItem('access_token', accessToken)
    localStorage.setItem('refresh_token', refreshToken)
    localStorage.setItem('auth-storage', JSON.stringify({
      state: {
        user: currentUser,
        accessToken,
        refreshToken,
        isAuthenticated: true,
      },
      version: 0,
    }))
  }, { currentUser: user })
}

export async function installMockAuthMe(page: Page, user = mockE2EUser) {
  await page.route('**/api/v1/auth/me', async (route) => {
    const authHeader = route.request().headers().authorization || ''
    if (!authHeader.includes('playwright-mock-access-token')) {
      await route.fallback()
      return
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(user),
    })
  })
}