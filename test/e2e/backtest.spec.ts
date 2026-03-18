import { expect, test } from '@playwright/test'

test.describe('Backtest Workflow', () => {
  // Uses shared auth state from auth.setup.ts (storageState in config)

  test.beforeEach(async ({ page }) => {
    await page.goto('/backtest')
    await expect(page).toHaveURL(/\/backtest/)
  })

  test('should display backtest page', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Backtest', exact: true })).toBeVisible()
  })

  test('should have action buttons', async ({ page }) => {
    // The page has "Bulk Test" and/or "New Backtest" buttons
    const newBtn = page.getByRole('button', { name: /new backtest|bulk test/i })
    await expect(newBtn.first()).toBeVisible({ timeout: 5000 })
  })

  test('should open backtest form', async ({ page }) => {
    const newBtn = page.getByRole('button', { name: /new backtest/i })
    if (await newBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await newBtn.click()
      // Should show form elements like strategy selector, date fields, etc.
      await expect(
        page.getByLabel(/strategy/i).or(page.getByText(/strategy|symbol|date/i))
      ).toBeVisible({ timeout: 5000 })
    }
  })

  test('should display job list section', async ({ page }) => {
    // Check for jobs section — the page shows backtest jobs/history
    await expect(
      page.getByRole('heading', { name: /backtest jobs/i })
    ).toBeVisible({ timeout: 5000 })
  })

  test('should display backtest results when available', async ({ page }) => {
    await page.waitForTimeout(2000)
    const jobItem = page.locator('[data-testid="job-item"], .job-card, table tbody tr').first()
    if (await jobItem.isVisible({ timeout: 3000 }).catch(() => false)) {
      await jobItem.click()
      // Results might show performance metrics
      await expect(
        page.getByText(/return|sharpe|drawdown|trades/i)
      ).toBeVisible({ timeout: 5000 })
    }
  })
})
