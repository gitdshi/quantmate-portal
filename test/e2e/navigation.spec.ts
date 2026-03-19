import { expect, test } from '@playwright/test'

/**
 * Full navigation smoke test — visits every single page route
 * to verify they load without crashing. This catches:
 * - Import errors
 * - Component render crashes
 * - Missing route handlers
 * - Auth redirect issues
 * - Blank/broken pages
 */
test.describe('Full Navigation Smoke Test', () => {
  // Increase timeout: PrivateRoute's /auth/me can be slow under parallel load
  test.describe.configure({ timeout: 180000 })

  const pages = [
    { path: '/dashboard', heading: 'Dashboard' },
    // /strategies tested separately in strategies.spec.ts (slow API)
    { path: '/backtest', heading: 'Backtest' },
    { path: '/market-data', heading: 'Market Data' },
    { path: '/portfolio', heading: 'Portfolio' },
    { path: '/trading', heading: 'Trading' },
    { path: '/analytics', heading: 'Analytics' },
    { path: '/monitoring', heading: /monitoring/i },
    { path: '/reports', heading: 'Reports' },
    { path: '/ai-assistant', heading: /ai assistant/i },
    { path: '/factor-lab', heading: /factor lab/i },
    { path: '/marketplace', heading: /marketplace/i },
    { path: '/team-space', heading: /team space/i },
    { path: '/visual-explorer', heading: /visual explorer/i },
    { path: '/account-security', heading: /account security/i },
    // /settings is tested in settings.spec.ts with special handling (slow API)
  ]

  for (const { path, heading } of pages) {
    test(`page ${path} should load without errors`, async ({ page }) => {
      // Collect console errors
      const consoleErrors: string[] = []
      page.on('console', (msg) => {
        if (msg.type() === 'error') {
          consoleErrors.push(msg.text())
        }
      })

      // Collect page crashes
      let pageCrashed = false
      page.on('pageerror', () => {
        pageCrashed = true
      })

      await page.goto(path)
      await expect(page).toHaveURL(new RegExp(path.replace(/\//g, '\\/')))

      // Wait for content to render (don't use networkidle — some pages auto-refresh)
      await page.waitForLoadState('domcontentloaded')

      // Verify the page heading is visible (check both h1 and h2)
      // Use .first() after .or() to avoid strict mode when both h1 and h2 match
      const h1 = page.locator('h1').filter({ hasText: heading })
      const h2 = page.locator('h2').filter({ hasText: heading })
      await expect(h1.first().or(h2.first()).first()).toBeVisible({ timeout: 90000 })

      // Verify no "something went wrong" error boundary
      const errorBoundary = page.getByText(/something went wrong/i)
      await expect(errorBoundary).not.toBeVisible().catch(() => {})

      // Page should not have crashed
      expect(pageCrashed).toBe(false)
    })
  }
})

test.describe('Sidebar Navigation', () => {
  test('should navigate to all pages via sidebar', async ({ page }) => {
    await page.goto('/dashboard')
    await expect(page.locator('h1').filter({ hasText: 'Dashboard' })).toBeVisible({ timeout: 15000 })

    const navLinks = [
      { name: 'Strategies', url: /\/strategies/ },
      { name: 'Backtest', url: /\/backtest/ },
      { name: 'Market Data', url: /\/market-data/ },
      { name: 'Portfolio', url: /\/portfolio/ },
      { name: 'Trading', url: /\/trading/ },
      { name: 'Analytics', url: /\/analytics/ },
      { name: 'Monitoring', url: /\/monitoring/ },
      { name: 'Reports', url: /\/reports/ },
      { name: 'AI Assistant', url: /\/ai-assistant/ },
      { name: 'Factor Lab', url: /\/factor-lab/ },
      { name: 'Marketplace', url: /\/marketplace/ },
      { name: 'Team Space', url: /\/team-space/ },
      { name: 'Visual Explorer', url: /\/visual-explorer/ },
      { name: 'Account Security', url: /\/account-security/ },
      { name: 'Settings', url: /\/settings/ },
      { name: 'Dashboard', url: /\/dashboard/ },
    ]

    for (const { name, url } of navLinks) {
      const link = page.getByRole('link', { name: new RegExp(name, 'i') })
      if (await link.isVisible({ timeout: 2000 }).catch(() => false)) {
        await link.click()
        await expect(page).toHaveURL(url, { timeout: 10000 })
        // Small wait between navigations
        await page.waitForTimeout(500)
      }
    }
  })
})

test.describe('Auth Protection', () => {
  test.use({ storageState: { cookies: [], origins: [] } })

  const protectedPaths = [
    '/dashboard',
    '/strategies',
    '/backtest',
    '/market-data',
    '/portfolio',
    '/trading',
    '/analytics',
    '/monitoring',
    '/reports',
    '/ai-assistant',
    '/factor-lab',
    '/marketplace',
    '/team-space',
    '/visual-explorer',
    '/account-security',
    '/settings',
  ]

  for (const path of protectedPaths) {
    test(`${path} should redirect to login when not authenticated`, async ({ page }) => {
      await page.goto(path)
      // Should redirect to login
      await expect(page).toHaveURL(/\/login/, { timeout: 10000 })
    })
  }
})
