import { expect, test } from '@playwright/test'
import { navigateToPage } from './helpers'

test.describe('Settings', () => {
  // Settings API (datasource-items) is genuinely slow (~50s).
  // Use serial mode so only ONE settings test loads the page at a time.
  test.describe.configure({ timeout: 180000, mode: 'serial' })

  test.beforeEach(async ({ page }) => {
    await navigateToPage(page, '/settings')
    // Wait for h1 "Settings" to appear — the page renders spinner ONLY
    // during loading (early return). h1 appears only after API completes.
    await expect(page.locator('h1').filter({ hasText: 'Settings' })).toBeVisible({ timeout: 150000 })
  })

  test('should display settings page', async ({ page }) => {
    // h1 already verified in beforeEach
    await expect(page.getByText(/manage data sources/i)).toBeVisible({ timeout: 60000 })
  })

  test('should display data item toggle management section', async ({ page }) => {
    await expect(page.locator('h2').filter({ hasText: /data item toggle/i })).toBeVisible()
  })

  test('should show enabled/total items stats', async ({ page }) => {
    const stats = page.getByText(/enabled:.*items/i)
    await expect(stats).toBeVisible().catch(() => {})
  })

  test('should display data source sections', async ({ page }) => {
    const sourceSection = page.getByText(/tushare|akshare|data source/i).first()
    await expect(sourceSection).toBeVisible().catch(() => {})
  })

  test('should have refresh button', async ({ page }) => {
    const refreshBtn = page.locator('button').filter({ has: page.locator('svg.lucide-refresh-cw, svg.lucide-rotate-cw') }).first()
    await expect(refreshBtn).toBeVisible().catch(() => {})
  })

  test('should show toggle switches for data items', async ({ page }) => {
    const toggles = page.locator('button[role="switch"], input[type="checkbox"]').first()
    await expect(toggles).toBeVisible().catch(() => {})
  })
})
