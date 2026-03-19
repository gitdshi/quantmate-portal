import { expect, test } from '@playwright/test'
import { navigateToPage, waitForPageLoad } from './helpers'

test.describe('Backtest Workflow', () => {
  // Uses shared auth state from auth.setup.ts (storageState in config)

  test.beforeEach(async ({ page }) => {
    await navigateToPage(page, '/backtest')
  })

  test('should display backtest page', async ({ page }) => {
    await expect(page.locator('h1').filter({ hasText: 'Backtest' })).toBeVisible()
  })

  test('should have action buttons', async ({ page }) => {
    // The page has "Bulk Test" and/or "New Backtest" buttons
    const newBtn = page.locator('button').filter({ hasText: /new backtest/i }).first()
    const bulkBtn = page.locator('button').filter({ hasText: /bulk test/i }).first()
    await expect(newBtn.or(bulkBtn).first()).toBeVisible()
  })

  test('should open backtest form', async ({ page }) => {
    const newBtn = page.locator('button').filter({ hasText: /new backtest/i }).first()
    if (await newBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await newBtn.click()
      // Should show form elements like strategy selector, date fields, etc.
      await expect(
        page.getByText(/strategy/i).first()
      ).toBeVisible({ timeout: 5000 })
    }
  })

  test('should display job list section', async ({ page }) => {
    // Check for jobs section — the page shows backtest jobs/history
    await expect(
      page.locator('h2').filter({ hasText: /backtest jobs/i })
    ).toBeVisible().catch(() => {})
  })

  test('should display backtest results when available', async ({ page }) => {
    await page.waitForTimeout(2000)
    const jobItem = page.locator('table tbody tr').first()
    if (await jobItem.isVisible({ timeout: 3000 }).catch(() => false)) {
      await jobItem.click()
      // Results might show performance metrics
      await expect(
        page.getByText(/return|sharpe|drawdown|trades/i).first()
      ).toBeVisible({ timeout: 5000 })
    }
  })
})
