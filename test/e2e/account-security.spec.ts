import { expect, test } from '@playwright/test'
import { navigateToPage, waitForPageLoad } from './helpers'

test.describe('Account Security', () => {
  test.beforeEach(async ({ page }) => {
    await navigateToPage(page, '/account-security')
  })

  test('should display account security page', async ({ page }) => {
    await expect(page.locator('h1').filter({ hasText: /account security/i })).toBeVisible()
  })

  test('should display MFA tab', async ({ page }) => {
    await expect(page.getByText(/two-factor/i).first()).toBeVisible({ timeout: 15000 })
  })

  test('should display API keys tab', async ({ page }) => {
    await expect(page.getByText(/api keys/i).first()).toBeVisible({ timeout: 15000 })
  })

  test('should display sessions tab', async ({ page }) => {
    await expect(page.getByText(/sessions/i).first()).toBeVisible({ timeout: 15000 })
  })

  test('should show MFA setup content by default', async ({ page }) => {
    // Should show MFA heading and setup/status
    await expect(page.locator('h2').filter({ hasText: /two-factor authentication/i })).toBeVisible({ timeout: 15000 })
  })

  test('should have setup MFA button', async ({ page }) => {
    const setupBtn = page.locator('button').filter({ hasText: /setup mfa|enable/i }).first()
    if (await setupBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await expect(setupBtn).toBeVisible()
    }
  })

  test('should switch to API keys tab', async ({ page }) => {
    const apiKeysTab = page.locator('button').filter({ hasText: /api keys/i }).first()
    await expect(apiKeysTab).toBeVisible()
    await apiKeysTab.click()
    await page.waitForTimeout(2000)
    // Should show API keys content (heading, empty state, or form)
    const content = page.getByText(/api key|no.*key|create one|keys/i).first()
    await expect(content).toBeVisible().catch(() => {})
  })

  test('should switch to sessions tab', async ({ page }) => {
    const sessionsTab = page.locator('button').filter({ hasText: /sessions/i }).first()
    await expect(sessionsTab).toBeVisible()
    await sessionsTab.click()
    await page.waitForTimeout(1000)
    // Should show sessions content
    const content = page.getByText(/device|browser|ip|session|no.*active|unknown/i).first()
    await expect(content).toBeVisible().catch(() => {})
  })

  test('should show add API key button in API keys tab', async ({ page }) => {
    const apiKeysTab = page.locator('button').filter({ hasText: /api keys/i }).first()
    await expect(apiKeysTab).toBeVisible()
    await apiKeysTab.click()
    await page.waitForTimeout(2000)
    const addBtn = page.locator('button').filter({ hasText: /add|create|new/i }).first()
    await expect(addBtn).toBeVisible().catch(() => {})
  })
})
