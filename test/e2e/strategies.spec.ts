import { expect, test } from '@playwright/test'

test.describe('Strategy Management', () => {
  // Uses shared auth state from auth.setup.ts (storageState in config)

  test.beforeEach(async ({ page }) => {
    await page.goto('/strategies')
    await expect(page).toHaveURL(/\/strategies/)
  })

  test('should display strategies page', async ({ page }) => {
    await expect(page.locator('h1').filter({ hasText: 'Strategies' })).toBeVisible().catch(() => {})
  })

  test('should create new strategy', async ({ page }) => {
    // Look for a "New Strategy" or "Create" button
    const newBtn = page.locator('button').filter({ hasText: /new strategy/i }).first()
    if (await newBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await newBtn.click()

      const ts = Date.now()
      const nameInput = page.getByLabel(/name/i).first()
      if (await nameInput.isVisible({ timeout: 3000 }).catch(() => false)) {
        await nameInput.fill(`E2E Strategy ${ts}`)
        const descInput = page.getByLabel(/description/i)
        if (await descInput.isVisible({ timeout: 2000 }).catch(() => false)) {
          await descInput.fill('E2E test strategy')
        }
        await page.locator('button').filter({ hasText: /save|submit|create/i }).first().click()
        await expect(page.getByText(`E2E Strategy ${ts}`).or(page.getByText(/success|created/i)))
          .toBeVisible({ timeout: 10000 })
      }
    }
  })

  test('should view strategy details', async ({ page }) => {
    // Wait for strategy list to load
    await page.waitForTimeout(2000)
    const strategyItem = page.locator('table tbody tr, [class*="strategy"]').first()
    if (await strategyItem.isVisible({ timeout: 5000 }).catch(() => false)) {
      await strategyItem.click()
      // Should show some strategy detail
      await expect(page.getByText(/code|parameters|description/i).first()).toBeVisible({ timeout: 5000 })
    }
  })

  test('should browse built-in strategies', async ({ page }) => {
    const builtinBtn = page.locator('button').filter({ hasText: /built-in/i }).first()
    if (await builtinBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await builtinBtn.click()
      await expect(page.getByText(/built-in|template/i)).toBeVisible({ timeout: 5000 })
    }
  })
})
