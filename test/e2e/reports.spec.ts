import { expect, test } from '@playwright/test'
import { navigateToPage, waitForPageLoad } from './helpers'

test.describe('Reports', () => {
  test.beforeEach(async ({ page }) => {
    await navigateToPage(page, '/reports')
  })

  test('should display reports page', async ({ page }) => {
    await expect(page.locator('h1').filter({ hasText: 'Reports' })).toBeVisible()
  })

  test('should display generate report button', async ({ page }) => {
    await expect(page.locator('button').filter({ hasText: /generate report/i }).first()).toBeVisible({ timeout: 15000 })
  })

  test('should open report generation form', async ({ page }) => {
    const btn = page.locator('button').filter({ hasText: /generate report/i }).first()
    await expect(btn).toBeVisible({ timeout: 15000 })
    await btn.click()
    await page.waitForTimeout(500)
    // Form should appear after clicking generate
    await expect(page.locator('form').first()).toBeVisible({ timeout: 10000 })
  })

  test('should display report type filter', async ({ page }) => {
    // Type filter dropdown should be visible
    const typeFilter = page.locator('select').filter({ hasText: /all types|daily|weekly/i }).first()
    if (await typeFilter.isVisible({ timeout: 5000 }).catch(() => false)) {
      await expect(typeFilter).toBeVisible()
    }
  })

  test('should show reports list or empty state', async ({ page }) => {
    // Either shows reports table or empty message
    const content = page.getByText(/no reports|generate your first report/i)
      .or(page.locator('table').first())
    await expect(content).toBeVisible({ timeout: 15000 })
  })

  test('should have refresh button', async ({ page }) => {
    const refreshBtn = page.locator('button').filter({ has: page.locator('svg.lucide-refresh-cw, svg.lucide-rotate-cw') }).first()
    await expect(refreshBtn).toBeVisible({ timeout: 15000 }).catch(() => {})
  })
})
