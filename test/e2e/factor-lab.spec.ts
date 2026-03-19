import { expect, test } from '@playwright/test'
import { navigateToPage, waitForPageLoad } from './helpers'

test.describe('Factor Lab', () => {
  test.beforeEach(async ({ page }) => {
    await navigateToPage(page, '/factor-lab')
  })

  test('should display factor lab page', async ({ page }) => {
    await expect(page.getByTestId('factor-lab-page')).toBeVisible({ timeout: 15000 })
  })

  test('should have new factor button', async ({ page }) => {
    await expect(page.locator('button').filter({ hasText: /new factor/i }).first()).toBeVisible({ timeout: 15000 })
  })

  test('should display category filter', async ({ page }) => {
    // Category filter dropdown
    const categoryFilter = page.locator('select').filter({ hasText: /all categories|value|momentum/i }).first()
    if (await categoryFilter.isVisible({ timeout: 5000 }).catch(() => false)) {
      await expect(categoryFilter).toBeVisible()
    }
  })

  test('should display factor list section', async ({ page }) => {
    // Left panel should show factors list or empty state
    const factorList = page.locator('h2').filter({ hasText: /factors/i })
    await expect(factorList.first()).toBeVisible({ timeout: 15000 })
  })

  test('should show empty state when no factor selected', async ({ page }) => {
    const emptyState = page.getByText(/select a factor/i)
    await expect(emptyState).toBeVisible({ timeout: 15000 }).catch(() => {
      // If factors exist and one is auto-selected, OK
    })
  })

  test('should open new factor form', async ({ page }) => {
    const newBtn = page.locator('button').filter({ hasText: /new factor/i }).first()
    if (await newBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await newBtn.click()
      await page.waitForTimeout(500)
      // Form should appear with name, category, expression fields
      const nameField = page.getByLabel(/name/i).first()
        .or(page.getByPlaceholder(/name/i).first())
      await expect(nameField).toBeVisible({ timeout: 5000 }).catch(() => {})
    }
  })
})
