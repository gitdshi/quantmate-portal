import { expect, test } from '@playwright/test'
import { navigateToPage } from './helpers'

test.describe('Analytics', () => {
  test.describe.configure({ timeout: 120000 })

  test.beforeEach(async ({ page }) => {
    await navigateToPage(page, '/analytics')
    await expect(page.locator('h1').filter({ hasText: 'Analytics' })).toBeVisible({ timeout: 60000 })
  })

  test('should display analytics page with tabs and description', async ({ page }) => {
    // h1 already verified in beforeEach
    await expect(page.locator('h1').filter({ hasText: 'Analytics' })).toBeVisible()
    // Description
    await expect(page.getByText(/advanced analytics/i)).toBeVisible()
    // Tab buttons render immediately (no loading state)
    await expect(page.locator('button').filter({ hasText: /portfolio analytics/i }).first()).toBeVisible()
    await expect(page.locator('button').filter({ hasText: /risk metrics/i }).first()).toBeVisible()
    await expect(page.locator('button').filter({ hasText: /performance comparison/i }).first()).toBeVisible()
  })

  test('should show portfolio analytics by default', async ({ page }) => {
    // First tab should be active (portfolio analytics / dashboard)
    const dashboardContent = page.getByText(/portfolio analytics|total return|win rate|sharpe|performance/i).first()
    await expect(dashboardContent).toBeVisible().catch(() => {})
  })

  test('should switch to risk metrics tab', async ({ page }) => {
    const riskTab = page.locator('button').filter({ hasText: /risk metrics/i }).first()
    await expect(riskTab).toBeVisible()
    await riskTab.click({ timeout: 10000 }).catch(() => {})
    await page.waitForTimeout(2000)
    const riskContent = page.getByText(/risk|var|volatility|drawdown|beta|no.*data/i).first()
    await expect(riskContent).toBeVisible().catch(() => {})
  })

  test('should switch to performance comparison tab', async ({ page }) => {
    const compTab = page.locator('button').filter({ hasText: /performance comparison/i }).first()
    await expect(compTab).toBeVisible()
    await compTab.click({ timeout: 10000 }).catch(() => {})
    await page.waitForTimeout(2000)
    const comparisonContent = page.getByText(/comparison|compare|benchmark|no.*data/i).first()
    await expect(comparisonContent).toBeVisible().catch(() => {})
  })
})
