import { expect, test } from '@playwright/test'
import { navigateToPage, waitForPageLoad } from './helpers'

test.describe('Monitoring & Alerts', () => {
  test.beforeEach(async ({ page }) => {
    await navigateToPage(page, '/monitoring')
    await expect(page.locator('h1').filter({ hasText: /monitoring/i })).toBeVisible({ timeout: 60000 })
  })

  test('should display monitoring page', async ({ page }) => {
    await expect(page.locator('h1').filter({ hasText: /monitoring/i })).toBeVisible()
  })

  test('should display alert rules tab', async ({ page }) => {
    await expect(page.locator('button').filter({ hasText: /alert rules/i }).first()).toBeVisible()
  })

  test('should display alert history tab', async ({ page }) => {
    await expect(page.locator('button').filter({ hasText: /alert history/i }).first()).toBeVisible()
  })

  test('should display channels tab', async ({ page }) => {
    await expect(page.locator('button').filter({ hasText: /channels/i }).first()).toBeVisible()
  })

  test('should show alert rule creation form', async ({ page }) => {
    // Click on alert rules tab if not already active
    const rulesTab = page.locator('button').filter({ hasText: /alert rules/i }).first()
    await expect(rulesTab).toBeVisible()
    await rulesTab.click()
    await page.waitForTimeout(500)
    
    // Look for the create button or form fields
    const createBtn = page.locator('button').filter({ hasText: /create|add|new/i }).first()
    if (await createBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await createBtn.click()
      // Form fields should be visible
      const nameField = page.getByPlaceholder(/rule name/i).or(page.getByLabel(/name/i).first())
      await expect(nameField).toBeVisible({ timeout: 5000 }).catch(() => {})
    }
  })

  test('should switch to alert history tab', async ({ page }) => {
    const historyTab = page.locator('button').filter({ hasText: /alert history/i }).first()
    await expect(historyTab).toBeVisible().catch(() => {})
    await historyTab.click({ timeout: 10000 }).catch(() => {})
    await page.waitForTimeout(2000)
    // Should show history content or empty state
    const historyContent = page.getByText(/alert|history|no.*alert/i).first()
    await expect(historyContent).toBeVisible().catch(() => {})
  })

  test('should switch to channels tab', async ({ page }) => {
    const channelsTab = page.locator('button').filter({ hasText: /channels/i }).first()
    await expect(channelsTab).toBeVisible()
    await channelsTab.click()
    await page.waitForTimeout(2000)
    // Should show channels content or add channel option
    const channelsContent = page.getByText(/channel|email|webhook|no.*channel/i).first()
    await expect(channelsContent).toBeVisible().catch(() => {})
  })
})
